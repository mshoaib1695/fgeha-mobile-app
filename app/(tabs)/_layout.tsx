import { useState, useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { TouchableOpacity, Text, View, StyleSheet, Platform, Pressable, Modal, ScrollView, Dimensions, Image, type ViewStyle, type StyleProp } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth-context";
import { apiGet, API_URL, unwrapList } from "../../lib/api";
import { colors, typography } from "../../lib/theme";
import { HeaderTitle } from "../../lib/app-header";
import { HomeTabIcon, RequestsTabIcon } from "../../lib/tab-icons";

interface RequestType {
  id: number;
  name: string;
  slug: string;
  displayOrder: number;
  underConstruction?: boolean;
  underConstructionMessage?: string | null;
}

function emojiForRequestType(slug: string, name: string): string {
  const s = (slug || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (s.includes("garbage") || n.includes("garbage")) return "🗑️";
  if (s.includes("water") || n.includes("water")) return "💧";
  if (s.includes("sewer") || n.includes("sewer") || s.includes("drainage") || n.includes("drainage")) return "🚿";
  if (s.includes("electric") || n.includes("electric") || s.includes("street_light") || n.includes("street light")) return "⚡";
  if (s.includes("road") || n.includes("road")) return "🛣️";
  if (s.includes("other") || n.includes("other")) return "🏠";
  return "📋";
}

const TAB_BAR = {
  barBg: "#FFFFFF",
  barBorder: "rgba(0,0,0,0.06)",
  barMarginH: 24,
  barElevation: 8,
  barPaddingV: 10,
  activeBg: "rgba(13, 148, 136, 0.22)",
  iconSize: 22,
};

function TabIcon({
  name,
  focused,
  color,
  size,
}: {
  name: "index" | "my-requests";
  focused: boolean;
  color: string;
  size: number;
}) {
  const iconSize = TAB_BAR.iconSize;
  const iconColor = focused ? color : color + "99";
  if (name === "index") {
    return <HomeTabIcon color={iconColor} size={iconSize} />;
  }
  return <RequestsTabIcon color={iconColor} size={iconSize} />;
}

type TabBarButtonProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: (() => void) | ( (e: unknown) => void );
  onLongPress?: (() => void) | ( (e: unknown) => void ) | null;
  focused?: boolean;
  [key: string]: unknown;
};

function TabBarButtonWrapper(props: TabBarButtonProps) {
  const { children, style, onPress, onLongPress, focused, ...rest } = props;
  return (
    <View style={[tabBarStyles.tabItemOuter, focused && tabBarStyles.tabItemOuterActive]}>
      <Pressable
        onPress={onPress as (() => void) | undefined}
        onLongPress={(onLongPress as (() => void) | undefined) ?? undefined}
        style={({ pressed }) => [tabBarStyles.tabItemTouchable, style, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
        {...rest}
      >
        {children}
      </Pressable>
    </View>
  );
}

const tabBarStyles = StyleSheet.create({
  iconColumn: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabItemOuter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
    borderRadius: 16,
    minHeight: 36,
  },
  tabItemOuterActive: {
    backgroundColor: TAB_BAR.activeBg,
  },
  tabItemTouchable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
});

const DRAWER_WIDTH = 280;

const AVATAR_SIZE = 48;

function LeftDrawer({
  visible,
  onClose,
  onLogout,
  onProfilePress,
  requestTypes,
  onRequestTypePress,
  user,
}: {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
  onProfilePress: () => void;
  requestTypes: RequestType[];
  onRequestTypePress: (item: RequestType) => void;
  user: { fullName?: string; profileImage?: string | null } | null;
}) {
  const insets = useSafeAreaInsets();
  const profileImageUrl =
    user?.profileImage && user.profileImage.trim()
      ? `${API_URL.replace(/\/$/, "")}/${user.profileImage.replace(/^\//, "")}`
      : null;
  if (!visible) return null;
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={drawerStyles.backdrop} onPress={onClose}>
        <Pressable style={[drawerStyles.panel, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]} onPress={(e) => e.stopPropagation()}>
          <View style={drawerStyles.header}>
            <Text style={drawerStyles.title}>Menu</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={drawerStyles.closeBtn}>
              <Text style={drawerStyles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          {user && (
            <TouchableOpacity
              style={drawerStyles.userRow}
              onPress={() => { onClose(); onProfilePress(); }}
              activeOpacity={0.8}
            >
              {profileImageUrl ? (
                <Image source={{ uri: profileImageUrl }} style={drawerStyles.avatar} />
              ) : (
                <View style={drawerStyles.avatarPlaceholder}>
                  <Ionicons name="person" size={AVATAR_SIZE * 0.5} color={colors.textSecondary} />
                </View>
              )}
              <View style={drawerStyles.userTextWrap}>
                <Text style={drawerStyles.userName} numberOfLines={1}>{user.fullName ?? "Profile"}</Text>
                <Text style={drawerStyles.userHint}>Tap to edit profile</Text>
              </View>
            </TouchableOpacity>
          )}
          <ScrollView style={drawerStyles.menuScroll} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={drawerStyles.menuItem}
              onPress={() => { onClose(); onProfilePress(); }}
              activeOpacity={0.7}
            >
              <Text style={drawerStyles.menuItemEmoji}>👤</Text>
              <Text style={drawerStyles.menuItemLabel}>Profile settings</Text>
            </TouchableOpacity>
            {requestTypes.map((rt) => (
              <TouchableOpacity
                key={rt.id}
                style={drawerStyles.menuItem}
                onPress={() => {
                  onClose();
                  onRequestTypePress(rt);
                }}
                activeOpacity={0.7}
              >
                <Text style={drawerStyles.menuItemEmoji}>{emojiForRequestType(rt.slug, rt.name)}</Text>
                <Text style={drawerStyles.menuItemLabel} numberOfLines={1}>{rt.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={drawerStyles.footer}>
            <TouchableOpacity
              style={drawerStyles.signOutButton}
              onPress={() => {
                onClose();
                onLogout();
              }}
              activeOpacity={0.8}
            >
              <View style={drawerStyles.signOutIconWrap}>
                <Ionicons name="log-out-outline" size={24} color={colors.primary} />
              </View>
              <View style={drawerStyles.signOutTextWrap}>
                <Text style={drawerStyles.signOutLabel}>Sign out</Text>
                <Text style={drawerStyles.signOutHint}>Sign out of your account</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const drawerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  panel: {
    width: DRAWER_WIDTH,
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: "rgba(13, 148, 136, 0.08)",
    gap: 12,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  userTextWrap: { flex: 1, minWidth: 0 },
  userName: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  userHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  menuScroll: {
    flex: 1,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 12,
  },
  menuItemEmoji: {
    fontSize: 22,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  footer: {
    paddingBottom: 8,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "rgba(13, 148, 136, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(13, 148, 136, 0.25)",
    gap: 14,
  },
  signOutIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(13, 148, 136, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  signOutTextWrap: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  signOutLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  signOutHint: {
    fontSize: typography.smallSize,
    color: colors.textSecondary,
  },
});

function SignOutModal({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={signOutModalStyles.backdrop} onPress={onClose}>
        <Pressable style={signOutModalStyles.card} onPress={(e) => e.stopPropagation()}>
          <View style={signOutModalStyles.iconWrap}>
            <Ionicons name="log-out-outline" size={40} color={colors.primary} />
          </View>
          <Text style={signOutModalStyles.title}>Sign out</Text>
          <Text style={signOutModalStyles.message}>Are you sure you want to sign out? You can sign in again anytime.</Text>
          <View style={signOutModalStyles.actions}>
            <TouchableOpacity
              style={signOutModalStyles.cancelBtn}
              onPress={onClose}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={signOutModalStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[signOutModalStyles.confirmBtn, loading && signOutModalStyles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={signOutModalStyles.confirmBtnText}>{loading ? "Signing out…" : "Sign out"}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const signOutModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(13, 148, 136, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  message: {
    fontSize: typography.bodySize,
    lineHeight: typography.bodyLineHeight,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: typography.bodySize,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnDisabled: { opacity: 0.7 },
  confirmBtnText: {
    fontSize: typography.bodySize,
    fontWeight: "700",
    color: colors.textOnGradient,
  },
});

export default function TabsLayout() {
  const { logout, user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await apiGet<unknown>("/request-types");
        if (!cancelled) {
          const list = unwrapList<RequestType>(raw);
          const sorted = list.sort(
            (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
          );
          setRequestTypes(sorted);
        }
      } catch {
        if (!cancelled) setRequestTypes([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleRequestTypePress = async (item: RequestType) => {
    if (item.underConstruction) {
      router.push({
        pathname: "/(tabs)/under-construction",
        params: { title: item.name, message: item.underConstructionMessage ?? "PAGE IS UNDER CONSTRUCTION 🚧" },
      });
      return;
    }
    try {
      const options = await apiGet<unknown[]>(`/request-type-options/by-request-type/${item.id}`);
      if (Array.isArray(options) && options.length > 0) {
        router.push({ pathname: "/(tabs)/request-type-options/[id]", params: { id: String(item.id) } });
      } else {
        router.push(`/(tabs)/create-request/${item.id}`);
      }
    } catch {
      router.push(`/(tabs)/create-request/${item.id}`);
    }
  };

  const handleLogoutPress = () => {
    setDrawerVisible(false);
    setSignOutModalVisible(true);
  };

  const handleSignOutConfirm = async () => {
    await logout();
    setSignOutModalVisible(false);
    router.replace("/login");
  };

  return (
    <View style={layoutStyles.wrapper}>
      <LeftDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onLogout={handleLogoutPress}
        onProfilePress={() => router.push("/(tabs)/profile")}
        requestTypes={requestTypes}
        onRequestTypePress={handleRequestTypePress}
        user={user}
      />
      <SignOutModal
        visible={signOutModalVisible}
        onClose={() => setSignOutModalVisible(false)}
        onConfirm={handleSignOutConfirm}
      />
      <Tabs
        screenOptions={{
        headerShown: true,
        headerBackground: () => <View style={{ flex: 1, backgroundColor: colors.cardBg }} />,
        headerTintColor: colors.textPrimary,
        headerTitleAlign: "left",
        headerTitleStyle: { color: colors.textPrimary },
        headerTitle: (props) => <HeaderTitle onLogoPress={() => setDrawerVisible(true)}>{(props.children as string) ?? ""}</HeaderTitle>,
        headerStyle: {
          backgroundColor: colors.cardBg,
          elevation: 2,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 2,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          minHeight: 56,
        },
        headerTitleContainerStyle: {
          flex: 1,
          maxWidth: Dimensions.get("window").width - 16,
          marginRight: 8,
          justifyContent: "center",
        },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "#6b7280",
        tabBarStyle: {
          position: "absolute",
          left: TAB_BAR.barMarginH,
          right: TAB_BAR.barMarginH,
          bottom: insets.bottom,
          backgroundColor: TAB_BAR.barBg,
          borderWidth: 1,
          borderColor: TAB_BAR.barBorder,
          paddingTop: TAB_BAR.barPaddingV,
          paddingBottom: TAB_BAR.barPaddingV,
          height: 56,
          minHeight: 56,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.07,
              shadowRadius: 20,
            },
            android: { elevation: TAB_BAR.barElevation },
          }),
        },
        tabBarShowLabel: false,
        tabBarItemStyle: { paddingVertical: 0, alignItems: "center", justifyContent: "center" },
        tabBarButton: (props) => {
          const p = props as TabBarButtonProps & { focused?: boolean };
          return (
            <TabBarButtonWrapper
              onPress={p.onPress as (() => void) | undefined}
              onLongPress={p.onLongPress as (() => void) | undefined}
              style={p.style}
              focused={p.focused ?? false}
            >
              {props.children}
            </TabBarButtonWrapper>
          );
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "FGEHA - RSP",
          tabBarLabel: "Home",
          tabBarIcon: ({ focused, color, size }) => <TabIcon name="index" focused={focused} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="create-request"
        options={{
          title: "New Request",
          headerShown: false,
          href: null,
        }}
      />
      <Tabs.Screen
        name="request-type-options/[id]"
        options={{ title: "Options", headerShown: true, href: null }}
      />
      <Tabs.Screen
        name="service-list"
        options={{ title: "List", headerShown: true, href: null }}
      />
      <Tabs.Screen
        name="service-rules"
        options={{ title: "Rules", headerShown: true, href: null }}
      />
      <Tabs.Screen
        name="under-construction"
        options={{ title: "Maintenance", headerShown: true, href: null }}
      />
      <Tabs.Screen
        name="my-requests"
        options={{
          title: "My Requests",
          tabBarIcon: ({ focused, color, size }) => <TabIcon name="my-requests" focused={focused} color={color} size={size} />,
          tabBarLabel: "My Requests",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", headerShown: false, href: null }}
      />
      </Tabs>
      <View style={[layoutStyles.bottomFill, { height: insets.bottom }]} />
    </View>
  );
}

const layoutStyles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#000" },
  bottomFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
  },
});
