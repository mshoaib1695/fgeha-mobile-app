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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, Link } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../lib/auth-context";
import { useAppAlert } from "../lib/alert-context";
import { apiGet, API_URL } from "../lib/api";
import { colors, gradientColors } from "../lib/theme";

const logoSource = require("../assets/logo.png");

interface SubSector {
  id: number;
  name: string;
  code: string;
}

export default function Register() {
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      <LinearGradient colors={[...gradientColors]} style={styles.gradient}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.textOnGradient} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[...gradientColors]} style={styles.gradient}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.logoWrap}>
          {!logoError ? (
            <Image source={logoSource} style={styles.logo} resizeMode="contain" onError={() => setLogoError(true)} />
          ) : (
            <Text style={styles.logoFallback}>FGEHA</Text>
          )}
        </View>
      <Text style={styles.title}>Register</Text>
      <TextInput style={styles.input} placeholder="Full name *" placeholderTextColor={colors.textMuted} value={fullName} onChangeText={setFullName} editable={!loading} />
      <TextInput style={styles.input} placeholder="Email *" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" editable={!loading} />
      <TextInput style={styles.input} placeholder="Password (min 6) *" placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry editable={!loading} />
      <View style={styles.row}>
        <TextInput style={[styles.input, styles.phoneCode]} placeholder="+92" placeholderTextColor={colors.textMuted} value={phoneCountryCode} onChangeText={setPhoneCountryCode} editable={!loading} />
        <TextInput style={[styles.input, styles.phoneNum]} placeholder="Phone number *" placeholderTextColor={colors.textMuted} value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" editable={!loading} />
      </View>
      <TextInput style={styles.input} placeholder="House no *" placeholderTextColor={colors.textMuted} value={houseNo} onChangeText={setHouseNo} editable={!loading} />
      <TextInput style={styles.input} placeholder="Street no *" placeholderTextColor={colors.textMuted} value={streetNo} onChangeText={setStreetNo} editable={!loading} />
      <Text style={styles.label}>Sub-sector *</Text>
      <View style={styles.sectorWrap}>
        {sectorsError ? (
          <>
            <Text style={styles.errorText}>{sectorsError}</Text>
            <Text style={styles.errorSubtext}>Using: {API_URL}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadSubSectors} disabled={loadingSectors}>
              <Text style={styles.retryButtonText}>{loadingSectors ? "Loading…" : "Retry"}</Text>
            </TouchableOpacity>
          </>
        ) : subSectors.length === 0 && !loadingSectors ? (
          <Text style={styles.errorText}>No sub-sectors available.</Text>
        ) : (
          <View style={styles.sectorRow}>
            {subSectors.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.chip, subSectorId === s.id && styles.chipSelected]}
                onPress={() => setSubSectorId(s.id)}
                disabled={loading}
              >
                <Text style={[styles.chipText, subSectorId === s.id && styles.chipTextSelected]}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      <View style={styles.idCardSection}>
        <Text style={styles.idCardSectionTitle}>ID card photos (required)</Text>
        <Text style={styles.idCardSectionHint}>Scroll down if needed. Add front and back of your ID.</Text>
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
      </View>
      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Registering…" : "Register"}</Text>
      </TouchableOpacity>
      <Link href="/login" asChild>
        <TouchableOpacity style={styles.link}>
          <Text style={styles.linkText}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </Link>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  logoWrap: { alignItems: "center", marginBottom: 16 },
  logo: { width: 120, height: 56 },
  logoFallback: { fontSize: 22, fontWeight: "700", color: colors.textOnGradient, letterSpacing: 2 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 24, textAlign: "center", color: colors.textOnGradient },
  input: { borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 16, backgroundColor: colors.cardBg, color: colors.textPrimary },
  row: { flexDirection: "row", gap: 8 },
  phoneCode: { width: 80 },
  phoneNum: { flex: 1 },
  label: { fontSize: 14, marginBottom: 8, color: colors.textOnGradient },
  sectorWrap: { minHeight: 48, marginBottom: 16 },
  sectorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  errorText: { fontSize: 14, color: colors.error, marginBottom: 4 },
  errorSubtext: { fontSize: 12, color: "rgba(255,255,255,0.9)", marginBottom: 8 },
  retryButton: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 8 },
  retryButtonText: { fontSize: 14, color: colors.textOnGradient, fontWeight: "600" },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.6)" },
  chipSelected: { backgroundColor: "rgba(255,255,255,0.95)", borderColor: "rgba(255,255,255,0.95)" },
  chipText: { fontSize: 14, color: colors.textOnGradient },
  chipTextSelected: { color: colors.primary, fontWeight: "600" },
  idCardSection: { marginTop: 8, marginBottom: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.4)" },
  idCardSectionTitle: { fontSize: 18, fontWeight: "600", color: colors.textOnGradient, marginBottom: 4 },
  idCardSectionHint: { fontSize: 13, color: "rgba(255,255,255,0.9)", marginBottom: 12 },
  imageButton: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    borderRadius: 10,
    marginBottom: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageButtonText: { fontSize: 14, color: "rgba(255,255,255,0.9)" },
  imagePreview: { width: "100%", height: 120 },
  button: { backgroundColor: "rgba(255,255,255,0.95)", padding: 14, borderRadius: 10, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.primary, fontSize: 16, fontWeight: "600" },
  link: { marginTop: 20, alignItems: "center" },
  linkText: { color: colors.textOnGradient, fontSize: 14, fontWeight: "600" },
});
