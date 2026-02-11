import { useState, useEffect } from "react";
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
import { apiGet, unwrapList } from "../../lib/api";
import { useAppAlert } from "../../lib/alert-context";
import { colors, gradientColors, tabScreenPaddingBottom } from "../../lib/theme";
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

function emojiForRequestType(slug: string, name: string): string {
  const s = (slug || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (s.includes("garbage") || n.includes("garbage")) return "🗑️";
  if (s.includes("water") || n.includes("water")) return "💧";
  if (s.includes("sewer") || n.includes("sewer") || s.includes("drainage") || n.includes("drainage")) return "🚿";
  if (s.includes("electric") || n.includes("electric") || s.includes("street_light") || n.includes("street light")) return "⚡";
  if (s.includes("road") || n.includes("road")) return "🛣️";
  if (s.includes("other") || n.includes("other")) return "🏠";
  return "📋";
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

function isOthersType(slug: string, name: string): boolean {
  const s = (slug || "").toLowerCase();
  const n = (name || "").toLowerCase();
  return s.includes("other") || n.includes("other");
}

function resolveIconUri(iconUrl: string | null | undefined): string | null {
  if (!iconUrl?.trim()) return null;
  const u = iconUrl.trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const base = API_URL.replace(/\/$/, "");
  return u.startsWith("/") ? `${base}${u}` : `${base}/${u}`;
}

const CARD_GAP = 14;
const ICON_SIZE = 52;
const ICON_WRAP_SIZE = 64;

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

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
      const msg = (e as Error).message ?? "Could not load request types.";
      setFetchError(msg);
      showError(msg);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    loadRequestTypes();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadRequestTypes(false);
    } finally {
      setRefreshing(false);
    }
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
        params: { title: item.name, message: item.underConstructionMessage ?? "PAGE IS UNDER CONSTRUCTION 🚧" },
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
          {fetchError ? fetchError : "No request types available."}
        </Text>
        {fetchError ? (
          <TouchableOpacity style={styles.retryButton} onPress={() => loadRequestTypes()} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  const paddingH = 20;
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
          const emoji = emojiForRequestType(item.slug, item.name);
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
                      <Text style={styles.othersEmoji}>{emoji}</Text>
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
                  <Text style={styles.cardEmoji}>{emoji}</Text>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  gradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textOnGradient,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 20,
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
    borderRadius: 20,
    padding: 12,
    marginBottom: 16,
    minHeight: 120,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  othersIcon: {
    width: 30,
    height: 30,
    backgroundColor: "#FFFFFF",
  },
  othersEmoji: {
    fontSize: 24,
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
    marginBottom: 10,
    alignSelf: "center",
  },
  cardIcon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    backgroundColor: "#FFFFFF",
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 2,
    letterSpacing: 0.15,
  },
  cardSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
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
});
