import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiGet, unwrapList } from "../../../lib/api";
import { colors, gradientColors, tabScreenPaddingBottom, typography } from "../../../lib/theme";

type OptionType = "form" | "list" | "rules" | "link";
interface Option {
  id: number;
  requestTypeId: number;
  label: string;
  optionType: OptionType;
  imageUrl?: string | null;
  config: { listKey?: string; content?: string; url?: string } | null;
  displayOrder: number;
}

function getOptionHint(opt: Option): string {
  if (opt.optionType === "form") return "Submit a request";
  if (opt.optionType === "list") return "Open list";
  if (opt.optionType === "rules") return "View rules";
  if (opt.optionType === "link") return "Open link";
  return opt.optionType;
}

function getLinkHost(rawUrl?: string): string | null {
  const value = (rawUrl ?? "").trim();
  if (!value) return null;
  try {
    const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return new URL(normalized).host || value;
  } catch {
    return value;
  }
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
          router.replace(`/create-request/${requestTypeId}`);
          return;
        }
        const raw = await apiGet<unknown>("/request-types");
        const types = unwrapList<{ id: number; name: string; underConstruction?: boolean; underConstructionMessage?: string | null }>(raw);
        const t = types.find((x) => x.id === requestTypeId) ?? null;
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
        pathname: "/create-request/[id]",
        params: { id: String(requestTypeId), optionId: String(opt.id) },
      });
      return;
    }
    if (opt.optionType === "list") {
      const listKey = opt.config?.listKey ?? "daily_bulletin";
      router.push({
        pathname: "/(tabs)/service-list",
        params: { requestTypeId: String(requestTypeId), listKey, optionId: String(opt.id) },
      });
      return;
    }
    if (opt.optionType === "rules") {
      router.push({
        pathname: "/(tabs)/service-rules",
        params: {
          optionId: String(opt.id),
          requestTypeId: String(requestTypeId),
          optionImageUrl: opt.imageUrl ?? "",
        },
      });
      return;
    }
    if (opt.optionType === "link" && opt.config?.url) {
      router.push({
        pathname: "/(tabs)/service-link",
        params: {
          optionId: String(opt.id),
          title: opt.label,
          url: opt.config.url,
        },
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
        <TouchableOpacity 
          style={styles.backBtnTop} 
          onPress={() => {
            if (navigation.canGoBack()) {
              router.back();
            } else {
              router.push("/(tabs)");
            }
          }} 
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.optionCard, cardShadow, opt.optionType === "link" && styles.optionCardLink]}
            onPress={() => handleOptionPress(opt)}
            activeOpacity={0.78}
          >
            <Text style={styles.optionLabel}>{opt.label}</Text>
            <View style={styles.optionMetaRow}>
              {opt.optionType === "link" ? (
                <Ionicons name="open-outline" size={15} color={colors.primary} />
              ) : null}
              <Text style={[styles.optionHint, opt.optionType === "link" && styles.optionHintLink]}>
                {getOptionHint(opt)}
              </Text>
            </View>
            {opt.optionType === "link" ? (
              <Text style={styles.optionLinkHost} numberOfLines={1}>
                {getLinkHost(opt.config?.url) ?? "External website"}
              </Text>
            ) : null}
          </TouchableOpacity>
        ))}
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
  optionCardLink: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBg,
  },
  optionLabel: {
    fontSize: typography.cardTitleSize,
    fontWeight: typography.cardTitleWeight,
    color: colors.textPrimary,
  },
  optionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  optionHint: {
    fontSize: typography.smallSize,
    lineHeight: typography.smallLineHeight,
    color: colors.textSecondary,
  },
  optionHintLink: {
    color: colors.primary,
    fontWeight: "600",
  },
  optionLinkHost: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginTop: 8,
  },
  backBtnTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  backBtnText: {
    fontSize: typography.bodySize,
    fontWeight: "600",
    color: colors.primary,
  },
});
