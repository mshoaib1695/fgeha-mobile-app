import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../lib/auth-context";
import { useAppAlert } from "../../../lib/alert-context";
import { apiGet, apiPost } from "../../../lib/api";
import { colors, gradientColors } from "../../../lib/theme";
import * as Location from "expo-location";

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldGroupTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function CreateRequestFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { showSuccess, showError } = useAppAlert();
  const requestTypeId = id ? parseInt(id, 10) : null;

  const [requestTypeName, setRequestTypeName] = useState("");
  const [name, setName] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [streetNo, setStreetNo] = useState("");
  const [subSectorId, setSubSectorId] = useState<number | null>(null);
  const [subSectors, setSubSectors] = useState<{ id: number; name: string; code: string }[]>([]);
  const [sectorPickerOpen, setSectorPickerOpen] = useState(false);
  const [locationText, setLocationText] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    refreshUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    setName(user.fullName ?? "");
    setPhoneCountryCode(user.phoneCountryCode ?? "");
    setPhoneNumber(user.phoneNumber ?? "");
    setHouseNo(user.houseNo ?? "");
    setStreetNo(user.streetNo ?? "");
    if (user.subSectorId != null) setSubSectorId(user.subSectorId);
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!requestTypeId || isNaN(requestTypeId)) return;
      try {
        const types = await apiGet<{ id: number; name: string }[]>("/request-types");
        const found = Array.isArray(types) ? types.find((t) => t.id === requestTypeId) : null;
        if (!cancelled && found) setRequestTypeName(found.name);
      } catch {
        if (!cancelled) setRequestTypeName("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestTypeId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await apiGet<{ id: number; name: string; code: string }[]>("/users/sub-sectors");
        if (!cancelled && Array.isArray(list)) setSubSectors(list);
      } catch {
        if (!cancelled) setSubSectors([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== "granted") {
          setLocationError("Location permission denied");
          setLoadingLocation(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          const coords = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          };
          setLocation(coords);
          setLocationText(`${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`);
          setLocationError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setLocationError(e instanceof Error ? e.message : "Could not get location");
        }
      } finally {
        if (!cancelled) setLoadingLocation(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async () => {
    if (requestTypeId == null || isNaN(requestTypeId)) {
      showError("Invalid request type. Please go back and choose a request type again.");
      return;
    }
    const h = houseNo.trim();
    const s = streetNo.trim();
    if (!h) {
      showError("Please enter the house or unit number for this request.");
      return;
    }
    if (!s) {
      showError("Please enter the street number for this request.");
      return;
    }
    if (subSectorId == null) {
      showError("Please select a sub-sector from the list for this request.");
      return;
    }
    const trimmed = description.trim();
    setSubmitting(true);
    try {
      await apiPost("/requests", {
        requestTypeId,
        houseNo: h,
        streetNo: s,
        subSectorId,
        ...(trimmed ? { description: trimmed } : {}),
      });
      showSuccess("Your request has been submitted. We'll process it as soon as possible.", () =>
        router.back()
      );
    } catch (e) {
      showError((e as Error).message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (requestTypeId == null || isNaN(requestTypeId)) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Invalid request type.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <LinearGradient colors={[...gradientColors]} style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={2}>
          {requestTypeName || "New request"}
        </Text>
        <Text style={styles.headerSubtitle}>Fill in the details below</Text>
      </LinearGradient>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <FieldGroup title="Your details">
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textMuted}
              editable={!submitting}
            />
            <Text style={styles.label}>Phone</Text>
            <View style={styles.phoneRow}>
              <TextInput
                style={[styles.input, styles.phoneCode]}
                value={phoneCountryCode}
                onChangeText={setPhoneCountryCode}
                placeholder="+92"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                editable={!submitting}
              />
              <TextInput
                style={[styles.input, styles.phoneNumber]}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Phone number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                editable={!submitting}
              />
            </View>
          </FieldGroup>

          <FieldGroup title="Address">
            <Text style={styles.label}>House no</Text>
            <TextInput
              style={styles.input}
              value={houseNo}
              onChangeText={setHouseNo}
              placeholder="House / unit number"
              placeholderTextColor={colors.textMuted}
              editable={!submitting}
            />
            <Text style={styles.label}>Street no</Text>
            <TextInput
              style={styles.input}
              value={streetNo}
              onChangeText={setStreetNo}
              placeholder="Street number"
              placeholderTextColor={colors.textMuted}
              editable={!submitting}
            />
            <Text style={styles.label}>Sub-sector</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => !submitting && setSectorPickerOpen(true)}
              disabled={submitting}
            >
              <Text style={subSectorId != null ? styles.pickerText : styles.pickerPlaceholder}>
                {subSectorId != null
                  ? subSectors.find((x) => x.id === subSectorId)?.name ?? `Sector #${subSectorId}`
                  : "Select sub-sector (for this request)"}
              </Text>
            </TouchableOpacity>
            <Modal
              visible={sectorPickerOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setSectorPickerOpen(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setSectorPickerOpen(false)}
              >
                <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                  <Text style={styles.modalTitle}>Select sub-sector</Text>
                  <FlatList
                    data={subSectors}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.modalOption}
                        onPress={() => {
                          setSubSectorId(item.id);
                          setSectorPickerOpen(false);
                        }}
                      >
                        <Text style={styles.modalOptionText}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                  />
                  <TouchableOpacity
                    style={styles.modalCancel}
                    onPress={() => setSectorPickerOpen(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>
          </FieldGroup>

          <FieldGroup title="Location & notes">
            <Text style={styles.label}>Location</Text>
            {loadingLocation ? (
              <View style={styles.locationLoaderWrap}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.locationLoaderText}>Getting your location…</Text>
              </View>
            ) : (
              <TextInput
                style={styles.input}
                value={locationText}
                onChangeText={setLocationText}
                placeholder="Latitude, longitude or address"
                placeholderTextColor={colors.textMuted}
                editable={!submitting}
              />
            )}
            {locationError && !loadingLocation ? (
              <Text style={styles.locationError}>{locationError}</Text>
            ) : null}
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.description]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add any details about your request…"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!submitting}
            />
          </FieldGroup>
        </View>

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[...gradientColors]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            {submitting ? (
              <ActivityIndicator color={colors.textOnGradient} />
            ) : (
              <Text style={styles.buttonText}>Submit request</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>← Back to request types</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
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
  scrollContent: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  fieldGroup: { marginBottom: 24 },
  fieldGroupTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: 14,
    textTransform: "uppercase",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    color: colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 14,
    backgroundColor: "#fafafa",
    color: colors.textPrimary,
  },
  pickerText: { fontSize: 16, color: colors.textSecondary },
  pickerPlaceholder: { fontSize: 16, color: colors.textMuted },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    maxHeight: "70%",
    paddingVertical: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modalOption: { paddingVertical: 14, paddingHorizontal: 16 },
  modalOptionText: { fontSize: 16, color: colors.textSecondary },
  modalCancel: { paddingVertical: 14, paddingHorizontal: 16, marginTop: 8, alignItems: "center" },
  modalCancelText: { fontSize: 16, fontWeight: "600", color: colors.primary },
  phoneRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  phoneCode: { width: 90 },
  phoneNumber: { flex: 1 },
  description: { minHeight: 100, paddingTop: 14 },
  locationLoaderWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    backgroundColor: "#f0f9eb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(106, 176, 76, 0.3)",
  },
  locationLoaderText: { fontSize: 14, color: colors.textSecondary },
  locationError: { fontSize: 13, color: colors.error, marginBottom: 14 },
  button: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: colors.textOnGradient, fontSize: 17, fontWeight: "700" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  errorText: { fontSize: 16, color: colors.textSecondary, marginBottom: 16 },
  backBtn: { alignItems: "center", paddingVertical: 12 },
  backBtnText: { color: colors.primary, fontSize: 15, fontWeight: "600" },
});
