import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Platform,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import * as StoreReview from "expo-store-review";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "./theme";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.fgeha.app";
const PLAY_STORE_MARKET = "market://details?id=com.fgeha.app"; // Opens Play Store app directly on Android
const APP_STORE_URL = "https://apps.apple.com/app/idYOUR_APP_ID"; // Replace with actual iOS ID when available

type ReviewModalStep = "rating" | "feedback" | "thanks";

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onRate: (rating: number) => void | Promise<void>;
  onLowRatingFeedback?: (rating: number, feedback: string) => void | Promise<void>;
  onCancel: () => void;
}

export function ReviewModal({ visible, onClose, onRate, onLowRatingFeedback, onCancel }: ReviewModalProps) {
  const [step, setStep] = useState<ReviewModalStep>("rating");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  const handleStarPress = (rating: number) => {
    setSelectedRating(rating);
  };

  const openStoreForReview = async () => {
    if (Platform.OS === "ios") {
      try {
        const isAvailable = await StoreReview.isAvailableAsync();
        if (isAvailable) {
          await StoreReview.requestReview();
          return;
        }
      } catch {
        // Fall through to URL
      }
      Linking.openURL(APP_STORE_URL).catch(() => {});
    } else {
      // Android: Native API often fails on emulator/unpublished app. Use market:// to open Play Store.
      Linking.openURL(PLAY_STORE_MARKET).catch(() =>
        Linking.openURL(PLAY_STORE_URL).catch(() => {})
      );
    }
  };

  const handleSubmit = async () => {
    if (selectedRating == null) return;
    if (selectedRating >= 4) {
      setStep("thanks");
      onRate(selectedRating);
      await openStoreForReview();
      setTimeout(() => {
        onClose();
        setStep("rating");
        setSelectedRating(null);
      }, 1500);
    } else {
      setStep("feedback");
    }
  };

  const handleFeedbackSubmit = async () => {
    if (selectedRating == null) return;
    const feedback = feedbackText.trim();
    await onLowRatingFeedback?.(selectedRating, feedback);
    onRate(selectedRating);
    setStep("thanks");
    setTimeout(() => {
      onClose();
      setStep("rating");
      setSelectedRating(null);
      setFeedbackText("");
    }, 1500);
  };

  const handleCancel = () => {
    onCancel();
    setStep("rating");
    setSelectedRating(null);
    setFeedbackText("");
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleCancel}>
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardAvoid}
        >
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            {step === "rating" ? (
              <>
                <View style={styles.iconWrap}>
                  <Ionicons name="star" size={36} color={colors.primary} />
                </View>
                <Text style={styles.title}>How are we doing?</Text>
                <Text style={styles.subtitle}>
                  Your feedback helps us improve. Rate your experience.
                </Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => handleStarPress(r)}
                      style={styles.starBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={selectedRating != null && r <= selectedRating ? "star" : "star-outline"}
                        size={40}
                        color={selectedRating != null && r <= selectedRating ? "#f59e0b" : colors.border}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={handleCancel}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelBtnText}>Maybe later</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitBtn, selectedRating == null && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={selectedRating == null}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.submitBtnText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : step === "feedback" ? (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.iconWrap}>
                  <Ionicons name="chatbubble-ellipses-outline" size={36} color={colors.primary} />
                </View>
                <Text style={styles.title}>What can we improve?</Text>
                <Text style={styles.subtitle}>
                  Your feedback helps us serve you better. Tell us what went wrong.
                </Text>
                <TextInput
                  style={styles.feedbackInput}
                  placeholder="e.g. Slow response, unclear process, app crashes…"
                  placeholderTextColor={colors.textMuted}
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable
                />
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={handleFeedbackSubmit}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelBtnText}>Skip</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleFeedbackSubmit}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.submitBtnText}>Send feedback</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <View style={styles.thanksWrap}>
                <View style={styles.thanksIconWrap}>
                  <Ionicons name="heart" size={44} color={colors.primary} />
                </View>
                <Text style={styles.thanksTitle}>Thank you!</Text>
                <Text style={styles.thanksSubtitle}>
                  {selectedRating != null && selectedRating >= 4
                    ? "Thank you! Opening the app store to rate us…"
                    : "We appreciate your feedback and will keep improving."}
                </Text>
              </View>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  keyboardAvoid: {
    width: "100%",
    maxWidth: 340,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(13, 148, 136, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.bodySize,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: typography.bodyLineHeight,
  },
  starsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 28,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: typography.bodySize,
    color: colors.textPrimary,
    backgroundColor: "#fafafa",
    minHeight: 100,
    marginBottom: 20,
  },
  starBtn: {
    padding: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: typography.bodySize,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: typography.bodySize,
    fontWeight: "700",
    color: colors.textOnGradient,
  },
  thanksWrap: {
    alignItems: "center",
    paddingVertical: 12,
  },
  thanksIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(13, 148, 136, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  thanksTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  thanksSubtitle: {
    fontSize: typography.bodySize,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: typography.bodyLineHeight,
    marginTop: 8,
  },
});
