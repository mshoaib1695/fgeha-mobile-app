import { View, Text, Image, StyleSheet } from "react-native";
import { colors } from "./theme";

const logoSource = require("../assets/logo.png");

/** Shared header title: logo + screen title (used in tabs and create-request stack) */
export function HeaderTitle({ children }: { children: string }) {
  return (
    <View style={styles.titleRow}>
      <Image source={logoSource} style={styles.logo} resizeMode="contain" />
      <Text style={styles.titleText} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: "70%",
  },
  logo: {
    width: 32,
    height: 32,
  },
  titleText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 18,
    letterSpacing: 0.3,
  },
});
