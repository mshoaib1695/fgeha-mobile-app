import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Image,
  InteractionManager,
  Text,
  Platform,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuth } from "../lib/auth-context";
import { checkV, clearVCache, type VState } from "../lib/v";
import { colors, gradientColors } from "../lib/theme";

const logoSource = require("../assets/logo.png");

const MIN_DISPLAY_MS = 1500;

export default function Index() {
  const { token, user, isLoading } = useAuth();
  const router = useRouter();
  const mountedAt = useRef<number>(Date.now());
  const [canNavigate, setCanNavigate] = useState(false);
  const [vState, setVState] = useState<VState>({ status: "checking" });

  const runVCheck = useCallback(async () => {
    setVState({ status: "checking" });
    const result = await checkV();
    setVState(result);
  }, []);

  useEffect(() => {
    runVCheck();
  }, [runVCheck]);

  useEffect(() => {
    if (vState.status !== "ok" || !canNavigate) return;
    if (!isLoading) {
      const elapsed = Date.now() - mountedAt.current;
      const delay = Math.max(0, MIN_DISPLAY_MS - elapsed);
      const t = setTimeout(() => {
        try {
          if (token && user?.approvalStatus === "approved") {
            router.replace("/(tabs)");
          } else if (token && user?.approvalStatus !== "approved") {
            router.replace("/pending");
          } else {
            router.replace("/login");
          }
        } catch (e) {
          if (__DEV__) console.error("Splash navigation error:", e);
          router.replace("/login");
        }
      }, delay);
      return () => clearTimeout(t);
    }
  }, [vState.status, isLoading, canNavigate, token, user, router]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setCanNavigate(true);
    });
    return () => task.cancel();
  }, []);

  const handleRetry = useCallback(() => {
    clearVCache();
    runVCheck();
  }, [runVCheck]);

  const vOk = vState.status === "ok";
  const vFail = vState.status === "fail";

  return (
    <View style={styles.container}>
      <LinearGradient colors={[...gradientColors]} style={styles.header}>
        <View style={[styles.logoWrap, styles.logoWrapShadow]}>
          <Image
            source={logoSource}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.appName}>FGEHA - RSP</Text>
        <Text style={styles.tagline}>Resident's Service Portal</Text>
      </LinearGradient>
      <View style={styles.content}>
        <View style={[styles.card, cardShadow]}>
          {vFail ? (
            <>
              <Text style={styles.errorTitle}>Unable to continue</Text>
              <Text style={styles.message}>
                {vState.message ?? "Please try again later."}
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading…</Text>
            </>
          )}
        </View>
      </View>
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
  header: {
    paddingTop: 48,
    paddingBottom: 32,
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
  logoWrap: {
    backgroundColor: colors.cardBg,
    borderRadius: 9999,
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    padding: 14,
  },
  logoWrapShadow: {
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  logo: {
    width: 72,
    height: 72,
  },
  appName: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textOnGradient,
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 0.5,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 32,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 32,
    minWidth: 200,
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  retryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
