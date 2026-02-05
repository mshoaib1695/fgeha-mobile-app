import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAppAlert } from "../../../lib/alert-context";
import { apiGet } from "../../../lib/api";
import { colors, gradientColors } from "../../../lib/theme";

const logoSource = require("../../../assets/logo.png");

interface RequestType {
  id: number;
  name: string;
  slug: string;
  displayOrder: number;
}

export default function CreateRequestIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showError } = useAppAlert();
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [loading, setLoading] = useState(true);

  // Push content below the stack header (header ~56px + safe area + gap)
  const headerHeight = 56;
  const contentTopPadding = insets.top + headerHeight + 16;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await apiGet<RequestType[]>("/request-types");
        if (!cancelled) {
          const sorted = (Array.isArray(list) ? list : []).sort(
            (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
          );
          setRequestTypes(sorted);
        }
      } catch (e) {
        if (!cancelled)
          showError((e as Error).message ?? "Could not load request types. Pull down to try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openForm = (requestTypeId: number) => {
    router.push(`/(tabs)/create-request/${requestTypeId}`);
  };

  if (loading) {
    return (
      <LinearGradient colors={[...gradientColors]} style={styles.gradient}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.textOnGradient} />
        </View>
      </LinearGradient>
    );
  }

  if (requestTypes.length === 0) {
    return (
      <LinearGradient colors={[...gradientColors]} style={styles.gradient}>
        <View style={styles.centered}>
          <Text style={styles.noTypes}>No request types available.</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[...gradientColors]} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: contentTopPadding }]}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Choose request type</Text>
          <Text style={styles.subtitle}>Tap an option to open the form</Text>
        </View>
        <View style={styles.buttonList}>
          {requestTypes.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={styles.ctaButton}
              onPress={() => openForm(t.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaButtonText}>{t.name}</Text>
              <Text style={styles.ctaLinkHint}>Open form →</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  // paddingTop applied in component so content stays below header
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { alignItems: "center", marginBottom: 24 },
  logo: { width: 100, height: 48, marginBottom: 12 },
  noTypes: { fontSize: 16, color: "rgba(255,255,255,0.9)" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8, color: colors.textOnGradient },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.9)", marginBottom: 8 },
  buttonList: { gap: 12 },
  ctaButton: {
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 0,
  },
  ctaButtonText: { fontSize: 17, fontWeight: "600", color: colors.primary },
  ctaLinkHint: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
});
