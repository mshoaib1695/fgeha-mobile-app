/**
 * FGEHA app theme – gradient #badc58 → #6ab04c and related colors
 */
export const colors = {
  gradientStart: "#badc58",
  gradientEnd: "#6ab04c",
  /** Darker gradient for header bar – reads as distinct, polished bar */
  headerGradientStart: "#4a9038",
  headerGradientEnd: "#2d5c22",
  primary: "#6ab04c",
  primaryLight: "#badc58",
  textOnGradient: "#ffffff",
  textPrimary: "#1a1a1a",
  textSecondary: "#555",
  textMuted: "#777",
  inputBorder: "#ccc",
  inputBg: "#fff",
  cardBg: "#fff",
  error: "#c00",
  border: "#e0e0e0",
} as const;

export const gradientColors = [colors.gradientStart, colors.gradientEnd] as const;

/** Header bar gradient (darker green) */
export const headerGradientColors = [colors.headerGradientStart, colors.headerGradientEnd] as const;
