import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../lib/auth-context";
import { SafeGradient } from "../lib/safe-gradient";
import { colors } from "../lib/theme";

const logoSource = require("../assets/logo.png");

export default function Pending() {
  const [logoError, setLogoError] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <SafeGradient style={styles.gradient}>
      <View style={styles.container}>
        {!logoError ? (
          <Image source={logoSource} style={styles.logo} resizeMode="contain" onError={() => setLogoError(true)} />
        ) : (
          <Text style={styles.logoFallback}>FGEHA</Text>
        )}
        <Text style={styles.title}>Account pending</Text>
        <Text style={styles.message}>
          Your account is being set up. Please try again shortly.
        </Text>
        {user && <Text style={styles.email}>{user.email}</Text>}
        <TouchableOpacity
          style={styles.button}
          onPress={async () => {
            await logout();
            router.replace("/login");
          }}
        >
          <Text style={styles.buttonText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, justifyContent: "center", padding: 24, alignItems: "center" },
  logo: { width: 140, height: 70, marginBottom: 24 },
  logoFallback: { fontSize: 24, fontWeight: "700", color: colors.textOnGradient, letterSpacing: 2, marginBottom: 24 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16, textAlign: "center", color: colors.textOnGradient },
  message: { fontSize: 16, color: "rgba(255,255,255,0.95)", textAlign: "center", marginBottom: 24 },
  email: { fontSize: 14, color: "rgba(255,255,255,0.8)", textAlign: "center", marginBottom: 32 },
  button: { backgroundColor: "rgba(255,255,255,0.95)", padding: 16, borderRadius: 10, minWidth: 160, alignItems: "center" },
  buttonText: { color: colors.primary, fontSize: 16, fontWeight: "600" },
});
