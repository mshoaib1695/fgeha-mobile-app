import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../lib/auth-context";
import { SafeGradient } from "../../lib/safe-gradient";
import { apiGet, API_URL } from "../../lib/api";
import { colors, gradientColors } from "../../lib/theme";

const logoSource = require("../../assets/logo.png");

type DailyBulletin = {
  id: number;
  date: string;
  title: string;
  description: string | null;
  filePath: string;
  fileType: string;
};

function fileUrl(path: string): string {
  const base = (API_URL || "").replace(/\/$/, "");
  return base ? `${base}/${path}` : path;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [bulletin, setBulletin] = useState<DailyBulletin | null>(null);
  const [loadingBulletin, setLoadingBulletin] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<DailyBulletin | null>("/daily-bulletin/today");
        if (!cancelled && data) setBulletin(data);
      } catch {
        if (!cancelled) setBulletin(null);
      } finally {
        if (!cancelled) setLoadingBulletin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openFile = () => {
    if (!bulletin?.filePath) return;
    const url = fileUrl(bulletin.filePath);
    Linking.openURL(url).catch(() => {});
  };

  const formatDate = (d: string) => {
    try {
      const date = new Date(d);
      return date.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return d;
    }
  };

  return (
    <SafeGradient style={styles.gradient}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.welcome}>Welcome, {user?.fullName ?? "User"}!</Text>
          <Text style={styles.hint}>
            Use the tabs below to create a new request or view your existing requests.
          </Text>
        </View>

        {loadingBulletin ? (
          <View style={styles.bulletinCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.bulletinLoadingText}>Loading today's list…</Text>
          </View>
        ) : bulletin ? (
          <View style={styles.bulletinCard}>
            <Text style={styles.bulletinHeading}>Water tanker list</Text>
            <Text style={styles.bulletinTitle}>{bulletin.title}</Text>
            {bulletin.description ? (
              <Text style={styles.bulletinDescription}>{bulletin.description}</Text>
            ) : null}
            <Text style={styles.bulletinDate}>{formatDate(bulletin.date)}</Text>
            <TouchableOpacity style={styles.viewFileBtn} onPress={openFile} activeOpacity={0.85}>
              <LinearGradient
                colors={[...gradientColors]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.viewFileBtnGradient}
              >
                <Text style={styles.viewFileBtnText}>
                  View {bulletin.fileType.toUpperCase()}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 24 },
  logoWrap: { alignItems: "center", marginBottom: 20 },
  logo: { width: 120, height: 56 },
  welcome: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 12,
    color: colors.textOnGradient,
  },
  hint: { fontSize: 16, color: "rgba(255,255,255,0.9)" },
  bulletinCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  bulletinLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },
  bulletinHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  bulletinTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  bulletinDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  bulletinDate: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
  },
  viewFileBtn: {
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "stretch",
  },
  viewFileBtnGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  viewFileBtnText: {
    color: colors.textOnGradient,
    fontSize: 16,
    fontWeight: "700",
  },
});
