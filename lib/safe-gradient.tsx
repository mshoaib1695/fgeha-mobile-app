import React from "react";
import { View, ViewStyle } from "react-native";
import { colors } from "./theme";

/**
 * Solid-color background that matches the gradient end.
 * Use instead of LinearGradient on first-paint screens to avoid native module
 * crashes on some Android devices (expo-linear-gradient can crash after splash).
 */
export function SafeGradient({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ flex: 1, backgroundColor: colors.gradientEnd }, style]}>
      {children}
    </View>
  );
}
