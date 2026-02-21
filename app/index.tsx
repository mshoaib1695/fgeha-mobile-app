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
  Linking,
  Modal,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuth } from "../lib/auth-context";
import { checkV, clearVCache } from "../lib/v";
import { checkAppVersion, setUpdateDismissed } from "../lib/app-version";
import { colors, gradientColors } from "../lib/theme";

const logoSource = require("../assets/logo.png");

const MIN_DISPLAY_MS = 1500;
const GATE_CHECK_TIMEOUT_MS = 12000;

type GateStatus =
  | "checking"
  | "fail"
  | "ok"
  | "update-required"
  | "update-available";

export default function Index() {
  const { token, user, isLoading } = useAuth();
  const router = useRouter();
  const mountedAt = useRef<number>(Date.now());
  const [canNavigate, setCanNavigate] = useState(false);
  const [gateStatus, setGateStatus] = useState<GateStatus>("checking");
  const [failMessage, setFailMessage] = useState<string>("");
  const [updatePayload, setUpdatePayload] = useState<{
    storeUrl: string;
    latestVersion?: string;
  } | null>(null);

  const runGateCheck = useCallback(async () => {
    setGateStatus("checking");
    setFailMessage("");
    setUpdatePayload(null);
    const [vResult, appVersionResult] = await Promise.all([
      checkV(),
      checkAppVersion(),
    ]);

    if (vResult.status !== "ok") {
      setGateStatus("fail");
      setFailMessage(vResult.message ?? "Please try again later.");
      return;
    }
    if (appVersionResult.status === "fail") {
      setGateStatus("fail");
      setFailMessage(appVersionResult.message ?? "Please try again later.");
      return;
    }
    if (appVersionResult.status === "update-required" && appVersionResult.storeUrl) {
      setGateStatus("update-required");
      setUpdatePayload({ storeUrl: appVersionResult.storeUrl });
      return;
    }
    if (appVersionResult.status === "update-available" && appVersionResult.storeUrl) {
      setGateStatus("update-available");
      setUpdatePayload({
        storeUrl: appVersionResult.storeUrl,
        latestVersion: appVersionResult.latestVersion,
      });
      return;
    }
    setGateStatus("ok");
  }, []);

  useEffect(() => {
    runGateCheck();
  }, [runGateCheck]);

  // If license/update check hangs (e.g. network never resolves), show error after timeout
  useEffect(() => {
    if (gateStatus !== "checking") return;
    const t = setTimeout(() => {
      setGateStatus("fail");
      setFailMessage("Connection timed out or unavailable.");
    }, GATE_CHECK_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [gateStatus]);

  useEffect(() => {
    if (gateStatus !== "ok" || !canNavigate) return;
    if (!isLoading) {
      const elapsed = Date.now() - mountedAt.current;
      const delay = Math.max(0, MIN_DISPLAY_MS - elapsed);
      const t = setTimeout(() => {
        try {
          if (token && user?.approvalStatus === "approved" && user?.accountStatus !== "deactivated") {
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
  }, [gateStatus, isLoading, canNavigate, token, user, router]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setCanNavigate(true);
    });
    return () => task.cancel();
  }, []);

  const handleRetry = useCallback(() => {
    clearVCache();
    runGateCheck();
  }, [runGateCheck]);

  const openStore = useCallback(() => {
    const url = updatePayload?.storeUrl ?? "https://play.google.com/store/apps/details?id=com.fgeha.app";
    Linking.openURL(url).catch(() => {});
  }, [updatePayload?.storeUrl]);

  const dismissSoftUpdate = useCallback(async () => {
    if (updatePayload?.latestVersion) {
      await setUpdateDismissed(updatePayload.latestVersion);
    }
    setGateStatus("ok");
  }, [updatePayload?.latestVersion]);

  const showFail = gateStatus === "fail";
  const showUpdateRequired = gateStatus === "update-required";
  const showUpdateAvailableModal = gateStatus === "update-available";

  // Update required: full screen same as license verify layout but with "Update required" content
  if (showUpdateRequired) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[...gradientColors]} style={styles.header}>
          <View style={[styles.logoWrap, styles.logoWrapShadow]}>
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.appName}>FGEHA - RSP</Text>
          <Text style={styles.tagline}>Resident's Service Portal</Text>
        </LinearGradient>
        <View style={styles.content}>
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.errorTitle}>Update required</Text>
            <Text style={styles.message}>
              A new version is available. Please update the app to continue.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={openStore} activeOpacity={0.8}>
              <Text style={styles.retryText}>
                {Platform.OS === "ios" ? "Open App Store" : "Open Play Store"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

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
          {showFail ? (
            <>
              <Text style={styles.errorTitle}>Unable to continue</Text>
              <Text style={styles.message}>
                {failMessage || "Please try again later."}
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
      {showUpdateAvailableModal && (
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
                Version {updatePayload?.latestVersion ?? ""} is available. Update for the latest features and improvements.
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
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
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
    fontSize: 16,
    fontWeight: "600",
  },
  softButtonUpdate: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  softButtonUpdateText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
