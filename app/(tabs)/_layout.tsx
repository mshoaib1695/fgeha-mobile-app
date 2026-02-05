import { Tabs, useRouter } from "expo-router";
import { TouchableOpacity, Text, Alert, View, StyleSheet, Platform } from "react-native";
import { useAuth } from "../../lib/auth-context";
import { colors } from "../../lib/theme";
import { HeaderTitle } from "../../lib/app-header";

// Tab icons as emoji to avoid @expo/vector-icons → expo-font → expo-asset
const TAB_ICONS = {
  index: { active: "🏠", inactive: "🏠" },
  "create-request": { active: "➕", inactive: "➕" },
  "my-requests": { active: "📋", inactive: "📋" },
};

function TabIcon({ name, focused, color, size }: { name: keyof typeof TAB_ICONS; focused: boolean; color: string; size: number }) {
  const icons = TAB_ICONS[name];
  const emoji = focused ? icons.active : icons.inactive;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size * 0.9, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>
    </View>
  );
}

function HeaderLogout({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={headerStyles.logoutWrap} activeOpacity={0.8}>
      <View style={headerStyles.logoutPill}>
        <Text style={headerStyles.logoutText}>Log out</Text>
      </View>
    </TouchableOpacity>
  );
}

const headerStyles = StyleSheet.create({
  logoutWrap: {
    marginRight: Platform.OS === "ios" ? 8 : 16,
  },
  logoutPill: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  logoutText: {
    color: colors.textOnGradient,
    fontSize: 14,
    fontWeight: "600",
  },
});

export default function TabsLayout() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerBackground: () => <View style={{ flex: 1, backgroundColor: colors.cardBg }} />,
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { color: colors.textPrimary },
        headerTitle: (props) => <HeaderTitle>{props.children}</HeaderTitle>,
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
        headerRight: () => <HeaderLogout onPress={handleLogout} />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "#888",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color, size }) => <TabIcon name="index" focused={focused} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="create-request"
        options={{
          title: "New Request",
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => <TabIcon name="create-request" focused={focused} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="my-requests"
        options={{
          title: "My Requests",
          tabBarIcon: ({ focused, color, size }) => <TabIcon name="my-requests" focused={focused} color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
