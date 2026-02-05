import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppAlert } from "../../lib/alert-context";
import { apiGet } from "../../lib/api";
import { colors, gradientColors } from "../../lib/theme";

interface RequestType {
  id: number;
  name: string;
  slug: string;
}

interface RequestItem {
  id: number;
  requestTypeId: number;
  description: string;
  status: string;
  createdAt: string;
  requestType?: RequestType;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
};

function StatusPill({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const isPending = status === "pending";
  const isProgress = status === "in_progress";
  const isDone = status === "done";
  return (
    <View
      style={[
        styles.statusPill,
        isPending && styles.statusPillPending,
        isProgress && styles.statusPillProgress,
        isDone && styles.statusPillDone,
      ]}
    >
      <Text
        style={[
          styles.statusPillText,
          isPending && styles.statusPillTextPending,
          isProgress && styles.statusPillTextProgress,
          isDone && styles.statusPillTextDone,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function RequestCard({ item }: { item: RequestItem }) {
  const typeName = item.requestType?.name ?? `Type #${item.requestTypeId}`;
  const date = item.createdAt
    ? new Date(item.createdAt).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const hasDescription = item.description?.trim().length > 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.typeName} numberOfLines={2}>
          {typeName}
        </Text>
        <StatusPill status={item.status} />
      </View>
      <View style={styles.cardBody}>
        {hasDescription ? (
          <Text style={styles.description} numberOfLines={3}>
            {item.description}
          </Text>
        ) : (
          <Text style={styles.descriptionPlaceholder}>No description</Text>
        )}
        <Text style={styles.date}>{date}</Text>
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <LinearGradient colors={[...gradientColors]} style={styles.emptyIconGradient}>
          <Text style={styles.emptyIconText}>📋</Text>
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>No requests yet</Text>
      <Text style={styles.emptyHint}>Create a request from the "New Request" tab</Text>
    </View>
  );
}

export default function MyRequestsScreen() {
  const { showError } = useAppAlert();
  const [list, setList] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await apiGet<RequestItem[]>("/requests/my");
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      showError((e as Error).message ?? "Could not load your requests. Pull down to try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading && list.length === 0) {
    return (
      <LinearGradient colors={[...gradientColors]} style={styles.gradient}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.textOnGradient} />
          <Text style={styles.loadingText}>Loading your requests…</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[...gradientColors]} style={styles.header}>
        <Text style={styles.headerTitle}>My Requests</Text>
        <Text style={styles.headerSubtitle}>
          {list.length === 0 ? "Your submitted requests will appear here" : `${list.length} request${list.length === 1 ? "" : "s"}`}
        </Text>
      </LinearGradient>
      <FlatList
        data={list}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }: { item: RequestItem }) => <RequestCard item={item} />}
        contentContainerStyle={list.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<EmptyState />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  gradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
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
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 15, color: "rgba(255,255,255,0.9)" },
  list: { padding: 20, paddingBottom: 40 },
  emptyContainer: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    marginBottom: 20,
  },
  emptyIconGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconText: { fontSize: 36 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  typeName: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  cardBody: {},
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  descriptionPlaceholder: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: "italic",
    marginBottom: 12,
  },
  date: {
    fontSize: 13,
    color: colors.textMuted,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  statusPillPending: {
    backgroundColor: "#fff7e6",
    borderWidth: 1,
    borderColor: "#ffd591",
  },
  statusPillTextPending: {
    color: "#d46b08",
    fontSize: 12,
    fontWeight: "600",
  },
  statusPillProgress: {
    backgroundColor: "#f0f9eb",
    borderWidth: 1,
    borderColor: "rgba(106, 176, 76, 0.5)",
  },
  statusPillTextProgress: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  statusPillDone: {
    backgroundColor: "#f6ffed",
    borderWidth: 1,
    borderColor: "#b7eb8f",
  },
  statusPillTextDone: {
    color: "#52c41a",
    fontSize: 12,
    fontWeight: "600",
  },
});
