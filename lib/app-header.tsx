import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "./theme";

const logoSource = require("../assets/logo.png");

/** Shared header title: logo + screen title (used in tabs and create-request stack). Logo is tappable when onLogoPress is provided. */
export function HeaderTitle({ children, onLogoPress }: { children: string; onLogoPress?: () => void }) {
  const logo = <Image source={logoSource} style={styles.logo} resizeMode="contain" />;
  return (
    <View style={styles.titleRow}>
      {onLogoPress ? (
        <TouchableOpacity onPress={onLogoPress} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          {logo}
        </TouchableOpacity>
      ) : (
        logo
      )}
      <Text style={styles.titleText} numberOfLines={1} ellipsizeMode="tail">
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
    flex: 1,
    alignSelf: "stretch",
    minWidth: 0,
  },
  logo: {
    width: 30,
    height: 30,
  },
  titleText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 18,
    letterSpacing: 0.3,
    lineHeight: 24,
    flex: 1,
    minWidth: 0,
    width: "100%",
    maxWidth: "100%",
  },
});
