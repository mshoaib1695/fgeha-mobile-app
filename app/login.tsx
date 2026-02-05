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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, Link } from "expo-router";
import { useAuth } from "../lib/auth-context";
import { useAppAlert } from "../lib/alert-context";
import { colors, gradientColors } from "../lib/theme";

const logoSource = require("../assets/logo.png");

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { showError } = useAppAlert();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showError("Please enter your email and password to sign in.");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Please check your details and try again.", "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[...gradientColors]} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
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
        <View style={styles.form}>
          <Text style={styles.title}>Sign in</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? "Signing in…" : "Sign in"}</Text>
          </TouchableOpacity>
          <Link href="/register" asChild>
            <TouchableOpacity style={styles.link}>
              <Text style={styles.linkText}>Don't have an account? Register</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  logoWrap: { alignItems: "center", marginBottom: 28 },
  logo: { width: 160, height: 80 },
  logoFallback: { fontSize: 28, fontWeight: "700", color: colors.textOnGradient, letterSpacing: 2 },
  form: { maxWidth: 400, width: "100%", alignSelf: "center", backgroundColor: colors.cardBg, borderRadius: 16, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20, textAlign: "center", color: colors.textPrimary },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    fontSize: 16,
    backgroundColor: colors.inputBg,
  },
  button: { backgroundColor: colors.primary, padding: 16, borderRadius: 10, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.textOnGradient, fontSize: 16, fontWeight: "600" },
  link: { marginTop: 18, alignItems: "center" },
  linkText: { color: colors.primary, fontSize: 14, fontWeight: "500" },
});
