import { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Image, InteractionManager, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuth } from "../lib/auth-context";
import { colors, gradientColors } from "../lib/theme";

const logoSource = require("../assets/logo.png");

const MIN_SPLASH_MS = 2200; // Show at least 2.2s so the splash design is clearly visible

export default function Index() {
  const { token, user, isLoading } = useAuth();
  const router = useRouter();
  const mountedAt = useRef<number>(Date.now());
  const [canNavigate, setCanNavigate] = useState(false);

  // Allow navigation only after auth is ready AND minimum splash time has passed
  useEffect(() => {
    if (!isLoading && canNavigate) {
      const elapsed = Date.now() - mountedAt.current;
      const delay = Math.max(0, MIN_SPLASH_MS - elapsed);
      const t = setTimeout(() => {
        if (token && user?.approvalStatus === "approved") {
          router.replace("/(tabs)");
        } else if (token && user?.approvalStatus !== "approved") {
          router.replace("/pending");
        } else {
          router.replace("/login");
        }
      }, delay);
      return () => clearTimeout(t);
    }
  }, [isLoading, canNavigate, token, user, router]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setCanNavigate(true);
    });
    return () => task.cancel();
  }, []);

  return (
    <LinearGradient colors={[...gradientColors]} style={styles.gradient}>
      <View style={styles.centered}>
        <View style={styles.logoCard}>
          <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.appName}>FGEHA</Text>
        <Text style={styles.tagline}>Resident request portal</Text>
        <View style={styles.loaderRow}>
          <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  logoCard: {
    backgroundColor: "#ffffff",
    paddingVertical: 32,
    paddingHorizontal: 48,
    borderRadius: 28,
    marginBottom: 24,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  logo: {
    width: 200,
    height: 100,
  },
  appName: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.textOnGradient,
    letterSpacing: 3,
    marginBottom: 6,
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tagline: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.95)",
    marginBottom: 32,
    letterSpacing: 0.8,
    fontWeight: "500",
  },
  loaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  spinner: {},
  loadingText: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.95)",
    fontWeight: "500",
  },
});
