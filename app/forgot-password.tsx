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
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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

type Step = "email" | "code-and-password";

export default function ForgotPassword() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const router = useRouter();
  const { showError, showSuccess } = useAppAlert();

  const baseUrl = (API_URL ?? "").replace(/\/+$/, "");

  const handleSendCode = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showError("Please enter your email address.");
      return;
    }
    setSendLoading(true);
    try {
      const res = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? "Could not send reset code.");
      }
      showSuccess("If this email is registered, a reset code has been sent. Check your inbox.");
      setStep("code-and-password");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Could not send code. Try again later.", "Send code");
    } finally {
      setSendLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const trimmedEmail = email.trim();
    const trimmedCode = code.replace(/\D/g, "").slice(0, 6);
    if (!trimmedEmail) {
      showError("Email is missing. Please start over from the login screen.");
      return;
    }
    if (trimmedCode.length !== 6) {
      showError("Please enter the 6-digit code from your email.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          code: trimmedCode,
          newPassword,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? "Could not reset password.");
      }
      showSuccess("Password has been reset. You can now sign in.", () => router.replace("/login"));
    } catch (e) {
      showError(e instanceof Error ? e.message : "Could not reset password. Please check the code and try again.", "Reset password");
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.headerTitle}>
          {step === "email" ? "Forgot password?" : "Set new password"}
        </Text>
        <Text style={styles.headerSubtitle}>
          {step === "email"
            ? "Enter your email and we'll send you a code"
            : "Enter the code and your new password"}
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, cardShadow]}>
          {step === "email" ? (
            <>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!sendLoading}
              />
              <TouchableOpacity
                style={[styles.button, sendLoading && styles.buttonDisabled]}
                onPress={handleSendCode}
                disabled={sendLoading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[...gradientColors]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {sendLoading ? (
                    <ActivityIndicator size="small" color={colors.textOnGradient} />
                  ) : (
                    <Text style={styles.buttonText}>Send code</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.hint}>Code sent to</Text>
              <Text style={styles.emailDisplay}>{email.trim()}</Text>
              <Text style={styles.label}>Verification code</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                value={code}
                onChangeText={(text) => setCode(text.replace(/\D/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
              />
              <Text style={styles.label}>New password</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={[styles.input, styles.inputWithIcon]}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.textMuted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowNewPassword((p) => !p)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.label}>Confirm password</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={[styles.input, styles.inputWithIcon]}
                  placeholder="Repeat new password"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword((p) => !p)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleResetPassword}
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
                    <Text style={styles.buttonText}>Change password</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.backWrap}
                onPress={() => setStep("email")}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.backText}>Use a different email</Text>
              </TouchableOpacity>
            </>
          )}
          <Link href="/login" asChild>
            <TouchableOpacity style={styles.link} activeOpacity={0.7}>
              <Text style={styles.linkText}>Back to Sign in</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  scroll: { flex: 1 },
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
  headerSubtitle: {
    fontSize: typography.subtitleSize ?? 14,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 24,
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
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
    marginBottom: 6,
    color: colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: typography.bodySize,
    marginBottom: 16,
    backgroundColor: "#fafafa",
    color: colors.textPrimary,
  },
  inputWithIcon: { marginBottom: 0, paddingRight: 44 },
  passwordWrap: {
    position: "relative",
    marginBottom: 16,
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingVertical: 4,
  },
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: "center",
  },
  button: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 8,
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
  buttonText: {
    color: colors.textOnGradient,
    fontSize: typography.bodySize,
    fontWeight: "700",
  },
  backWrap: { alignItems: "center", paddingVertical: 12 },
  backText: { color: colors.primary, fontSize: typography.smallSize, fontWeight: "600" },
  link: { alignItems: "center", paddingVertical: 8, marginTop: 8 },
  linkText: { color: colors.primary, fontSize: typography.smallSize, fontWeight: "600" },
});
