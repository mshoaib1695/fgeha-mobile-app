/**
 * Renders the screen header icon from admin-configured value.
 * - If value is an Ionicons name (e.g. "list-outline"), renders <Ionicons />.
 * - Otherwise treats value as emoji/text (e.g. "📋") or uses defaultIcon.
 */
import { Text, StyleSheet, type StyleProp, type TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "./theme";

const IONICONS_NAME_REGEX = /^[a-zA-Z0-9-]+$/;

export function HeaderIcon({
  value,
  defaultIcon,
  style,
}: {
  value?: string | null;
  defaultIcon: string;
  style?: StyleProp<TextStyle>;
}) {
  const raw = (value ?? "").trim() || defaultIcon;
  if (raw && IONICONS_NAME_REGEX.test(raw)) {
    return (
      <Ionicons
        name={raw as React.ComponentProps<typeof Ionicons>["name"]}
        size={32}
        color={colors.textOnGradient}
        style={[styles.icon, style]}
      />
    );
  }
  return <Text style={[styles.emoji, style]}>{raw}</Text>;
}

const styles = StyleSheet.create({
  icon: { marginRight: 16 },
  emoji: { fontSize: 32, marginRight: 16 },
});
