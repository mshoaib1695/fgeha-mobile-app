import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { checkV, clearVCache, type VState } from "./v";
import { colors, gradientColors } from "./theme";

const logoSource = require("../assets/logo.png");

type VContextValue = {
  state: VState;
  retry: () => Promise<void>;
};

const VContext = createContext<VContextValue | null>(null);

export function useV(): VContextValue {
  const ctx = useContext(VContext);
  if (!ctx) throw new Error("useV must be used within VGate");
  return ctx;
}

function SplashScreen() {
  return (
    <View style={styles.container}>
      <LinearGradient colors={[...gradientColors]} style={styles.header}>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        <Text style={styles.appName}>FGEHA - RSP</Text>
        <Text style={styles.tagline}>Resident's Servcice Portal</Text>
      </LinearGradient>
      <View style={styles.content}>
        <View style={[styles.card, cardShadow]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading…</Text>
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

export function VGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VState>({ status: "checking" });

  const runCheck = useCallback(async () => {
    setState({ status: "checking" });
    const result = await checkV();
    setState(result);
  }, []);

  const retry = useCallback(async () => {
    clearVCache();
    await runCheck();
  }, [runCheck]);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  if (state.status === "ok") {
    return <>{children}</>;
  }

  if (state.status === "checking") {
    return <SplashScreen />;
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[...gradientColors]} style={[styles.header, styles.headerTight]}>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        <Text style={styles.appName}>FGEHA - RSP</Text>
        <Text style={styles.tagline}>Resident's Service Portal</Text>
      </LinearGradient>
      <View style={styles.content}>
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.title}>Unable to continue</Text>
          <Text style={styles.message}>
            {state.message ?? "Please try again later."}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={retry} activeOpacity={0.8}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

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
  headerTight: {
    paddingBottom: 16,
  },
  logo: {
    width: 120,
    height: 60,
    marginBottom: 16,
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
    paddingHorizontal: 24,
    paddingTop: 20,
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
  title: {
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
