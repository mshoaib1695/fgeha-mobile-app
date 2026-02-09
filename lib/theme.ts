/**
 * FGEHA app theme – teal/slate gradient, modern and elegant
 */
export const colors = {
  gradientStart: "#14b8a6",
  gradientEnd: "#0d9488",
  /** Darker gradient for header bar – reads as distinct, polished bar */
  headerGradientStart: "#0f766e",
  headerGradientEnd: "#115e59",
  primary: "#0d9488",
  primaryLight: "#2dd4bf",
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

/** Header bar gradient (darker teal) */
export const headerGradientColors = [colors.headerGradientStart, colors.headerGradientEnd] as const;

/** Header for main/home screen – matches other screens */
export const homeHeaderBlue = "#0d9488";
export const homeHeaderBlueDark = "#0f766e";

/** Height of the floating tab bar – use with insets.bottom for content padding */
export const TAB_BAR_HEIGHT = 56;
/** Extra gap above tab bar so content doesn't touch it */
export const TAB_BAR_CONTENT_GAP = 24;
/** Bottom padding for tab screens: insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_CONTENT_GAP */
export function tabScreenPaddingBottom(insetsBottom: number): number {
  return insetsBottom + TAB_BAR_HEIGHT + TAB_BAR_CONTENT_GAP;
}

/** Typography – consistent, readable text */
export const typography = {
  /** Body / paragraphs – size and spacing for readability */
  bodySize: 17,
  bodyLineHeight: 28,
  bodyLetterSpacing: 0.3,
  bodyWeight: "400" as const,
  /** Small / secondary */
  smallSize: 15,
  smallLineHeight: 22,
  /** Headings on cards */
  cardTitleSize: 17,
  cardTitleWeight: "600" as const,
  /** Section / header subtitle */
  subtitleSize: 14,
  subtitleLineHeight: 20,
} as const;

/** Home hub service accent colors (for radial nodes) */
export const homeHubColors = {
  center: "#E8F4FC",       // light blue – Others
  garbage: "#F0F0F0",      // light grey
  sewerage: "#FFF0E6",     // light orange
  electric: "#FFEBEE",     // light red
  water: "#E3F2FD",       // light blue
  default: "#FFFFFF",
} as const;
