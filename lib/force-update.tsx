import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "./api";
import { colors, gradientColors, typography } from "./theme";

const logoSource = require("../assets/logo.png");

const DISMISS_KEY_PREFIX = "forceUpdateDismissed_";

type AppVersionResponse = {
  minimumVersion: string;
  latestVersion?: string;
  storeUrlAndroid?: string;
  storeUrlIos?: string;
};

/** Compare semver-like versions (e.g. "1.0.2" vs "1.0.3"). Returns true if a < b. */
function isVersionLess(a: string, b: string): boolean {
  const partsA = a.split(".").map((n) => parseInt(n, 10) || 0);
  const partsB = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const na = partsA[i] ?? 0;
    const nb = partsB[i] ?? 0;
    if (na < nb) return true;
    if (na > nb) return false;
  }
  return false;
}

const DEFAULT_ANDROID =
  "https://play.google.com/store/apps/details?id=com.fgeha.app";

export function ForceUpdateGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<
    "loading" | "update-required" | "update-available" | "ok" | "error"
  >("loading");
  const [storeUrl, setStoreUrl] = useState<string>(DEFAULT_ANDROID);
  const [latestVersion, setLatestVersion] = useState<string>("");
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const currentVersion =
      Constants.expoConfig?.version ?? Constants.manifest?.version ?? "0.0.0";

    const check = async () => {
      try {
        const base = (API_URL ?? "").replace(/\/+$/, "");
        const res = await fetch(`${base}/app-version`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (cancelled) return;
        if (!res.ok) {
          setState("ok");
          return;
        }
        const data = (await res.json()) as AppVersionResponse;
        const minimum = data.minimumVersion ?? "0.0.0";
        const latest = data.latestVersion ?? minimum;
        const url =
          Platform.OS === "ios"
            ? data.storeUrlIos ?? DEFAULT_ANDROID
            : data.storeUrlAndroid ?? DEFAULT_ANDROID;
        setStoreUrl(url);
        setLatestVersion(latest);

        if (isVersionLess(currentVersion, minimum)) {
          setState("update-required");
          return;
        }
        if (isVersionLess(currentVersion, latest)) {
          const dismissKey = DISMISS_KEY_PREFIX + latest;
          const dismissed = await AsyncStorage.getItem(dismissKey);
          if (!cancelled && dismissed !== "1") {
            setState("update-available");
          } else {
            setState("ok");
          }
          return;
        }
        setState("ok");
      } catch {
        if (!cancelled) setState("ok");
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const openStore = () => {
    Linking.openURL(storeUrl).catch(() => {});
  };

  const dismissSoftUpdate = async () => {
    if (latestVersion) {
      await AsyncStorage.setItem(DISMISS_KEY_PREFIX + latestVersion, "1");
    }
    setState("ok");
  };

  const insets = useSafeAreaInsets();
  const cardShadow = Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
    },
    android: { elevation: 4 },
  });

  if (state === "loading") {
    return (
      <View style={[styles.loadingRoot, { paddingTop: insets.top }]}>
        <LinearGradient colors={[...gradientColors]} style={styles.loadingGradient}>
          {!logoError ? (
            <Image source={logoSource} style={styles.loadingLogo} resizeMode="contain" onError={() => setLogoError(true)} />
          ) : (
            <Text style={styles.logoFallback}>FGEHA</Text>
          )}
          <ActivityIndicator size="large" color={colors.textOnGradient} style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>Checking for updates…</Text>
        </LinearGradient>
      </View>
    );
  }

  if (state === "update-required") {
    return (
      <View style={[styles.updateRoot, { paddingTop: insets.top }]}>
        <LinearGradient colors={[...gradientColors]} style={styles.updateHeader}>
          <View style={styles.logoWrap}>
            {!logoError ? (
              <Image source={logoSource} style={styles.logo} resizeMode="contain" onError={() => setLogoError(true)} />
            ) : (
              <Text style={styles.logoFallbackSmall}>FGEHA</Text>
            )}
          </View>
          <Text style={styles.headerTitle}>Update required</Text>
          <Text style={styles.headerSubtitle}>A new version is available</Text>
        </LinearGradient>
        <View style={styles.updateContent}>
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.message}>
              Please update the app to continue using all features.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={openStore}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[...gradientColors]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonGradient}
              >
                <Text style={styles.primaryButtonText}>
                  {Platform.OS === "ios" ? "Open App Store" : "Open Play Store"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (state === "error") {
    return <>{children}</>;
  }

  const showSoftUpdateModal = state === "update-available";

  return (
    <>
      {children}
      {showSoftUpdateModal && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={dismissSoftUpdate}
        >
          <Pressable style={styles.modalOverlay} onPress={dismissSoftUpdate}>
            <Pressable style={styles.softModalCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.softTitle}>Update available</Text>
              <Text style={styles.softMessage}>
                Version {latestVersion} is available. Update for the latest features and improvements.
              </Text>
              <View style={styles.softButtons}>
                <TouchableOpacity
                  style={styles.softButtonLater}
                  onPress={dismissSoftUpdate}
                  activeOpacity={0.8}
                >
                  <Text style={styles.softButtonLaterText}>Later</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.softButtonUpdate}
                  onPress={openStore}
                  activeOpacity={0.8}
                >
                  <Text style={styles.softButtonUpdateText}>Update</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingRoot: { flex: 1, backgroundColor: colors.gradientEnd },
  loadingGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingLogo: { width: 80, height: 80, marginBottom: 20 },
  loadingSpinner: { marginBottom: 12 },
  loadingText: {
    fontSize: typography.bodySize,
    color: "rgba(255,255,255,0.95)",
  },
  updateRoot: { flex: 1, backgroundColor: "#f5f5f5" },
  updateHeader: {
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
  logoWrap: {
    backgroundColor: colors.cardBg,
    borderRadius: 9999,
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    padding: 14,
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
  logo: { width: 72, height: 72 },
  logoFallback: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textOnGradient,
    letterSpacing: 2,
    marginBottom: 20,
  },
  logoFallbackSmall: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textOnGradient,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: typography.subtitleSize,
    color: "rgba(255,255,255,0.9)",
  },
  updateContent: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 24,
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
  },
  message: {
    fontSize: typography.bodySize,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: typography.bodyLineHeight,
  },
  primaryButton: {
    borderRadius: 14,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  primaryButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: colors.textOnGradient,
    fontSize: typography.bodySize,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  softModalCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  softTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: "center",
  },
  softMessage: {
    fontSize: typography.smallSize,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: typography.smallLineHeight,
  },
  softButtons: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  softButtonLater: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.border,
  },
  softButtonLaterText: {
    color: colors.textSecondary,
    fontSize: typography.bodySize,
    fontWeight: "600",
  },
  softButtonUpdate: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  softButtonUpdateText: {
    color: colors.textOnGradient,
    fontSize: typography.bodySize,
    fontWeight: "700",
  },
});
