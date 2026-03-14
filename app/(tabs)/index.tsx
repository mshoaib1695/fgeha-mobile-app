import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  Image,
  BackHandler,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiGet, unwrapList } from "../../lib/api";
import { useAppAlert } from "../../lib/alert-context";
import { iconForRequestType } from "../../lib/request-type-icon";
import { colors, gradientColors, tabScreenPaddingBottom, typography } from "../../lib/theme";
import { API_URL } from "../../lib/api";

interface RequestType {
  id: number;
  name: string;
  slug: string;
  displayOrder: number;
  iconUrl?: string | null;
  underConstruction?: boolean;
  underConstructionMessage?: string | null;
}

interface NewsItem {
  id: number;
  title: string | null;
  content: string | null;
  imageUrl: string | null;
  displayOrder: number;
  openDetail?: boolean;
}

function subtitleForRequestType(slug: string, name: string): string {
  const s = (slug || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (s.includes("garbage") || n.includes("garbage")) return "Waste Issues";
  if (s.includes("water") || n.includes("water")) return "Water Supply Issues";
  if (s.includes("sewer") || n.includes("sewer") || s.includes("drainage") || n.includes("drainage")) return "Drainage Issues";
  if (s.includes("electric") || n.includes("electric") || s.includes("street_light") || n.includes("street light")) return "Power Issues";
  if (s.includes("road") || n.includes("road")) return "Road Repair";
  if (s.includes("other") || n.includes("other")) return "Other Civic Issues";
  return "Report an issue";
}

function resolveIconUri(iconUrl: string | null | undefined): string | null {
  if (!iconUrl?.trim()) return null;
  const u = iconUrl.trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const base = API_URL.replace(/\/$/, "");
  return u.startsWith("/") ? `${base}${u}` : `${base}/${u}`;
}

function resolveNewsImageUri(url: string | null | undefined): string | null {
  return resolveIconUri(url);
}

const CAROUSEL_AUTO_SLIDE_INTERVAL = 4000;

const CARD_GAP = 12;
const ICON_SIZE = 48;
const ICON_WRAP_SIZE = 60;

const cardShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: { elevation: 4 },
});

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const { showError } = useAppAlert();
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsSectionTitle, setNewsSectionTitle] = useState("Latest News");
  const [showNewsSectionHeading, setShowNewsSectionHeading] = useState(true);
  const [showNewsCarouselOverlay, setShowNewsCarouselOverlay] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const carouselRef = useRef<ScrollView>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const loadRequestTypes = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setFetchError(null);
    try {
      const raw = await apiGet<unknown>("/request-types");
      const list = unwrapList<RequestType>(raw);
      const sorted = list.sort(
        (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
      );
      setRequestTypes(sorted);
    } catch (e) {
      const msg = (e as Error).message ?? "We couldn't load services. Please try again.";
      setFetchError(msg);
      showError(msg);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const loadNews = async () => {
    try {
      const raw = await apiGet<unknown>("/news");
      const list = Array.isArray(raw) ? raw : (raw as { data?: unknown[] })?.data ?? [];
      const sorted = (list as NewsItem[]).sort(
        (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
      );
      setNews(sorted);
    } catch {
      setNews([]);
    }
  };

  const loadAppSettings = async () => {
    try {
      const data = await apiGet<{ newsSectionTitle?: string; showNewsSectionHeading?: boolean; showNewsCarouselOverlay?: boolean }>("/app-settings");
      setNewsSectionTitle(data?.newsSectionTitle?.trim() || "Latest News");
      setShowNewsSectionHeading(data?.showNewsSectionHeading !== false);
      setShowNewsCarouselOverlay(data?.showNewsCarouselOverlay !== false);
    } catch {
      // keep default
    }
  };

  useEffect(() => {
    loadRequestTypes();
  }, []);

  useEffect(() => {
    loadNews();
  }, []);

  useEffect(() => {
    loadAppSettings();
  }, []);

  // Auto-slide news carousel
  useEffect(() => {
    if (news.length <= 1) return;
    const timer = setInterval(() => {
      setCarouselIndex((prev) => {
        const next = (prev + 1) % news.length;
        carouselRef.current?.scrollTo({
          x: next * winW,
          animated: true,
        });
        return next;
      });
    }, CAROUSEL_AUTO_SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [news.length, winW]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadRequestTypes(false), loadNews(), loadAppSettings()]);
    } finally {
      setRefreshing(false);
    }
  };

  const openNews = (item: NewsItem) => {
    router.push(`/news/${item.id}`);
  };

  // Handle device back button (Android hardware back button / iOS swipe back)
  // Only navigate back if there's navigation history (e.g., came from Options screen)
  useEffect(() => {
    const handleBack = () => {
      // Check if we can go back (i.e., there's navigation history)
      if (navigation.canGoBack()) {
        router.back();
        return true; // Prevent default back behavior
      }
      // If no history, allow default behavior (do nothing or exit app)
      return false;
    };

    // Handle Android back button
    if (Platform.OS === "android") {
      const handleBackPress = () => {
        return handleBack();
      };
      const backHandler = BackHandler.addEventListener("hardwareBackPress", handleBackPress);
      return () => {
        if (backHandler) {
          backHandler.remove();
        }
      };
    }

    // Handle iOS swipe back gesture
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      // Only prevent default if we can go back
      if (navigation.canGoBack()) {
        e.preventDefault();
        router.back();
      }
      // If no history, allow default behavior
    });

    return () => {
      unsubscribe();
    };
  }, [router, navigation]);

  const openRequestType = async (item: RequestType) => {
    if (item.underConstruction) {
      router.push({
        pathname: "/(tabs)/under-construction",
        params: { title: item.name, message: item.underConstructionMessage ?? "This service is under construction. We'll be back soon." },
      });
      return;
    }
    try {
      const options = await apiGet<unknown[]>(`/request-type-options/by-request-type/${item.id}`);
      if (Array.isArray(options) && options.length > 0) {
        router.push({ pathname: "/(tabs)/request-type-options/[id]", params: { id: String(item.id) } });
      } else {
        router.push(`/create-request/${item.id}`);
      }
    } catch {
      router.push(`/create-request/${item.id}`);
    }
  };

  const paddingBottom = tabScreenPaddingBottom(insets.bottom);

  if (loading) {
    return (
      <LinearGradient colors={[...gradientColors]} style={styles.gradient}>
        <View style={[styles.centered, { paddingBottom }]}>
          <ActivityIndicator size="large" color={colors.textOnGradient} />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </LinearGradient>
    );
  }

  if (requestTypes.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { paddingBottom }]}>
        <Text style={styles.emptyText}>
          {fetchError ? fetchError : "No services available at the moment."}
        </Text>
        {fetchError ? (
          <TouchableOpacity style={styles.retryButton} onPress={() => loadRequestTypes()} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  const paddingH = 18;
  const cardWidth = (winW - paddingH * 2 - CARD_GAP) / 2;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[...gradientColors]} style={styles.header}>
        <Text style={styles.headerTitle}>FGEHA - RSP</Text>
        <Text style={styles.headerSubtitle}>Select the type of issue you want to report.</Text>
      </LinearGradient>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom, paddingHorizontal: paddingH }]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.grid}>
          {requestTypes.map((item, index) => {
          const isLastItem = index === requestTypes.length - 1;
          const isOddCountLastItem = requestTypes.length % 2 === 1 && isLastItem;
          const fullWidth = isOddCountLastItem;
          const width = fullWidth ? winW - paddingH * 2 : cardWidth;
          const isFirstInRow = fullWidth || index % 2 === 0;
          const hasIcon = !!resolveIconUri(item.iconUrl);
          const iconName = iconForRequestType(item.slug, item.name);
          const subtext = subtitleForRequestType(item.slug, item.name);
          if (fullWidth) {
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.78}
                onPress={() => openRequestType(item)}
                style={[
                  styles.card,
                  styles.cardOthers,
                  cardShadow,
                  { width },
                ]}
              >
                <View style={styles.othersRow}>
                  <View style={styles.othersIconWrap}>
                    {hasIcon ? (
                      <Image
                        source={{ uri: resolveIconUri(item.iconUrl)! }}
                        style={styles.othersIcon}
                        resizeMode="contain"
                      />
                    ) : (
                      <Ionicons name={iconName} size={24} color={colors.primary} />
                    )}
                  </View>
                  <View style={styles.othersTextWrap}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={2}>{subtext}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.78}
              onPress={() => openRequestType(item)}
              style={[
                styles.card,
                cardShadow,
                {
                  width,
                  marginRight: isFirstInRow ? CARD_GAP : 0,
                },
              ]}
            >
              <View style={styles.iconWrap}>
                {hasIcon ? (
                  <Image
                    source={{ uri: resolveIconUri(item.iconUrl)! }}
                    style={styles.cardIcon}
                    resizeMode="contain"
                  />
                ) : (
                  <Ionicons name={iconName} size={30} color={colors.primary} />
                )}
              </View>
              <View style={styles.cardTextCenter}>
                <Text style={[styles.cardTitle, styles.cardTitleCenter]} numberOfLines={2}>{item.name}</Text>
                <Text style={[styles.cardSubtitle, styles.cardSubtitleCenter]} numberOfLines={2}>{subtext}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        </View>

        {news.length > 0 ? (
          <View style={styles.newsSection}>
            {showNewsSectionHeading ? (
              <Text style={styles.newsSectionTitle}>{newsSectionTitle}</Text>
            ) : null}
            <View style={[styles.carouselWrapper, { width: winW, height: winW / 2, marginHorizontal: -(paddingH) }]}>
              <ScrollView
                ref={carouselRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / winW);
                  setCarouselIndex(Math.min(idx, news.length - 1));
                }}
                style={styles.carousel}
                contentContainerStyle={styles.carouselContent}
              >
                {news.map((item) => {
                  const imageUri = resolveNewsImageUri(item.imageUrl);
                  const title = (item.title || "News").trim() || "News";
                  const isClickable = item.openDetail !== false && item.openDetail !== 0;
                  const slideContent = (
                    <>
                      {imageUri ? (
                        <View style={styles.carouselImageWrap}>
                          <Image
                            source={{ uri: imageUri }}
                            style={styles.carouselImage}
                            resizeMode="cover"
                          />
                          {showNewsCarouselOverlay ? (
                            <LinearGradient
                              colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.75)"]}
                              style={styles.carouselOverlay}
                            >
                              <Text style={styles.carouselTitle} numberOfLines={2}>{title}</Text>
                              <View style={styles.carouselReadMore}>
                                <Text style={styles.carouselReadMoreText}>Read more</Text>
                                <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.9)" />
                              </View>
                            </LinearGradient>
                          ) : null}
                        </View>
                      ) : (
                        <View style={styles.carouselPlaceholder}>
                          <Ionicons name="newspaper-outline" size={48} color={colors.primary} />
                          <Text style={styles.carouselPlaceholderTitle} numberOfLines={2}>{title}</Text>
                        </View>
                      )}
                    </>
                  );
                  return isClickable ? (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.92}
                      onPress={() => openNews(item)}
                      style={[styles.carouselSlide, { width: winW, height: winW / 2 }]}
                    >
                      {slideContent}
                    </TouchableOpacity>
                  ) : (
                    <View
                      key={item.id}
                      style={[styles.carouselSlide, { width: winW, height: winW / 2 }]}
                    >
                      {slideContent}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
            <View style={styles.carouselDots}>
              {news.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.carouselDot,
                    idx === carouselIndex && styles.carouselDotActive,
                  ]}
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  gradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: colors.textOnGradient,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: typography.fontFamily,
    color: "rgba(255,255,255,0.9)",
    marginTop: 0,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 12,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "rgba(255,255,255,0.9)",
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.textOnGradient,
    fontSize: 16,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 18,
    padding: 11,
    marginBottom: 12,
    minHeight: 108,
  },
  cardOthers: {
    minHeight: undefined,
    flexDirection: "row",
    alignItems: "center",
  },
  othersRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  othersIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  othersIcon: {
    width: 28,
    height: 28,
    backgroundColor: "#FFFFFF",
  },
  othersTextWrap: {
    flex: 1,
    justifyContent: "center",
  },
  iconWrap: {
    width: ICON_WRAP_SIZE,
    height: ICON_WRAP_SIZE,
    borderRadius: ICON_WRAP_SIZE / 2,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    alignSelf: "center",
  },
  cardIcon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    backgroundColor: "#FFFFFF",
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: 2,
    letterSpacing: 0.15,
  },
  cardSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 14,
    opacity: 0.9,
  },
  cardTextCenter: {
    alignItems: "center",
  },
  cardTitleCenter: {
    textAlign: "center",
  },
  cardSubtitleCenter: {
    textAlign: "center",
  },
  newsSection: {
    marginTop: 12,
    marginBottom: 20,
    alignSelf: "stretch",
  },
  newsSectionTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: 14,
    paddingHorizontal: 4,
    letterSpacing: 0.2,
  },
  carouselWrapper: {
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: colors.cardBg,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  carousel: {},
  carouselContent: {},
  carouselSlide: {
    overflow: "hidden",
    backgroundColor: colors.cardBg,
  },
  carouselImageWrap: {
    width: "100%",
    height: "100%",
    position: "relative",
    overflow: "hidden",
  },
  carouselImage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#e8e8e8",
  },
  carouselOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 60,
  },
  carouselTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: "#fff",
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  carouselReadMore: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },
  carouselReadMoreText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontFamily: typography.fontFamilySemiBold,
  },
  carouselPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#f0f4f8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  carouselPlaceholderTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilySemiBold,
    color: colors.textPrimary,
    marginTop: 12,
    textAlign: "center",
  },
  carouselDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 4,
  },
  carouselDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ccc",
  },
  carouselDotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
