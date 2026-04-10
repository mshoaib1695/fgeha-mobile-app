import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { fetchOutstandingStatus } from "../../lib/outstanding";
import { colors, typography } from "../../lib/theme";
import { useLocalSearchParams } from "expo-router";

export default function OutstandingPaymentScreen() {
  const params = useLocalSearchParams<{
    fromNotification?: string;
    eventType?: string;
    entryCategory?: string;
    entryAmount?: string;
    totalOutstanding?: string;
    entryCreatedAt?: string;
  }>();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof fetchOutstandingStatus>>>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const next = await fetchOutstandingStatus();
        if (mounted) setStatus(next);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const total = Number(status?.totalOutstanding ?? 0);
  const fromNotification = String(params.fromNotification ?? "") === "1";
  const payloadRemaining = Number(params.totalOutstanding ?? NaN);
  const remainingBalance =
    fromNotification && Number.isFinite(payloadRemaining) ? payloadRemaining : total;
  const dueDate = status?.dueDate ? new Date(status.dueDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }) : "Not set";
  const eventType = String(params.eventType ?? "").toLowerCase();
  const entryCategory = String(params.entryCategory ?? "").trim();
  const entryAmount = Number(params.entryAmount ?? 0);
  const txAmount = Number.isFinite(entryAmount) && entryAmount > 0 ? entryAmount : 0;
  const totalBeforePayment = txAmount + remainingBalance;
  const paidPct =
    eventType === "payment" && totalBeforePayment > 0
      ? Math.max(0, Math.min(100, Math.round((txAmount / totalBeforePayment) * 100)))
      : 0;
  const title =
    eventType === "payment"
      ? "Payment Received"
      : eventType === "charge"
        ? "Outstanding Payment Notice"
        : "Account Update";
  const statusLine =
    eventType === "payment"
      ? "Paid successfully"
      : eventType === "charge"
        ? entryCategory
          ? `You have been charged against ${entryCategory}.`
          : "A new outstanding amount has been added to your account."
        : "Updated successfully";

  const formatPKR = (value: number) =>
    `PKR ${Math.round(Number(value || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>{"\u2705"} {title}</Text>

        <Text style={styles.amount}>{formatPKR(txAmount)}</Text>
        <Text style={styles.status}>{statusLine}</Text>

        <View style={styles.divider} />

        <Text style={styles.label}>Remaining Balance</Text>
        <Text style={styles.remaining}>{formatPKR(remainingBalance)}</Text>

        <Text style={styles.dueDate}>Due Date: {dueDate}</Text>

        {eventType === "payment" ? (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${paidPct}%` }]} />
            </View>
            <Text style={styles.progressText}>{paidPct}% Paid</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4f6f8",
    padding: 16,
    justifyContent: "flex-start",
    paddingTop: 16,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  amount: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  status: {
    fontSize: typography.bodySize,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  label: {
    fontSize: typography.smallSize,
    color: colors.textMuted,
    marginBottom: 4,
  },
  remaining: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.error,
    marginBottom: 14,
  },
  dueDate: {
    fontSize: typography.bodySize,
    color: colors.textPrimary,
    marginBottom: 14,
  },
  progressWrap: {
    marginBottom: 16,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: typography.smallSize,
    color: colors.textSecondary,
    fontWeight: "600",
  },
});
