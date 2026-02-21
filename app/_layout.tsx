import { useEffect, useRef } from "react";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "../lib/auth-context";

// AuthProvider and AlertProvider wrap the app in index.js so all routes (including index) are inside them.
export default function RootLayout() {
  const { token, isLoading } = useAuth();
  const router = useRouter();
  const hadTokenRef = useRef(false);

  useEffect(() => {
    if (token) hadTokenRef.current = true;
  }, [token]);

  // When user logs out (token goes from set to null), ensure we land on login from any screen
  useEffect(() => {
    if (isLoading || token) return;
    if (!hadTokenRef.current) return;
    hadTokenRef.current = false;
    router.replace("/login");
  }, [token, isLoading, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="pending" />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="create-request" options={{ headerShown: false }} />
    </Stack>
  );
}
