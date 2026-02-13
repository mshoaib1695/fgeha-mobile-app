import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  TouchableOpacity,
  Image,
  Linking,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiGet, API_URL } from "../../lib/api";
import { colors, gradientColors, tabScreenPaddingBottom, typography } from "../../lib/theme";

type RuleItem = { description?: string };
type Option = {
  id: number;
  label: string;
  optionType: string;
  imageUrl?: string | null;
  config: { content?: string; rules?: RuleItem[] } | null;
};

export default function ServiceRulesScreen() {
  const { optionId } = useLocalSearchParams<{ optionId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [option, setOption] = useState<Option | null>(null);
  const [loading, setLoading] = useState(true);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  useEffect(() => {
    if (!optionId) return;
    (async () => {
      setLoading(true);
      try {
        const o = await apiGet<Option>(`/request-type-options/${optionId}`);
        setOption(o ?? null);
      } catch {
        setOption(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [optionId]);

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

  if (!option) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[...gradientColors]} style={styles.header}>
          <Text style={styles.headerEmoji}>📋</Text>
          <Text style={styles.headerTitle}>Rules</Text>
          <Text style={styles.headerSubtitle}>No content available</Text>
        </LinearGradient>
        <View style={[styles.centered, styles.emptyWrap, { paddingBottom }]}>
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.emptyText}>Rules not found.</Text>
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const config = option.config ?? {};
  const rulesList = Array.isArray(config.rules) ? config.rules : [];
  const hasRules = rulesList.length > 0 && rulesList.some((r) => (r.description ?? "").trim());
  const fallbackContent = (config.content ?? "").trim();
  const filteredRules = hasRules ? rulesList.filter((r) => (r.description ?? "").trim()) : [];
  const resolvedOptionImageUrl = option.imageUrl?.trim()
    ? option.imageUrl.startsWith("http")
      ? option.imageUrl
      : `${API_URL.replace(/\/$/, "")}${option.imageUrl.startsWith("/") ? "" : "/"}${option.imageUrl}`
    : null;
  const handleOpenOrDownloadServiceImage = async () => {
    if (!resolvedOptionImageUrl) return;
    try {
      await Linking.openURL(resolvedOptionImageUrl);
    } catch {
      // Keep silent if url cannot be opened on device
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[...gradientColors]} style={styles.header}>
        <Text style={styles.headerEmoji}>📋</Text>
        <Text style={styles.headerTitle}>{option.label}</Text>
        <Text style={styles.headerSubtitle}>Rules & guidelines</Text>
      </LinearGradient>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {resolvedOptionImageUrl ? (
          <View style={styles.optionImageWrap}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setImagePreviewOpen(true)}
              style={styles.optionImageTouchable}
            >
              <Image source={{ uri: resolvedOptionImageUrl }} style={styles.optionImage} resizeMode="cover" />
              <View style={styles.optionImageOverlay}>
                <Ionicons name="expand-outline" size={16} color="#fff" />
                <Text style={styles.optionImageOverlayText}>Tap to view full image</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}
        {filteredRules.length > 0 ? (
          filteredRules.map((rule, index) => (
            <View key={index} style={[styles.card, cardShadow, styles.cardSpaced]}>
              <View style={styles.ruleNumberWrap}>
                <Text style={styles.ruleNumber}>{index + 1}</Text>
              </View>
              <Text style={styles.ruleDescription}>{rule.description}</Text>
            </View>
          ))
        ) : (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.body}>{fallbackContent || "No rules content set."}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
      <Modal
        visible={imagePreviewOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setImagePreviewOpen(false)}
      >
        <View style={styles.imagePreviewOverlay}>
          <TouchableOpacity
            style={styles.imagePreviewClose}
            onPress={() => setImagePreviewOpen(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {resolvedOptionImageUrl ? (
            <Image source={{ uri: resolvedOptionImageUrl }} style={styles.imagePreviewImage} resizeMode="contain" />
          ) : null}
          <TouchableOpacity
            style={styles.imagePreviewDownloadBtn}
            onPress={handleOpenOrDownloadServiceImage}
            activeOpacity={0.85}
          >
            <Ionicons name="download-outline" size={18} color="#fff" />
            <Text style={styles.imagePreviewDownloadText}>Download / Open in browser</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: { elevation: 4 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  gradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  centered: { justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 15, color: "rgba(255,255,255,0.9)" },
  emptyWrap: { flex: 1, paddingHorizontal: 24 },
  emptyText: { fontSize: 16, color: colors.textSecondary, textAlign: "center" },
  header: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  headerEmoji: { fontSize: 40, marginBottom: 10 },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textOnGradient,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24 },
  optionImageWrap: {
    marginBottom: 16,
    borderRadius: 14,
    overflow: "hidden",
  },
  optionImageTouchable: {
    borderRadius: 14,
    overflow: "hidden",
  },
  optionImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 14,
  },
  optionImageOverlay: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  optionImageOverlayText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  imagePreviewClose: {
    position: "absolute",
    top: 42,
    right: 18,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePreviewImage: {
    width: "100%",
    height: "74%",
  },
  imagePreviewDownloadBtn: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  imagePreviewDownloadText: {
    color: "#fff",
    fontSize: typography.smallSize,
    fontWeight: "700",
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 24,
  },
  cardSpaced: { marginBottom: 16 },
  ruleNumberWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  ruleNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  ruleDescription: {
    fontSize: typography.smallSize,
    lineHeight: typography.smallLineHeight,
    letterSpacing: typography.bodyLetterSpacing,
    fontWeight: typography.bodyWeight,
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
    fontWeight: "600",
  },
  body: {
    fontSize: typography.smallSize,
    lineHeight: typography.smallLineHeight,
    letterSpacing: typography.bodyLetterSpacing,
    fontWeight: typography.bodyWeight,
    color: colors.textPrimary,
  },
});
