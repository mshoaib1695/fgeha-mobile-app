import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "./theme";

const logoSource = require("../assets/logo.png");

/** Shared header title: profile image (if available) or logo + screen title. */
export function HeaderTitle({
  children,
  onLogoPress,
  profileImageUrl,
}: {
  children: string;
  onLogoPress?: () => void;
  profileImageUrl?: string | null;
}) {
  const visual = profileImageUrl ? (
    <Image source={{ uri: profileImageUrl }} style={styles.avatar} resizeMode="cover" />
  ) : (
    <Image source={logoSource} style={styles.logo} resizeMode="contain" />
  );
  return (
    <View style={styles.titleRow}>
      {onLogoPress ? (
        <TouchableOpacity onPress={onLogoPress} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          {visual}
        </TouchableOpacity>
      ) : (
        visual
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
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
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
