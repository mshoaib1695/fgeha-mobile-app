import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { colors, tabScreenPaddingBottom, typography } from "../../lib/theme";

function normalizeUrl(raw?: string): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export default function ServiceLinkScreen() {
  const { url, title } = useLocalSearchParams<{ url?: string; title?: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const resolvedUrl = useMemo(() => normalizeUrl(url), [url]);
  const screenTitle = (title ?? "").trim() || "Link";
  const paddingBottom = tabScreenPaddingBottom(insets.bottom);

  useEffect(() => {
    navigation.setOptions({ title: screenTitle });
  }, [navigation, screenTitle]);

  const handleOpenInBrowser = async () => {
    if (!resolvedUrl) return;
    try {
      await Linking.openURL(resolvedUrl);
    } catch {
      // Leave the error UI visible if opening fails.
    }
  };

  if (!resolvedUrl) {
    return (
      <View style={[styles.centered, { paddingBottom }]}>
        <Text style={styles.errorTitle}>Invalid link</Text>
        <Text style={styles.errorBody}>This option does not contain a valid URL.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: resolvedUrl }}
        onLoadStart={() => {
          setLoading(true);
          setHasError(false);
        }}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setHasError(true);
        }}
      />
      {loading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Loading link…</Text>
        </View>
      ) : null}
      {hasError ? (
        <View style={[styles.errorOverlay, { paddingBottom }]}>
          <Ionicons name="warning-outline" size={24} color={colors.error} />
          <Text style={styles.errorTitle}>Could not load link</Text>
          <Text style={styles.errorBody}>You can still open it in your browser.</Text>
          <TouchableOpacity style={styles.openBtn} onPress={handleOpenInBrowser} activeOpacity={0.85}>
            <Ionicons name="open-outline" size={18} color="#fff" />
            <Text style={styles.openBtnText}>Open in browser</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cardBg },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  loadingText: {
    fontSize: typography.smallSize,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  errorOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 16,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: "center",
  },
  errorTitle: {
    fontSize: typography.bodySize,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 8,
    textAlign: "center",
  },
  errorBody: {
    fontSize: typography.smallSize,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: "center",
  },
  openBtn: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  openBtnText: {
    color: colors.textOnGradient,
    fontSize: typography.smallSize,
    fontWeight: "700",
  },
});
