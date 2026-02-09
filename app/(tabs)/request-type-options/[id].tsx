import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiGet } from "../../../lib/api";
import { colors, gradientColors, tabScreenPaddingBottom, typography } from "../../../lib/theme";

type OptionType = "form" | "list" | "rules" | "link";
interface Option {
  id: number;
  requestTypeId: number;
  label: string;
  optionType: OptionType;
  config: { listKey?: string; content?: string; url?: string } | null;
  displayOrder: number;
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

export default function RequestTypeOptionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const requestTypeId = id ? +id : 0;
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("Options");

  useEffect(() => {
    if (!requestTypeId) return;
    (async () => {
      setLoading(true);
      try {
        const list = await apiGet<Option[]>(`/request-type-options/by-request-type/${requestTypeId}`);
        const opts = Array.isArray(list) ? list : [];
        setOptions(opts);
        if (opts.length === 0) {
          router.replace(`/(tabs)/create-request/${requestTypeId}`);
          return;
        }
        const types = await apiGet<{ id: number; name: string; underConstruction?: boolean; underConstructionMessage?: string | null }[]>("/request-types");
        const t = Array.isArray(types) ? types.find((x) => x.id === requestTypeId) : null;
        if (t?.underConstruction) {
          router.replace({
            pathname: "/(tabs)/under-construction",
            params: { title: t.name, message: t.underConstructionMessage ?? "PAGE IS UNDER CONSTRUCTION 🚧" },
          });
          return;
        }
        const name = t?.name ?? "Options";
        setTitle(name);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [requestTypeId]);

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const handleOptionPress = (opt: Option) => {
    if (opt.optionType === "form") {
      router.push({
        pathname: "/(tabs)/create-request/[id]",
        params: { id: String(requestTypeId), from: "options" },
      });
      return;
    }
    if (opt.optionType === "list") {
      const listKey = opt.config?.listKey ?? "daily_bulletin";
      router.push({
        pathname: "/(tabs)/service-list",
        params: { requestTypeId: String(requestTypeId), listKey },
      });
      return;
    }
    if (opt.optionType === "rules") {
      router.push({
        pathname: "/(tabs)/service-rules",
        params: { optionId: String(opt.id) },
      });
      return;
    }
    if (opt.optionType === "link" && opt.config?.url) {
      const url = opt.config.url;
      Linking.canOpenURL(url).then((can) => {
        if (can) Linking.openURL(url);
        else Alert.alert("Error", "Cannot open link.");
      });
    }
  };

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

  return (
    <View style={styles.container}>
      <LinearGradient colors={[...gradientColors]} style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSubtitle}>Choose an option</Text>
      </LinearGradient>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.optionCard, cardShadow]}
            onPress={() => handleOptionPress(opt)}
            activeOpacity={0.78}
          >
            <Text style={styles.optionLabel}>{opt.label}</Text>
            <Text style={styles.optionHint}>{opt.optionType === "form" ? "Submit a request" : opt.optionType}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  gradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  centered: { justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 15, color: "rgba(255,255,255,0.9)" },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 24,
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
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textOnGradient,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  optionCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  optionLabel: {
    fontSize: typography.cardTitleSize,
    fontWeight: typography.cardTitleWeight,
    color: colors.textPrimary,
  },
  optionHint: {
    fontSize: typography.smallSize,
    lineHeight: typography.smallLineHeight,
    color: colors.textSecondary,
    marginTop: 4,
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
});
