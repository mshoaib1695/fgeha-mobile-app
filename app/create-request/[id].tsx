import { useState, useEffect, useRef } from "react";
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
  Image,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth-context";
import { useAppAlert } from "../../lib/alert-context";
import { apiGet, apiPostForm, API_URL, unwrapList } from "../../lib/api";
import { colors, gradientColors, tabScreenPaddingBottom, typography } from "../../lib/theme";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldGroupTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ReadOnlyDetail({
  label,
  value,
  icon,
  fullWidth = false,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  fullWidth?: boolean;
}) {
  return (
    <View style={[styles.readOnlyDetail, fullWidth && styles.readOnlyDetailFull]}>
      <View style={styles.readOnlyIconWrap}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.readOnlyTextWrap}>
        <Text style={styles.readOnlyDetailLabel}>{label}</Text>
        <Text style={styles.readOnlyDetailValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function CreateRequestFormScreen() {
  const { id, optionId } = useLocalSearchParams<{ id: string; optionId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshUser, isLoading: authLoading } = useAuth();
  const { showSuccess, showError } = useAppAlert();
  const requestTypeId = id ? parseInt(id, 10) : null;
  const paddingBottom = tabScreenPaddingBottom(insets.bottom);

  const [requestTypeName, setRequestTypeName] = useState("");
  const [serviceOptionLabel, setServiceOptionLabel] = useState<string | null>(null);
  const [serviceOptionImageUrl, setServiceOptionImageUrl] = useState<string | null>(null);
  const [issueImageRequirement, setIssueImageRequirement] = useState<"none" | "optional" | "required">("optional");
  const [issueImage, setIssueImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [name, setName] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [streetNo, setStreetNo] = useState("");
  const [subSectorId, setSubSectorId] = useState<number | null>(null);
  const [locationText, setLocationText] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const userSyncedRef = useRef(false);
  const refreshAttemptedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      userSyncedRef.current = false;
      return;
    }
    if (userSyncedRef.current) return;
    userSyncedRef.current = true;
    setName(user.fullName ?? "");
    setPhoneCountryCode(user.phoneCountryCode ?? "");
    setPhoneNumber(user.phoneNumber ?? "");
    setHouseNo(user.houseNo ?? "");
    setStreetNo(user.streetNo ?? "");
    if (user.subSectorId != null) setSubSectorId(user.subSectorId);
  }, [user]);

  useEffect(() => {
    // Only refresh if auth is not loading, user is null, and we haven't attempted refresh yet
    if (!authLoading && !user && !refreshAttemptedRef.current) {
      refreshAttemptedRef.current = true;
      refreshUser().catch(() => {
        // Reset on error so we can retry if needed
        refreshAttemptedRef.current = false;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!requestTypeId || isNaN(requestTypeId)) return;
      try {
        const raw = await apiGet<unknown>("/request-types");
        const types = unwrapList<{ id: number; name: string }>(raw);
        const found = types.find((t) => t.id === requestTypeId) ?? null;
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
      const oid = optionId ? parseInt(optionId, 10) : null;
      if (!oid || isNaN(oid)) {
        if (!cancelled) setServiceOptionLabel(null);
        if (!cancelled) setServiceOptionImageUrl(null);
        if (!cancelled) setIssueImageRequirement("optional");
        if (!cancelled) setImagePreviewOpen(false);
        return;
      }
      try {
        const opt = await apiGet<{
          id: number;
          label: string;
          imageUrl?: string | null;
          config?: { issueImage?: "none" | "optional" | "required" } | null;
        }>(`/request-type-options/${oid}`);
        if (!cancelled) {
          if (opt?.label) setServiceOptionLabel(opt.label);
          setServiceOptionImageUrl(opt?.imageUrl?.trim() ? opt.imageUrl ?? null : null);
          const req = opt?.config?.issueImage;
          if (req === "none" || req === "optional" || req === "required") {
            setIssueImageRequirement(req);
            if (req === "none") setIssueImage(null);
          } else {
            setIssueImageRequirement("optional");
          }
        }
      } catch {
        if (!cancelled) {
          setServiceOptionLabel(null);
          setServiceOptionImageUrl(null);
          setIssueImageRequirement("optional");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [optionId]);

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
      showError("Your house number is missing. Update your profile details before submitting.");
      return;
    }
    if (!s) {
      showError("Your street number is missing. Update your profile details before submitting.");
      return;
    }
    if (subSectorId == null) {
      showError("Your sub-sector is missing. Update your profile details before submitting.");
      return;
    }
    const trimmed = description.trim();
    if (issueImageRequirement === "required" && !issueImage) {
      showError("Please upload a photo of the problem.");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("requestTypeId", String(requestTypeId));
      formData.append("houseNo", h);
      formData.append("streetNo", s);
      formData.append("subSectorId", String(subSectorId));
      const oid = optionId ? parseInt(optionId, 10) : null;
      if (oid != null && !isNaN(oid)) {
        formData.append("requestTypeOptionId", String(oid));
      }
      if (trimmed) formData.append("description", trimmed);
      if (issueImage) {
        formData.append("issueImage", {
          uri: issueImage.uri,
          name: issueImage.name,
          type: issueImage.type,
        } as unknown as Blob);
      }
      const created = await apiPostForm<{ requestNumber?: string }>("/requests", formData);
      const requestNo = created?.requestNumber?.trim();
      showSuccess(
        requestNo
          ? `Your request ${requestNo} has been submitted. We'll process it as soon as possible.`
          : "Your request has been submitted. We'll process it as soon as possible.",
        () => router.back(),
      );
    } catch (e) {
      showError((e as Error).message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePickIssueImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showError("Media permission is required to upload a photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setIssueImage({
      uri: asset.uri,
      name: asset.fileName ?? `issue-${Date.now()}.jpg`,
      type: asset.mimeType ?? "image/jpeg",
    });
  };

  const resolvedServiceOptionImageUrl = serviceOptionImageUrl
    ? serviceOptionImageUrl.startsWith("http")
      ? serviceOptionImageUrl
      : `${API_URL.replace(/\/$/, "")}${serviceOptionImageUrl.startsWith("/") ? "" : "/"}${serviceOptionImageUrl}`
    : null;
  const subSectorLabel =
    user?.subSector?.name?.trim() ||
    (subSectorId != null ? `Sector #${subSectorId}` : "Not set");
  const phoneLabel = [phoneCountryCode.trim(), phoneNumber.trim()].filter(Boolean).join(" ") || "Not set";

  useEffect(() => {
    if (!resolvedServiceOptionImageUrl) setImagePreviewOpen(false);
  }, [resolvedServiceOptionImageUrl]);
  useEffect(() => {
    if (!resolvedServiceOptionImageUrl) {
      setImageLoading(false);
      setImageLoadFailed(false);
      return;
    }
    setImageLoading(true);
    setImageLoadFailed(false);
  }, [resolvedServiceOptionImageUrl]);

  const handleOpenOrDownloadServiceImage = async () => {
    if (!resolvedServiceOptionImageUrl) return;
    try {
      await Linking.openURL(resolvedServiceOptionImageUrl);
    } catch {
      showError("Could not open image link.");
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
      <LinearGradient
        colors={[...gradientColors]}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <Text style={styles.headerIcon}>📝</Text>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {(serviceOptionLabel ?? requestTypeName) || "New request"}
          </Text>
          <Text style={styles.headerSubtitle}>Fill in the details below</Text>
        </View>
      </LinearGradient>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {resolvedServiceOptionImageUrl ? (
          <View style={styles.optionImageWrap}>
            {imageLoadFailed ? (
              <View style={styles.imageLoadErrorWrap}>
                <Ionicons name="warning-outline" size={18} color={colors.error} />
                <Text style={styles.imageLoadErrorText}>Image could not be loaded.</Text>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setImagePreviewOpen(true)}
                style={styles.optionImageTouchable}
              >
                <Image
                  source={{ uri: resolvedServiceOptionImageUrl }}
                  style={styles.optionImage}
                  resizeMode="cover"
                  onLoadStart={() => {
                    setImageLoading(true);
                    setImageLoadFailed(false);
                  }}
                  onLoadEnd={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setImageLoadFailed(true);
                  }}
                />
                {imageLoading ? (
                  <View style={styles.imageLoadingOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.imageLoadingText}>Loading image…</Text>
                  </View>
                ) : null}
                <View style={styles.optionImageOverlay}>
                  <Ionicons name="expand-outline" size={16} color="#fff" />
                  <Text style={styles.optionImageOverlayText}>Tap to view full image</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
        <View style={styles.card}>
          <FieldGroup title="Profile details">
            <View style={styles.readOnlyPanel}>
              <View style={styles.readOnlyPanelHeader}>
                <Ionicons name="lock-closed-outline" size={14} color={colors.primary} />
                <Text style={styles.readOnlyPanelHeaderText}>Read-only profile data</Text>
              </View>
              <View style={styles.readOnlyGrid}>
                <ReadOnlyDetail label="Full name" value={name.trim() || "Not set"} icon="person-outline" fullWidth />
                <ReadOnlyDetail label="House no" value={houseNo.trim() || "Not set"} icon="home-outline" />
                <ReadOnlyDetail label="Street no" value={streetNo.trim() || "Not set"} icon="map-outline" />
                <ReadOnlyDetail label="Phone" value={phoneLabel} icon="call-outline" fullWidth />
                <ReadOnlyDetail label="Sub-sector" value={subSectorLabel} icon="business-outline" fullWidth />
              </View>
            </View>
            <Text style={styles.detailsHint}>Profile details are locked here. Update profile to change them.</Text>
          </FieldGroup>

          <FieldGroup title="Location & notes">
            <Text style={styles.label}>Location</Text>
            {loadingLocation ? (
              <View style={styles.locationLoaderWrap}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.locationLoaderText}>Getting your location…</Text>
              </View>
            ) : locationError ? (
              <View style={styles.locationErrorWrap}>
                <Ionicons name="location-outline" size={20} color={colors.error} />
                <Text style={styles.locationErrorText}>{locationError}</Text>
              </View>
            ) : (
              <View style={styles.locationInfoWrap}>
                <View style={styles.locationInfoIconWrap}>
                  <Ionicons name="location" size={20} color={colors.primary} />
                </View>
                <View style={styles.locationInfoTextWrap}>
                  <Text style={styles.locationInfoTitle}>Location captured</Text>
                  <Text style={styles.locationInfoCoords}>{locationText || "Coordinates will be sent with your request"}</Text>
                </View>
              </View>
            )}
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
            {issueImageRequirement !== "none" ? (
              <>
                <Text style={styles.label}>
                  Photo of the issue {issueImageRequirement === "required" ? "(required)" : "(optional)"}
                </Text>
                {issueImage ? (
                  <View style={styles.issueImagePreviewWrap}>
                    <Image source={{ uri: issueImage.uri }} style={styles.issueImagePreview} resizeMode="cover" />
                    <View style={styles.issueImageActions}>
                      <TouchableOpacity
                        style={styles.issueImageActionBtn}
                        onPress={handlePickIssueImage}
                        disabled={submitting}
                      >
                        <Text style={styles.issueImageActionText}>Change</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.issueImageActionBtn, styles.issueImageRemoveBtn]}
                        onPress={() => setIssueImage(null)}
                        disabled={submitting}
                      >
                        <Text style={styles.issueImageRemoveText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.issueImagePickerBtn} onPress={handlePickIssueImage} disabled={submitting}>
                    <Ionicons name="image-outline" size={20} color={colors.primary} />
                    <Text style={styles.issueImagePickerText}>Select a photo from gallery</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : null}
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

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={imagePreviewOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setImagePreviewOpen(false)}
      >
        <View style={styles.imagePreviewOverlay}>
          <TouchableOpacity
            style={styles.imagePreviewClose}
            onPress={() => setImagePreviewOpen(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {resolvedServiceOptionImageUrl ? (
            <Image
              source={{ uri: resolvedServiceOptionImageUrl }}
              style={styles.imagePreviewImage}
              resizeMode="contain"
            />
          ) : null}
          <TouchableOpacity
            style={styles.imagePreviewDownloadBtn}
            onPress={handleOpenOrDownloadServiceImage}
            activeOpacity={0.85}
          >
            <Ionicons name="download-outline" size={18} color="#fff" />
            <Text style={styles.imagePreviewDownloadText}>Download / Open in browser</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
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
  headerIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textOnGradient,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: typography.subtitleSize,
    lineHeight: typography.subtitleLineHeight,
    color: "rgba(255,255,255,0.9)",
    marginTop: 6,
  },
  scrollContent: { padding: 20 },
  optionImageWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  optionImageTouchable: {
    borderRadius: 12,
    overflow: "hidden",
  },
  optionImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
  },
  optionImageOverlay: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  optionImageOverlayText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  imageLoadingText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  imageLoadErrorWrap: {
    borderWidth: 1,
    borderColor: "rgba(200,0,0,0.25)",
    backgroundColor: "rgba(200,0,0,0.05)",
    borderRadius: 12,
    minHeight: 84,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  imageLoadErrorText: {
    color: colors.error,
    fontSize: typography.smallSize,
    fontWeight: "600",
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  imagePreviewClose: {
    position: "absolute",
    top: 42,
    right: 18,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePreviewImage: {
    width: "100%",
    height: "74%",
  },
  imagePreviewDownloadBtn: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  imagePreviewDownloadText: {
    color: "#fff",
    fontSize: typography.smallSize,
    fontWeight: "700",
  },
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
    fontSize: typography.smallSize,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: 14,
    textTransform: "uppercase",
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
    marginBottom: 14,
    backgroundColor: "#fafafa",
    color: colors.textPrimary,
  },
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
    fontSize: typography.cardTitleSize,
    fontWeight: typography.cardTitleWeight,
    color: colors.textSecondary,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modalOption: { paddingVertical: 14, paddingHorizontal: 16 },
  modalOptionText: { fontSize: typography.bodySize, color: colors.textSecondary },
  modalCancel: { paddingVertical: 14, paddingHorizontal: 16, marginTop: 8, alignItems: "center" },
  modalCancelText: { fontSize: typography.bodySize, fontWeight: "600", color: colors.primary },
  readOnlyPanel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(106, 176, 76, 0.25)",
    backgroundColor: "rgba(106, 176, 76, 0.08)",
    padding: 9,
    marginBottom: 6,
  },
  readOnlyPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 7,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(106, 176, 76, 0.22)",
  },
  readOnlyPanelHeaderText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  readOnlyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  readOnlyDetail: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 9,
    marginBottom: 6,
    backgroundColor: colors.cardBg,
    width: "49%",
  },
  readOnlyDetailFull: {
    width: "100%",
  },
  readOnlyIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(106, 176, 76, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginTop: 1,
  },
  readOnlyTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  readOnlyDetailLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 1,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  readOnlyDetailValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  detailsHint: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
    marginTop: 1,
  },
  description: { minHeight: 100, paddingTop: 14 },
  locationLoaderWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    backgroundColor: "rgba(106, 176, 76, 0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(106, 176, 76, 0.2)",
  },
  locationLoaderText: { fontSize: typography.smallSize, color: colors.textSecondary },
  locationErrorWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    backgroundColor: "rgba(200, 0, 0, 0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(200, 0, 0, 0.2)",
  },
  locationErrorText: { flex: 1, fontSize: typography.smallSize, color: colors.error },
  locationInfoWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    backgroundColor: "rgba(106, 176, 76, 0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(106, 176, 76, 0.2)",
    gap: 12,
  },
  locationInfoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(106, 176, 76, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  locationInfoTextWrap: { flex: 1, minWidth: 0 },
  locationInfoTitle: {
    fontSize: typography.smallSize,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  locationInfoCoords: {
    fontSize: typography.smallSize,
    color: colors.textSecondary,
  },
  issueImagePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "#fafafa",
    marginBottom: 14,
  },
  issueImagePickerText: {
    fontSize: typography.smallSize,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  issueImagePreviewWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#fafafa",
    marginBottom: 14,
  },
  issueImagePreview: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 10,
  },
  issueImageActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  issueImageActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardBg,
  },
  issueImageActionText: {
    color: colors.primary,
    fontSize: typography.smallSize,
    fontWeight: "600",
  },
  issueImageRemoveBtn: {
    borderColor: "rgba(200,0,0,0.25)",
    backgroundColor: "rgba(200,0,0,0.05)",
  },
  issueImageRemoveText: {
    color: colors.error,
    fontSize: typography.smallSize,
    fontWeight: "600",
  },
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
  buttonText: { color: colors.textOnGradient, fontSize: typography.bodySize, fontWeight: "700" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  errorText: { fontSize: typography.bodySize, color: colors.textSecondary, marginBottom: 16 },
  backBtn: { alignItems: "center", paddingVertical: 12 },
  backBtnText: { color: colors.primary, fontSize: typography.smallSize, fontWeight: "600" },
});
