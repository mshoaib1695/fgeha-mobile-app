import { Stack } from "expo-router";
import { View } from "react-native";
import { colors } from "../../../lib/theme";
import { HeaderTitle } from "../../../lib/app-header";

const sharedHeaderOptions = {
  headerShown: true,
  headerBackground: () => <View style={{ flex: 1, backgroundColor: colors.cardBg }} />,
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { color: colors.textPrimary },
  headerTitle: (props: { children: string }) => <HeaderTitle>{props.children}</HeaderTitle>,
  headerStyle: {
    backgroundColor: colors.cardBg,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerShadowVisible: false,
};

export default function CreateRequestLayout() {
  return (
    <Stack screenOptions={sharedHeaderOptions}>
      <Stack.Screen name="index" options={{ title: "New Request" }} />
      <Stack.Screen name="[id]" options={{ title: "Submit request" }} />
    </Stack>
  );
}
