import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Markdown from "react-native-markdown-display";
import { apiGet, API_URL } from "../../lib/api";
import { colors, gradientColors, typography } from "../../lib/theme";

interface NewsItem {
  id: number;
  title: string | null;
  content: string | null;
  imageUrl: string;
  displayOrder: number;
  createdAt?: string;
}

function resolveImageUri(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const base = API_URL.replace(/\/$/, "");
  return u.startsWith("/") ? `${base}${u}` : `${base}/${u}`;
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-PK", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

const markdownStyles = {
  body: {
    color: colors.textPrimary,
    fontSize: typography.bodySize,
    lineHeight: typography.bodyLineHeight,
    letterSpacing: 0.2,
  },
  heading1: {
    fontSize: 22,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginTop: 28,
    marginBottom: 12,
  },
  heading2: {
    fontSize: 18,
    fontFamily: typography.fontFamilySemiBold,
    color: colors.textPrimary,
    marginTop: 22,
    marginBottom: 10,
  },
  paragraph: { marginBottom: 18 },
  link: { color: colors.primary },
  strong: { fontFamily: typography.fontFamilyBold },
};

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailHeader, setDetailHeader] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiGet<NewsItem>(`/news/${id}`)
      .then((data) => {
        if (!cancelled) setNews(data);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message ?? "We couldn't load this article. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    apiGet<{ newsDetailHeader?: string }>("/app-settings")
      .then((data) => setDetailHeader(data?.newsDetailHeader?.trim() ?? ""))
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <LinearGradient colors={[...gradientColors]} style={styles.gradient}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.textOnGradient} />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </LinearGradient>
    );
  }

  if (error || !news) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[...gradientColors]}
          style={[styles.header, { paddingTop: insets.top + 20 }]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={24} color={colors.textOnGradient} />
          </TouchableOpacity>
          {detailHeader ? <Text style={styles.headerTitle}>{detailHeader}</Text> : <View style={styles.headerSpacer} />}
        </LinearGradient>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? "This article doesn't exist or has been removed."}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const imageUri = resolveImageUri(news.imageUrl);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...gradientColors]}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textOnGradient} />
        </TouchableOpacity>
        {detailHeader ? <Text style={styles.headerTitle} numberOfLines={1}>{detailHeader}</Text> : <View style={styles.headerSpacer} />}
      </LinearGradient>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {imageUri ? (
          <View style={styles.heroWrap}>
            <Image
              source={{ uri: imageUri }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </View>
        ) : null}
        <View style={styles.contentCard}>
          <View style={styles.content}>
            {news.title ? (
              <Text style={styles.title}>{news.title}</Text>
            ) : null}
            {formatDate(news.createdAt) ? (
              <Text style={styles.date}>{formatDate(news.createdAt)}</Text>
            ) : null}
          {news.content ? (
            <Markdown style={markdownStyles}>{news.content}</Markdown>
          ) : !news.title ? (
            <Text style={styles.body}>No content available.</Text>
          ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  gradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  loadingText: { marginTop: 12, fontSize: 15, color: "rgba(255,255,255,0.9)" },
  errorText: { fontSize: 16, color: colors.textSecondary, textAlign: "center", marginBottom: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  headerBack: { marginRight: 16 },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontFamily: typography.fontFamilyBold,
    color: colors.textOnGradient,
    letterSpacing: 0.3,
  },
  headerSpacer: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  heroWrap: {
    width: "100%",
    height: 240,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  contentCard: {
    marginHorizontal: 16,
    marginTop: -16,
    backgroundColor: "#fff",
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 26,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: 8,
    lineHeight: 34,
    letterSpacing: 0.2,
  },
  date: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 20,
    letterSpacing: 0.2,
  },
  body: {
    fontSize: typography.bodySize,
    lineHeight: typography.bodyLineHeight,
    color: colors.textPrimary,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginTop: 8,
  },
  backBtnText: {
    color: colors.primary,
    fontSize: typography.smallSize,
    fontFamily: typography.fontFamilySemiBold,
  },
});
