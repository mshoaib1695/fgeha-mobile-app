import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAppAlert } from "../../lib/alert-context";
import { apiGet, apiPost } from "../../lib/api";
import { colors, gradientColors, tabScreenPaddingBottom } from "../../lib/theme";

interface RequestType {
  id: number;
  name: string;
  slug: string;
}

interface RequestItem {
  id: number;
  requestNumber?: string;
  requestTypeId: number;
  requestTypeOptionId?: number | null;
  description: string;
  status: string;
  createdAt: string;
  requestType?: RequestType;
  requestTypeOption?: { id: number; label: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  cancelled: "Cancelled",
  in_progress: "In progress",
  completed: "Completed",
  done: "Completed",
};

function StatusPill({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const isPending = status === "pending";
  const isCancelled = status === "cancelled";
  const isProgress = status === "in_progress";
  const isDone = status === "done" || status === "completed";
  return (
    <View
      style={[
        styles.statusPill,
        isPending && styles.statusPillPending,
        isCancelled && styles.statusPillCancelled,
        isProgress && styles.statusPillProgress,
        isDone && styles.statusPillDone,
      ]}
    >
      <Text
        style={[
          styles.statusPillText,
          isPending && styles.statusPillTextPending,
          isCancelled && styles.statusPillTextCancelled,
          isProgress && styles.statusPillTextProgress,
          isDone && styles.statusPillTextDone,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const canCancel = (status: string) => status === "pending" || status === "in_progress";

function RequestCard({
  item,
  onCancel,
}: {
  item: RequestItem;
  onCancel: (item: RequestItem) => void;
}) {
  const typeName =
    item.requestTypeOption?.label?.trim() ||
    item.requestType?.name ||
    `Type #${item.requestTypeId}`;
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
  const showCancel = canCancel(item.status);

  return (
    <View style={styles.card}>
      <View style={styles.cardAccent} />
      <View style={styles.cardInner}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.typeName} numberOfLines={2}>
              {typeName}
            </Text>
            {item.requestNumber ? (
              <Text style={styles.requestNumber}>{item.requestNumber}</Text>
            ) : null}
          </View>
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
        {showCancel && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => onCancel(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonIcon}>×</Text>
              <Text style={styles.cancelButtonText}>Cancel request</Text>
            </TouchableOpacity>
          </View>
        )}
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
  const insets = useSafeAreaInsets();
  const { showError, showSuccess } = useAppAlert();
  const [list, setList] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelModalRequest, setCancelModalRequest] = useState<RequestItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const listPaddingBottom = tabScreenPaddingBottom(insets.bottom);

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

  const handleCancelSubmit = async () => {
    const reason = cancelReason.trim();
    if (!reason) {
      showError("Please enter a reason for cancelling.");
      return;
    }
    if (!cancelModalRequest) return;
    setCancelling(true);
    try {
      await apiPost(`/requests/${cancelModalRequest.id}/cancel`, { reason });
      showSuccess("Request cancelled.");
      setCancelModalRequest(null);
      setCancelReason("");
      load(true);
    } catch (e) {
      showError((e as Error).message ?? "Failed to cancel request.");
    } finally {
      setCancelling(false);
    }
  };

  const closeCancelModal = () => {
    if (!cancelling) {
      setCancelModalRequest(null);
      setCancelReason("");
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading && list.length === 0) {
    return (
      <LinearGradient colors={[...gradientColors]} style={styles.gradient}>
        <View style={[styles.centered, { paddingBottom: listPaddingBottom }]}>
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
        renderItem={({ item }: { item: RequestItem }) => (
          <RequestCard item={item} onCancel={setCancelModalRequest} />
        )}
        contentContainerStyle={[
          list.length === 0 ? styles.emptyContainer : styles.list,
          { paddingBottom: listPaddingBottom },
        ]}
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

      <Modal
        visible={cancelModalRequest != null}
        transparent
        animationType="fade"
        onRequestClose={closeCancelModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeCancelModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalContentWrap}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.cancelModalCard}>
                <View style={styles.cancelModalIconWrap}>
                  <Text style={styles.cancelModalIcon}>✕</Text>
                </View>
                <Text style={styles.cancelModalTitle}>Cancel this request?</Text>
                {cancelModalRequest?.requestNumber ? (
                  <Text style={styles.cancelModalSubtitle}>{cancelModalRequest.requestNumber}</Text>
                ) : null}
                <Text style={styles.cancelModalHint}>
                  Your request will be marked as cancelled. You can submit a new one anytime.
                </Text>
                <Text style={styles.cancelModalLabel}>Reason for cancellation</Text>
                <TextInput
                  style={styles.cancelModalInput}
                  placeholder="e.g. Wrong address, no longer needed"
                  placeholderTextColor={colors.textMuted}
                  value={cancelReason}
                  onChangeText={setCancelReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!cancelling}
                />
                <View style={styles.cancelModalButtons}>
                  <TouchableOpacity
                    style={styles.cancelModalButtonBack}
                    onPress={closeCancelModal}
                    disabled={cancelling}
                  >
                    <Text style={styles.cancelModalButtonBackText}>Keep</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cancelModalButtonSubmit, cancelling && styles.cancelModalButtonDisabled]}
                    onPress={handleCancelSubmit}
                    disabled={cancelling}
                  >
                    {cancelling ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.cancelModalButtonSubmitText}>Cancel</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const ELEGANT = {
  pageBg: "#f0f2f5",
  cardBg: "#ffffff",
  cardRadius: 24,
  accent: colors.primary,
  destructive: "#b91c1c",
  destructiveMuted: "rgba(185, 28, 28, 0.08)",
  mutedBorder: "rgba(0,0,0,0.06)",
  overlay: "rgba(15, 23, 42, 0.52)",
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ELEGANT.pageBg },
  gradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingTop: 28,
    paddingBottom: 26,
    paddingHorizontal: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#0d9488",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.textOnGradient,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.9)",
    marginTop: 8,
    letterSpacing: 0.3,
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 0.3,
  },
  list: { padding: 24, paddingBottom: 48 },
  emptyContainer: { flex: 1, paddingHorizontal: 32, justifyContent: "center" },
  empty: {
    alignItems: "center",
    paddingVertical: 56,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
    marginBottom: 28,
    shadowColor: ELEGANT.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  emptyIconGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconText: { fontSize: 44 },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
    letterSpacing: 0.35,
  },
  emptyHint: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: ELEGANT.cardBg,
    borderRadius: ELEGANT.cardRadius,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: ELEGANT.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: ELEGANT.mutedBorder,
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: ELEGANT.accent,
    borderTopLeftRadius: ELEGANT.cardRadius,
    borderBottomLeftRadius: ELEGANT.cardRadius,
  },
  cardInner: {
    paddingLeft: 24,
    paddingRight: 24,
    paddingTop: 22,
    paddingBottom: 22,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 16,
  },
  cardHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },
  typeName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 0.25,
    lineHeight: 25,
  },
  requestNumber: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    color: ELEGANT.accent,
    letterSpacing: 0.35,
  },
  cardBody: { marginBottom: 4 },
  cardActions: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: ELEGANT.mutedBorder,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 14,
    letterSpacing: 0.15,
  },
  descriptionPlaceholder: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: 14,
    letterSpacing: 0.15,
  },
  date: {
    fontSize: 13,
    color: colors.textMuted,
    letterSpacing: 0.25,
  },
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  statusPillPending: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
  },
  statusPillTextPending: {
    color: "#b45309",
  },
  statusPillProgress: {
    backgroundColor: "rgba(13, 148, 136, 0.12)",
  },
  statusPillTextProgress: {
    color: ELEGANT.accent,
  },
  statusPillCancelled: {
    backgroundColor: ELEGANT.destructiveMuted,
  },
  statusPillTextCancelled: {
    color: ELEGANT.destructive,
  },
  statusPillDone: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
  },
  statusPillTextDone: {
    color: "#15803d",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "rgba(185, 28, 28, 0.35)",
    gap: 8,
  },
  cancelButtonIcon: {
    fontSize: 17,
    fontWeight: "600",
    color: ELEGANT.destructive,
    lineHeight: 22,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: ELEGANT.destructive,
    letterSpacing: 0.25,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: ELEGANT.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  modalContentWrap: {
    width: "100%",
    maxWidth: 360,
  },
  cancelModalCard: {
    backgroundColor: ELEGANT.cardBg,
    borderRadius: 32,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
  },
  cancelModalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ELEGANT.destructiveMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  cancelModalIcon: {
    fontSize: 24,
    color: ELEGANT.destructive,
    fontWeight: "600",
  },
  cancelModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  cancelModalSubtitle: {
    fontSize: 14,
    color: ELEGANT.accent,
    fontWeight: "600",
    marginBottom: 14,
    letterSpacing: 0.25,
  },
  cancelModalHint: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 22,
    letterSpacing: 0.15,
  },
  cancelModalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  cancelModalInput: {
    borderWidth: 1.5,
    borderColor: ELEGANT.mutedBorder,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: "#fafbfc",
    minHeight: 104,
    marginBottom: 28,
  },
  cancelModalButtons: {
    flexDirection: "row",
    gap: 14,
    alignItems: "stretch",
  },
  cancelModalButtonBack: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: ELEGANT.mutedBorder,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelModalButtonBackText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 0.25,
  },
  cancelModalButtonSubmit: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: ELEGANT.destructive,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ELEGANT.destructive,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  cancelModalButtonDisabled: {
    opacity: 0.6,
  },
  cancelModalButtonSubmitText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 0.3,
  },
});
