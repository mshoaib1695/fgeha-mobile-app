import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams, Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppAlert } from "../lib/alert-context";
import { API_URL } from "../lib/api";
import { colors, gradientColors, typography } from "../lib/theme";

const logoSource = require("../assets/logo.png");

const cardShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: { elevation: 4 },
});

export default function VerifyEmail() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = (params.email ?? "").trim();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const router = useRouter();
  const { showError, showSuccess } = useAppAlert();

  const handleVerify = async () => {
    const trimmedCode = code.replace(/\D/g, "").slice(0, 6);
    if (!email) {
      showError("Missing email. Please go back and register again.");
      return;
    }
    if (trimmedCode.length !== 6) {
      showError("Please enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    try {
      const base = (API_URL ?? "").replace(/\/+$/, "");
      const res = await fetch(`${base}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, code: trimmedCode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = (data as { message?: string }).message ?? "Invalid or expired code.";
        throw new Error(msg);
      }
      showSuccess("Email verified. You can now sign in.", () => router.replace("/login"));
    } catch (e) {
      showError(e instanceof Error ? e.message : "Verification failed. Please check the code and try again.", "Verify email");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email || resendLoading || loading) return;
    setResendLoading(true);
    try {
      const base = (API_URL ?? "").replace(/\/+$/, "");
      const res = await fetch(`${base}/auth/resend-verification-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? "Could not resend code.");
      }
      showSuccess("A new verification code has been sent to your email.");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Could not resend code. Try again later.", "Resend code");
    } finally {
      setResendLoading(false);
    }
  };

  if (!email) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.message}>No email provided. Please complete registration first.</Text>
        <Link href="/register" asChild>
          <TouchableOpacity style={styles.linkBtn} activeOpacity={0.7}>
            <Text style={styles.linkBtnText}>Go to Register</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/login" asChild>
          <TouchableOpacity style={styles.linkBtn} activeOpacity={0.7}>
            <Text style={styles.linkBtnText}>Back to Sign in</Text>
          </TouchableOpacity>
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <LinearGradient
        colors={[...gradientColors]}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.logoWrap}>
          {!logoError ? (
            <Image
              source={logoSource}
              style={styles.logo}
              resizeMode="contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <Text style={styles.logoFallback}>FGEHA</Text>
          )}
        </View>
        <Text style={styles.headerTitle}>Verify your email</Text>
        <Text style={styles.headerSubtitle}>Enter the 6-digit code we sent to you</Text>
      </LinearGradient>

      <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.hint}>We sent a verification code to</Text>
          <Text style={styles.emailDisplay}>{email}</Text>
          <Text style={styles.label}>Verification code</Text>
          <TextInput
            style={styles.input}
            placeholder="000000"
            placeholderTextColor={colors.textMuted}
            value={code}
            onChangeText={(text) => setCode(text.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[...gradientColors]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.textOnGradient} />
              ) : (
                <Text style={styles.buttonText}>Verify & sign in</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.resendWrap}
            onPress={handleResendCode}
            disabled={resendLoading || loading}
            activeOpacity={0.7}
          >
            {resendLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.resendText}>Didn't get the email? Resend code</Text>
            )}
          </TouchableOpacity>
          <Link href="/login" asChild>
            <TouchableOpacity style={styles.link} activeOpacity={0.7}>
              <Text style={styles.linkText}>Back to Sign in</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centered: { justifyContent: "center", padding: 24 },
  header: {
    paddingBottom: 24,
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
  logoWrap: {
    backgroundColor: colors.cardBg,
    borderRadius: 9999,
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    padding: 10,
  },
  logo: { width: 56, height: 56 },
  logoFallback: { fontSize: 20, fontWeight: "700", color: colors.textOnGradient, letterSpacing: 2 },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textOnGradient,
    marginBottom: 4,
  },
  headerSubtitle: { fontSize: typography.subtitleSize ?? 14, color: "rgba(255,255,255,0.9)" },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 24,
  },
  hint: { fontSize: typography.smallSize, color: colors.textSecondary, marginBottom: 4 },
  emailDisplay: {
    fontSize: typography.bodySize,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: 20,
  },
  label: {
    fontSize: typography.smallSize,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    letterSpacing: 8,
    marginBottom: 20,
    backgroundColor: "#fafafa",
    color: colors.textPrimary,
    textAlign: "center",
  },
  button: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  buttonDisabled: { opacity: 0.7 },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: colors.textOnGradient, fontSize: typography.bodySize, fontWeight: "700" },
  resendWrap: { alignItems: "center", paddingVertical: 12 },
  resendText: { color: colors.primary, fontSize: typography.smallSize, fontWeight: "600" },
  link: { alignItems: "center", paddingVertical: 8 },
  linkText: { color: colors.primary, fontSize: typography.smallSize, fontWeight: "600" },
  message: { fontSize: typography.bodySize, color: colors.textSecondary, textAlign: "center", marginBottom: 16 },
  linkBtn: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  linkBtnText: { color: colors.primary, fontSize: typography.bodySize, fontWeight: "600" },
});
