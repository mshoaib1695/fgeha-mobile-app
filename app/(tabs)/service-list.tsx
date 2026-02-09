import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
  Platform,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiGet } from "../../lib/api";
import { API_URL } from "../../lib/api";
import { colors, gradientColors, tabScreenPaddingBottom, typography } from "../../lib/theme";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function getDaysInMonth(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const days = last.getDate();
  const out: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) out.push(null);
  for (let d = 1; d <= days; d++) out.push(d);
  return out;
}
function toYYYYMMDD(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

type Bulletin = {
  id: number;
  date: string;
  title: string;
  description: string | null;
  filePath: string;
  fileType: string;
};

const cardShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: { elevation: 4 },
});

export default function ServiceListScreen() {
  const { requestTypeId, listKey } = useLocalSearchParams<{ requestTypeId?: string; listKey?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const key = listKey ?? "daily_bulletin";
  const [bulletin, setBulletin] = useState<Bulletin | null>(null);
  const [byDateBulletin, setByDateBulletin] = useState<Bulletin | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDate, setLoadingDate] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const now = new Date();
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());

  const paddingBottom = tabScreenPaddingBottom(insets.bottom);

  useEffect(() => {
    if (key !== "daily_bulletin") return;
    (async () => {
      setLoading(true);
      try {
        const today = await apiGet<Bulletin | null>("/daily-bulletin/today");
        setBulletin(today ?? null);
      } catch {
        setBulletin(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [key]);

  const fetchByDate = async (d: string) => {
    if (!d) return;
    setLoadingDate(true);
    setSelectedDateStr(d);
    try {
      const b = await apiGet<Bulletin | null>(`/daily-bulletin/by-date/${d}`);
      setByDateBulletin(b ?? null);
    } catch {
      setByDateBulletin(null);
    } finally {
      setLoadingDate(false);
    }
  };

  const handleCalendarDay = (day: number) => {
    const d = toYYYYMMDD(calendarYear, calendarMonth, day);
    setCalendarVisible(false);
    fetchByDate(d);
  };

  const monthName = new Date(calendarYear, calendarMonth).toLocaleString("default", { month: "long" });
  const calendarDays = getDaysInMonth(calendarYear, calendarMonth);

  const openFile = (filePath: string) => {
    const url = filePath.startsWith("http") ? filePath : `${API_URL.replace(/\/$/, "")}/${filePath}`;
    Linking.openURL(url);
  };

  if (key === "requests") {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[...gradientColors]} style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.headerEmoji}>📋</Text>
          <Text style={styles.headerTitle}>List of requests</Text>
          <Text style={styles.headerSubtitle}>View and track in My Requests</Text>
        </LinearGradient>
        <View style={[styles.content, { paddingBottom }]}>
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.body}>View and track your requests in My Requests.</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace("/(tabs)/my-requests")}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[...gradientColors]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonGradient}
              >
                <Text style={styles.primaryButtonText}>Open My Requests</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (key !== "daily_bulletin") {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[...gradientColors]} style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.headerEmoji}>📋</Text>
          <Text style={styles.headerTitle}>List</Text>
          <Text style={styles.headerSubtitle}>No content configured</Text>
        </LinearGradient>
        <View style={[styles.content, { paddingBottom }]}>
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.body}>No content configured for this list type.</Text>
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
      <LinearGradient colors={[...gradientColors]} style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerEmoji}>💧</Text>
        <Text style={styles.headerTitle}>Water tanker list</Text>
        <Text style={styles.headerSubtitle}>Today's schedule & filter by date</Text>
      </LinearGradient>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {bulletin ? (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.cardLabel}>Today</Text>
            <Text style={styles.cardTitle}>{bulletin.title}</Text>
            {bulletin.description ? (
              <Text style={styles.cardDesc}>{bulletin.description}</Text>
            ) : null}
            <TouchableOpacity
              style={styles.fileButton}
              onPress={() => openFile(bulletin.filePath)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[...gradientColors]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.fileButtonGradient}
              >
                <Text style={styles.fileButtonText}>Open file ({bulletin.fileType.toUpperCase()})</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.body}>No tanker list for today.</Text>
          </View>
        )}

        <View style={[styles.card, cardShadow]}>
          <Text style={styles.sectionTitle}>Filter by date</Text>
          <Text style={styles.sectionHint}>Pick a date to view the tanker schedule.</Text>
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => setCalendarVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.calendarButtonIconWrap}>
              <Ionicons name="calendar-outline" size={24} color={colors.primary} />
            </View>
            <Text style={styles.calendarButtonText}>Open calendar</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {loadingDate ? (
            <View style={styles.byDateLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.byDateLoadingText}>Loading…</Text>
            </View>
          ) : selectedDateStr && byDateBulletin ? (
            <View style={styles.byDateResult}>
              <Text style={styles.selectedDateLabel}>{selectedDateStr}</Text>
              <Text style={styles.cardTitle}>{byDateBulletin.title}</Text>
              <TouchableOpacity
                style={styles.fileButtonSmall}
                onPress={() => openFile(byDateBulletin.filePath)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[...gradientColors]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.fileButtonGradient}
                >
                  <Text style={styles.fileButtonText}>Open file</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : selectedDateStr && !byDateBulletin ? (
            <View style={styles.byDateResult}>
              <Text style={styles.selectedDateLabel}>{selectedDateStr}</Text>
              <Text style={styles.body}>No tanker list for this date.</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={calendarVisible} transparent animationType="fade">
        <Pressable style={styles.calendarBackdrop} onPress={() => setCalendarVisible(false)}>
          <Pressable style={[styles.calendarModal, { paddingBottom: insets.bottom + 16 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Select date</Text>
              <TouchableOpacity onPress={() => setCalendarVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.calendarMonthRow}>
              <TouchableOpacity
                onPress={() => {
                  if (calendarMonth === 0) {
                    setCalendarYear((y) => y - 1);
                    setCalendarMonth(11);
                  } else setCalendarMonth((m) => m - 1);
                }}
                style={styles.calendarNavBtn}
              >
                <Ionicons name="chevron-back" size={24} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.calendarMonthText}>{monthName} {calendarYear}</Text>
              <TouchableOpacity
                onPress={() => {
                  if (calendarMonth === 11) {
                    setCalendarYear((y) => y + 1);
                    setCalendarMonth(0);
                  } else setCalendarMonth((m) => m + 1);
                }}
                style={styles.calendarNavBtn}
              >
                <Ionicons name="chevron-forward" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((w) => (
                <Text key={w} style={styles.weekdayCell}>{w}</Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {calendarDays.map((day, i) => (
                day === null ? (
                  <View key={`e-${i}`} style={styles.dayCell} />
                ) : (
                  <TouchableOpacity
                    key={`${calendarYear}-${calendarMonth}-${day}`}
                    style={styles.dayCell}
                    onPress={() => handleCalendarDay(day)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dayCellText}>{day}</Text>
                  </TouchableOpacity>
                )
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  gradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: typography.smallSize, color: "rgba(255,255,255,0.9)" },
  header: {
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
  headerEmoji: { fontSize: 40, marginBottom: 10 },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textOnGradient,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: typography.subtitleSize,
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
  },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24 },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: typography.smallSize,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  cardTitle: {
    fontSize: typography.cardTitleSize,
    fontWeight: typography.cardTitleWeight,
    color: colors.textPrimary,
  },
  cardDesc: {
    fontSize: typography.smallSize,
    lineHeight: typography.smallLineHeight,
    color: colors.textSecondary,
    marginTop: 8,
  },
  body: {
    fontSize: typography.bodySize,
    lineHeight: typography.bodyLineHeight,
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: typography.smallSize,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  sectionHint: {
    fontSize: typography.smallSize,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  calendarButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fafafa",
    gap: 12,
  },
  calendarButtonIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(13, 148, 136, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarButtonText: {
    flex: 1,
    fontSize: typography.bodySize,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  byDateLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  byDateLoadingText: {
    fontSize: typography.smallSize,
    color: colors.textSecondary,
  },
  selectedDateLabel: {
    fontSize: typography.smallSize,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: 6,
  },
  byDateResult: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  fileButton: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 16,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  fileButtonSmall: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 12,
    alignSelf: "flex-start",
  },
  fileButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  fileButtonText: {
    color: colors.textOnGradient,
    fontSize: typography.smallSize,
    fontWeight: "700",
  },
  primaryButton: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 16,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
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
  calendarBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  calendarModal: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 12 },
    }),
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  calendarMonthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  calendarMonthText: {
    fontSize: typography.bodySize,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  calendarNavBtn: {
    padding: 8,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    maxWidth: 44,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  dayCellText: {
    fontSize: typography.smallSize,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
