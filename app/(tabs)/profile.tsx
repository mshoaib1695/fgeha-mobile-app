import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../lib/auth-context";
import { useAppAlert } from "../../lib/alert-context";
import { API_URL } from "../../lib/api";
import { getVToken } from "../../lib/v";
import { colors, gradientColors, tabScreenPaddingBottom, typography } from "../../lib/theme";

const avatarSize = 120;
const cardShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: { elevation: 4 },
});

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshUser, token, logout } = useAuth();
  const { showSuccess, showError, showInfo } = useAppAlert();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [editingAccount, setEditingAccount] = useState(false);
  const [fullName, setFullName] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [streetNo, setStreetNo] = useState("");
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [retypePasswordError, setRetypePasswordError] = useState<string | null>(null);
  const [newPasswordCriteriaError, setNewPasswordCriteriaError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName ?? "");
      setHouseNo(user.houseNo ?? "");
      setStreetNo(user.streetNo ?? "");
    }
  }, [user]);

  const profileImageUrl =
    user?.profileImage && user.profileImage.trim()
      ? `${API_URL.replace(/\/$/, "")}/${user.profileImage.replace(/^\//, "")}`
      : null;

  const pickProfileImage = useCallback(async () => {
    if (uploading || !token) {
      if (!token) showError("Please sign in again.");
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showInfo("Permission needed", "Allow access to your photos to set a profile image.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]) {
        return;
      }
      const asset = result.assets[0];
      let dataUrl: string;
      if (asset.base64) {
        const mime = asset.mimeType ?? "image/jpeg";
        dataUrl = `data:${mime};base64,${asset.base64}`;
      } else {
        showError("Could not read the image. Try choosing a smaller or different photo.");
        return;
      }
      setUploading(true);
      const url = `${API_URL.replace(/\/$/, "")}/users/me`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      };
      const vToken = getVToken();
      if (vToken) headers["X-V"] = vToken;
      const res = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ profileImage: dataUrl }),
      });
      if (!res.ok) {
        const rawText = await res.text();
        let err: { message?: string | string[] };
        try {
          err = JSON.parse(rawText);
        } catch {
          err = { message: rawText || res.statusText };
        }
        const serverMsg = (err as { message?: string | string[] }).message;
        const serverMsgStr = Array.isArray(serverMsg) ? serverMsg.join(". ") : serverMsg ?? "";
        const isTooLarge =
          res.status === 413 ||
          /entity too large|payload too large|request entity too large|body too large/i.test(serverMsgStr) ||
          /entity too large|payload too large|request entity too large|body too large/i.test(rawText);
        const msg = isTooLarge
          ? "Image is too large. Please choose a smaller photo."
          : serverMsgStr || "Request failed";
        throw new Error(msg);
      }
      await refreshUser();
      showSuccess("Profile photo updated.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update photo.";
      showError(msg, "Change photo");
    } finally {
      setUploading(false);
    }
  }, [token, uploading, showError, showSuccess, showInfo, refreshUser]);

  const saveAccount = useCallback(async () => {
    if (!token || saving) return;
    const nameTrim = fullName.trim();
    if (nameTrim.length < 2) {
      showError("Name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    try {
      const url = `${API_URL.replace(/\/$/, "")}/users/me`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      };
      const vToken = getVToken();
      if (vToken) headers["X-V"] = vToken;
      const body: Record<string, string | undefined> = {
        fullName: nameTrim,
        houseNo: houseNo.trim() || undefined,
        streetNo: streetNo.trim() || undefined,
      };
      const res = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        const msg = (err as { message?: string | string[] }).message;
        throw new Error(Array.isArray(msg) ? msg.join(". ") : msg ?? "Request failed");
      }
      await refreshUser();
      setEditingAccount(false);
      showSuccess("Account details updated.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update account.";
      showError(msg, "Save");
    } finally {
      setSaving(false);
    }
  }, [token, saving, fullName, houseNo, streetNo, showError, showSuccess, refreshUser]);

  const deactivateAccount = useCallback(() => {
    if (!token || deactivating) return;
    Alert.alert(
      "Deactivate account?",
      "Your account will be deactivated. You can contact admin if you need to reactivate it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            try {
              setDeactivating(true);
              const url = `${API_URL.replace(/\/$/, "")}/users/me/deactivate`;
              const headers: Record<string, string> = {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
              };
              const vToken = getVToken();
              if (vToken) headers["X-V"] = vToken;
              const res = await fetch(url, {
                method: "PATCH",
                headers,
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({ message: res.statusText }));
                const msg = (err as { message?: string | string[] }).message;
                throw new Error(Array.isArray(msg) ? msg.join(". ") : msg ?? "Request failed");
              }
              await logout();
              showSuccess("Your profile has been deactivated.", () => {
                router.replace("/login");
              });
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Failed to deactivate account.";
              showError(msg, "Deactivate account");
            } finally {
              setDeactivating(false);
            }
          },
        },
      ]
    );
  }, [token, deactivating, logout, showSuccess, showError, router]);

  const openChangePassword = useCallback(() => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setRetypePasswordError(null);
    setNewPasswordCriteriaError(null);
    setChangePasswordVisible(true);
  }, []);

  const changePassword = useCallback(async () => {
    if (!token || changingPassword) return;
    const curr = currentPassword.trim();
    const newP = newPassword.trim();
    const conf = confirmPassword.trim();
    if (!curr) {
      showError("Enter your current password.");
      return;
    }
    if (newP.length < 8) {
      showError("New password must be at least 8 characters.");
      return;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(newP)) {
      showError("New password must be at least 8 characters and include both letters and numbers.");
      return;
    }
    if (newP !== conf) {
      setRetypePasswordError("Passwords do not match.");
      showError("New password and re-type password do not match.");
      return;
    }
    setChangingPassword(true);
    try {
      const url = `${API_URL.replace(/\/$/, "")}/users/me/change-password`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      };
      const vToken = getVToken();
      if (vToken) headers["X-V"] = vToken;
      const res = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ currentPassword: curr, newPassword: newP }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        const msg = (err as { message?: string | string[] }).message;
        throw new Error(Array.isArray(msg) ? msg.join(". ") : msg ?? "Request failed");
      }
      setChangePasswordVisible(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showSuccess("Password changed. Use your new password next time you sign in.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to change password.";
      showError(msg, "Change password");
    } finally {
      setChangingPassword(false);
    }
  }, [token, currentPassword, newPassword, confirmPassword, changingPassword, showError, showSuccess]);

  if (!user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const paddingBottom = tabScreenPaddingBottom(insets.bottom);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...gradientColors]}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerMainRow}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="person" size={28} color="rgba(255,255,255,0.95)" />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>Your account & photo</Text>
          </View>
        </View>
      </LinearGradient>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.contentBackRow}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
          <Text style={styles.contentBackText}>Back</Text>
        </TouchableOpacity>
      <View style={[styles.card, cardShadow]}>
        <Text style={styles.sectionTitle}>Profile photo</Text>
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            {profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {(user.fullName ?? "?").trim().charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {uploading && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" size="large" />
              </View>
            )}
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.changeBtn,
              uploading && styles.changeBtnDisabled,
              pressed && !uploading && styles.changeBtnPressed,
            ]}
            onPress={pickProfileImage}
            disabled={uploading}
            android_ripple={uploading ? undefined : { color: "rgba(255,255,255,0.3)" }}
          >
            <Text style={styles.changeBtnText}>{uploading ? "Uploading…" : "Change photo"}</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>This photo is shown in the menu.</Text>
      </View>
      <View style={[styles.card, cardShadow]}>
        <View style={styles.accountCardHeader}>
          <Text style={styles.sectionTitle}>Account</Text>
          {!editingAccount ? (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setEditingAccount(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil" size={18} color={colors.primary} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {!editingAccount ? (
          <View style={styles.detailRows}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{user.fullName?.trim() || "—"}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={[styles.detailValue, styles.detailValueMuted]} numberOfLines={1}>{user.email ?? "—"}</Text>
              <Text style={styles.detailHint}>Cannot be changed</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {[user.phoneCountryCode, user.phoneNumber].filter(Boolean).join(" ") || "—"}
              </Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>House no</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{user.houseNo?.trim() || "—"}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Street no</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{user.streetNo?.trim() || "—"}</Text>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              placeholderTextColor={colors.textMuted}
              editable={!saving}
            />
            <Text style={styles.label}>Email (cannot be changed)</Text>
            <Text style={styles.valueReadOnly}>{user.email ?? "—"}</Text>
            <Text style={styles.label}>Phone (cannot be changed)</Text>
            <Text style={styles.valueReadOnly}>
              {[user.phoneCountryCode, user.phoneNumber].filter(Boolean).join(" ") || "—"}
            </Text>
            <Text style={styles.label}>House no</Text>
            <TextInput
              style={styles.input}
              value={houseNo}
              onChangeText={setHouseNo}
              placeholder="House / unit number"
              placeholderTextColor={colors.textMuted}
              editable={!saving}
            />
            <Text style={styles.label}>Street no</Text>
            <TextInput
              style={styles.input}
              value={streetNo}
              onChangeText={setStreetNo}
              placeholder="Street number"
              placeholderTextColor={colors.textMuted}
              editable={!saving}
            />
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setFullName(user?.fullName ?? "");
                  setHouseNo(user?.houseNo ?? "");
                  setStreetNo(user?.streetNo ?? "");
                  setEditingAccount(false);
                }}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={saveAccount}
                disabled={saving}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[...gradientColors]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveBtnGradient}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.textOnGradient} />
                  ) : (
                    <Text style={styles.saveBtnText}>Save</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
      <View style={[styles.card, cardShadow]}>
        <Text style={styles.sectionTitle}>Password</Text>
        <Text style={styles.hint}>
          Change your sign-in password. You will need your current password.
        </Text>
        <TouchableOpacity
          style={styles.changePasswordBtn}
          onPress={openChangePassword}
          activeOpacity={0.85}
        >
          <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
          <Text style={styles.changePasswordBtnText}>Change password</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.card, cardShadow]}>
        <Text style={styles.sectionTitle}>Account status</Text>
        <Text style={styles.hint}>
          Deactivate your profile without deleting your account.
        </Text>
        <TouchableOpacity
          style={[styles.deactivateBtn, deactivating && styles.deactivateBtnDisabled]}
          onPress={deactivateAccount}
          disabled={deactivating}
          activeOpacity={0.85}
        >
          <Text style={styles.deactivateBtnText}>
            {deactivating ? "Deactivating…" : "Deactivate profile"}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={changePasswordVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !changingPassword && setChangePasswordVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => !changingPassword && setChangePasswordVisible(false)}
        >
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Change password</Text>
            <Text style={styles.label}>Current password</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              editable={!changingPassword}
            />
            <Text style={styles.label}>New password</Text>
            <Text style={styles.modalHint}>At least 8 characters, with both letters and numbers.</Text>
            <TextInput
              style={[styles.input, newPasswordCriteriaError && styles.inputError]}
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (retypePasswordError) setRetypePasswordError(null);
                if (newPasswordCriteriaError) setNewPasswordCriteriaError(null);
              }}
              onBlur={() => {
                if (newPassword.length === 0) {
                  setNewPasswordCriteriaError(null);
                  return;
                }
                if (newPassword.length < 8) {
                  setNewPasswordCriteriaError("Password must be at least 8 characters.");
                  return;
                }
                if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(newPassword)) {
                  setNewPasswordCriteriaError("Password must include both letters and numbers.");
                  return;
                }
                setNewPasswordCriteriaError(null);
              }}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              editable={!changingPassword}
            />
            {newPasswordCriteriaError ? (
              <Text style={styles.inlineError}>{newPasswordCriteriaError}</Text>
            ) : null}
            <Text style={styles.label}>Re-type new password</Text>
            <TextInput
              style={[styles.input, retypePasswordError && styles.inputError]}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (retypePasswordError) setRetypePasswordError(null);
              }}
              onBlur={() => {
                if (confirmPassword.length > 0 && newPassword !== confirmPassword) {
                  setRetypePasswordError("Passwords do not match.");
                } else {
                  setRetypePasswordError(null);
                }
              }}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              editable={!changingPassword}
            />
            {retypePasswordError ? (
              <Text style={styles.inlineError}>{retypePasswordError}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setChangePasswordVisible(false)}
                disabled={changingPassword}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, changingPassword && styles.saveBtnDisabled]}
                onPress={changePassword}
                disabled={changingPassword}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[...gradientColors]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveBtnGradient}
                >
                  {changingPassword ? (
                    <ActivityIndicator size="small" color={colors.textOnGradient} />
                  ) : (
                    <Text style={styles.saveBtnText}>Change password</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5" },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
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
  headerMainRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
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
    color: "rgba(255,255,255,0.92)",
    marginTop: 2,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12 },
  contentBackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  contentBackText: {
    fontSize: typography.bodySize,
    fontWeight: "600",
    color: colors.primary,
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  accountCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "rgba(13, 148, 136, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(13, 148, 136, 0.28)",
  },
  editBtnText: {
    fontSize: typography.smallSize,
    fontWeight: "600",
    color: colors.primary,
  },
  detailRows: { marginTop: 0 },
  detailRow: { paddingVertical: 10 },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  detailValue: {
    fontSize: typography.bodySize,
    color: colors.textPrimary,
    fontWeight: "500",
    lineHeight: 22,
  },
  detailValueMuted: { color: colors.textSecondary },
  detailHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    fontStyle: "italic",
  },
  detailDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    alignItems: "stretch",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cardBg,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: typography.bodySize,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    minHeight: 48,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnGradient: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: colors.textOnGradient,
    fontSize: typography.bodySize,
    fontWeight: "700",
  },
  avatarSection: { alignItems: "center", marginBottom: 8 },
  avatarWrap: {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "rgba(13, 148, 136, 0.25)",
  },
  avatar: { width: "100%", height: "100%" },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: {
    fontSize: 44,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  changeBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignSelf: "center",
  },
  changeBtnDisabled: { opacity: 0.7 },
  changeBtnPressed: { opacity: 0.85 },
  changeBtnText: { color: "#fff", fontSize: typography.bodySize, fontWeight: "600" },
  hint: { fontSize: typography.smallSize, color: colors.textMuted, textAlign: "center" },
  deactivateBtn: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(200,0,0,0.25)",
    backgroundColor: "rgba(200,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  deactivateBtnDisabled: { opacity: 0.7 },
  deactivateBtnText: {
    color: colors.error,
    fontSize: typography.bodySize,
    fontWeight: "700",
  },
  changePasswordBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(13, 148, 136, 0.35)",
    backgroundColor: "rgba(13, 148, 136, 0.08)",
  },
  changePasswordBtnText: {
    fontSize: typography.bodySize,
    fontWeight: "600",
    color: colors.primary,
  },
  label: {
    fontSize: typography.smallSize,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 4,
  },
  modalHint: {
    fontSize: typography.smallSize,
    color: colors.textMuted,
    marginBottom: 8,
  },
  value: { fontSize: typography.bodySize, color: colors.textPrimary, marginBottom: 16 },
  valueReadOnly: {
    fontSize: typography.bodySize,
    color: colors.textMuted,
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.inputBg ?? "#f0f0f0",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    fontSize: typography.bodySize,
    color: colors.textPrimary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.inputBg ?? "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  inputError: {
    borderColor: colors.error,
    marginBottom: 4,
  },
  inlineError: {
    fontSize: typography.smallSize,
    color: colors.error,
    marginBottom: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    alignItems: "stretch",
  },
});
