import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "./theme";

export type AppAlertType = "success" | "error" | "info";

export interface AppAlertOptions {
  type: AppAlertType;
  title: string;
  message: string;
  buttonText?: string;
  onPress: () => void;
}

const config = {
  success: {
    icon: "checkmark-circle" as const,
    iconColor: colors.primary,
    bgIcon: "rgba(106, 176, 76, 0.12)",
    titleColor: colors.textPrimary,
  },
  error: {
    icon: "close-circle" as const,
    iconColor: colors.error,
    bgIcon: "rgba(204, 0, 0, 0.1)",
    titleColor: colors.textPrimary,
  },
  info: {
    icon: "information-circle" as const,
    iconColor: colors.primary,
    bgIcon: "rgba(106, 176, 76, 0.12)",
    titleColor: colors.textPrimary,
  },
};

export function AppAlert({
  visible,
  type,
  title,
  message,
  buttonText = "OK",
  onPress,
}: AppAlertOptions & { visible: boolean }) {
  const { icon, iconColor, bgIcon } = config[type];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onPress}
    >
      <Pressable style={styles.overlay} onPress={onPress}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.iconWrap, { backgroundColor: bgIcon }]}>
            <Ionicons name={icon} size={56} color={iconColor} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity
            style={[styles.button, type === "error" && styles.buttonError]}
            onPress={onPress}
            activeOpacity={0.85}
          >
            <Text style={[styles.buttonText, type === "error" && styles.buttonTextError]}>
              {buttonText}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.cardBg,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    minWidth: 160,
    alignItems: "center",
  },
  buttonError: {
    backgroundColor: colors.error,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textOnGradient,
  },
  buttonTextError: {
    color: "#fff",
  },
});
