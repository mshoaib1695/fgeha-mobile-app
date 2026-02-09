import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../lib/auth-context";
import { useAppAlert } from "../lib/alert-context";
import { apiGet, API_URL } from "../lib/api";
import { colors, gradientColors, typography } from "../lib/theme";

const logoSource = require("../assets/logo.png");

interface SubSector {
  id: number;
  name: string;
  code: string;
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

export default function Register() {
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+92");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [streetNo, setStreetNo] = useState("");
  const [subSectorId, setSubSectorId] = useState<number | null>(null);
  const [subSectors, setSubSectors] = useState<SubSector[]>([]);
  const [idCardFront, setIdCardFront] = useState<string | null>(null);
  const [idCardBack, setIdCardBack] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSectors, setLoadingSectors] = useState(true);
  const [sectorsError, setSectorsError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const { register } = useAuth();
  const router = useRouter();
  const { showSuccess, showError, showInfo } = useAppAlert();

  const pickImage = async (side: "front" | "back") => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showInfo("Permission needed", "Allow access to your photos to upload your ID card image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    const asset = result.assets[0];
    const mime = asset.mimeType ?? "image/jpeg";
    const dataUrl = `data:${mime};base64,${asset.base64}`;
    if (side === "front") setIdCardFront(dataUrl);
    else setIdCardBack(dataUrl);
  };

  const loadSubSectors = async () => {
    setLoadingSectors(true);
    setSectorsError(null);
    try {
      const list = await apiGet<SubSector[]>("/users/sub-sectors");
      const items = Array.isArray(list) ? list : [];
      setSubSectors(items);
      if (items.length) setSubSectorId(items[0].id);
      else setSubSectorId(null);
    } catch (e) {
      setSubSectors([]);
      setSubSectorId(null);
      setSectorsError(e instanceof Error ? e.message : "Could not load sub-sectors");
    } finally {
      setLoadingSectors(false);
    }
  };

  useEffect(() => {
    loadSubSectors();
  }, []);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password || !phoneNumber.trim() || !houseNo.trim() || !streetNo.trim()) {
      showError("Please fill in all required fields.");
      return;
    }
    if (subSectorId == null) {
      showError("Please select a sub-sector from the list.");
      return;
    }
    if (!idCardFront) {
      showError("Please add a photo of the front of your ID card.");
      return;
    }
    if (!idCardBack) {
      showError("Please add a photo of the back of your ID card.");
      return;
    }
    if (password.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phoneCountryCode: phoneCountryCode.trim() || "+92",
        phoneNumber: phoneNumber.trim(),
        houseNo: houseNo.trim(),
        streetNo: streetNo.trim(),
        subSectorId,
        idCardFront,
        idCardBack,
      });
      showSuccess("Registration complete. Wait for admin approval, then sign in.", () =>
        router.replace("/login")
      );
    } catch (e) {
      showError(e instanceof Error ? e.message : "Please try again.", "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (loadingSectors) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[...gradientColors]} style={[styles.header, { paddingTop: insets.top + 24 }]}>
          <View style={styles.logoWrap}>
            {!logoError ? (
              <Image source={logoSource} style={styles.logo} resizeMode="contain" onError={() => setLogoError(true)} />
            ) : (
              <Text style={styles.logoFallback}>FGEHA</Text>
            )}
          </View>
          <Text style={styles.headerTitle}>Register</Text>
          <Text style={styles.headerSubtitle}>Create your account</Text>
        </LinearGradient>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingLabel}>Loading…</Text>
        </View>
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
        style={[styles.header, { paddingTop: insets.top + 24 }]}
      >
        <View style={styles.logoWrap}>
          {!logoError ? (
            <Image source={logoSource} style={styles.logo} resizeMode="contain" onError={() => setLogoError(true)} />
          ) : (
            <Text style={styles.logoFallback}>FGEHA</Text>
          )}
        </View>
        <Text style={styles.headerTitle}>Register</Text>
        <Text style={styles.headerSubtitle}>Create your account</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.sectionTitle}>Your details</Text>
          <Text style={styles.label}>Full name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor={colors.textMuted}
            value={fullName}
            onChangeText={setFullName}
            editable={!loading}
          />
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />
          <Text style={styles.label}>Password (min 6 characters) *</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <Text style={styles.label}>Phone *</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.phoneCode]}
              placeholder="+92"
              placeholderTextColor={colors.textMuted}
              value={phoneCountryCode}
              onChangeText={setPhoneCountryCode}
              keyboardType="phone-pad"
              editable={!loading}
            />
            <TextInput
              style={[styles.input, styles.phoneNum]}
              placeholder="Phone number"
              placeholderTextColor={colors.textMuted}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          <Text style={styles.sectionTitle}>Address</Text>
          <Text style={styles.label}>House no *</Text>
          <TextInput
            style={styles.input}
            placeholder="House / unit number"
            placeholderTextColor={colors.textMuted}
            value={houseNo}
            onChangeText={setHouseNo}
            editable={!loading}
          />
          <Text style={styles.label}>Street no *</Text>
          <TextInput
            style={styles.input}
            placeholder="Street number"
            placeholderTextColor={colors.textMuted}
            value={streetNo}
            onChangeText={setStreetNo}
            editable={!loading}
          />

          <Text style={styles.label}>Location (sub-sector) *</Text>
          {sectorsError ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>{sectorsError}</Text>
              <Text style={styles.errorSubtext}>API: {API_URL}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadSubSectors} disabled={loadingSectors}>
                <Text style={styles.retryButtonText}>{loadingSectors ? "Loading…" : "Retry"}</Text>
              </TouchableOpacity>
            </View>
          ) : subSectors.length === 0 ? (
            <Text style={styles.errorText}>No sub-sectors available.</Text>
          ) : (
            <TextInput
              style={[styles.input, styles.inputReadOnly]}
              value={subSectorId != null ? subSectors.find((s) => s.id === subSectorId)?.name ?? "" : ""}
              placeholder="Sub-sector"
              placeholderTextColor={colors.textMuted}
              editable={false}
            />
          )}

          <Text style={styles.sectionTitle}>ID card photos (required)</Text>
          <Text style={styles.hint}>Add front and back of your ID card.</Text>
          <Text style={styles.label}>ID card front *</Text>
          <TouchableOpacity style={styles.imageButton} onPress={() => pickImage("front")} disabled={loading}>
            {idCardFront ? (
              <Image source={{ uri: idCardFront }} style={styles.imagePreview} resizeMode="cover" />
            ) : (
              <Text style={styles.imageButtonText}>Tap to add ID card front</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.label}>ID card back *</Text>
          <TouchableOpacity style={styles.imageButton} onPress={() => pickImage("back")} disabled={loading}>
            {idCardBack ? (
              <Image source={{ uri: idCardBack }} style={styles.imagePreview} resizeMode="cover" />
            ) : (
              <Text style={styles.imageButtonText}>Tap to add ID card back</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[...gradientColors]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>{loading ? "Registering…" : "Register"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Link href="/login" asChild>
          <TouchableOpacity style={styles.link} activeOpacity={0.7}>
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
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
  logoWrap: { alignItems: "center", marginBottom: 12 },
  logo: { width: 100, height: 50 },
  logoFallback: { fontSize: 24, fontWeight: "700", color: colors.textOnGradient, letterSpacing: 2 },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textOnGradient,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  headerSubtitle: { fontSize: typography.subtitleSize, color: "rgba(255,255,255,0.9)" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 24 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  loadingLabel: { fontSize: typography.bodySize, color: colors.textSecondary, marginTop: 12 },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: typography.smallSize,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  label: {
    fontSize: typography.smallSize,
    fontWeight: "600",
    marginBottom: 6,
    color: colors.textSecondary,
  },
  hint: {
    fontSize: typography.smallSize,
    color: colors.textMuted,
    marginBottom: 12,
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
  inputReadOnly: { backgroundColor: colors.border + "20", color: colors.textSecondary },
  row: { flexDirection: "row", gap: 10 },
  phoneCode: { width: 90 },
  phoneNum: { flex: 1 },
  errorWrap: { marginBottom: 16 },
  errorText: { fontSize: typography.smallSize, color: colors.error, marginBottom: 4 },
  errorSubtext: { fontSize: typography.smallSize, color: colors.textMuted, marginBottom: 8 },
  retryButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.border,
    borderRadius: 10,
  },
  retryButtonText: { fontSize: typography.smallSize, color: colors.textPrimary, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fafafa",
  },
  chipSelected: { backgroundColor: "rgba(13, 148, 136, 0.15)", borderColor: colors.primary },
  chipText: { fontSize: typography.smallSize, color: colors.textSecondary },
  chipTextSelected: { color: colors.primary, fontWeight: "600" },
  imageButton: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  imageButtonText: { fontSize: typography.smallSize, color: colors.textMuted },
  imagePreview: { width: "100%", height: 120 },
  button: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 16,
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
  buttonText: { color: colors.textOnGradient, fontSize: typography.bodySize, fontWeight: "700" },
  link: { alignItems: "center", paddingVertical: 16 },
  linkText: { color: colors.primary, fontSize: typography.smallSize, fontWeight: "600" },
});
