import React from "react";
import Svg, { Path } from "react-native-svg";

const SIZE = 24;

/** Compact home icon – house outline */
export function HomeTabIcon({ color, size = SIZE }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 10v10h6v-6h4v6h6V10L12 4 4 10z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Compact list/requests icon – list with lines */
export function RequestsTabIcon({ color, size = SIZE }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 6h12M8 12h12M8 18h8M4 6h1.5M4 12h1.5M4 18h1.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
