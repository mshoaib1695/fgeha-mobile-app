import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const QUICK_LOGIN_EMAIL_KEY = "quick_login_email";
const QUICK_LOGIN_PASSWORD_KEY = "quick_login_password";

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

export async function saveQuickLoginCredentials(
  email: string,
  password: string
): Promise<void> {
  await SecureStore.setItemAsync(QUICK_LOGIN_EMAIL_KEY, email, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  await SecureStore.setItemAsync(QUICK_LOGIN_PASSWORD_KEY, password, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    requireAuthentication: true,
    authenticationPrompt: "Authenticate to sign in",
  });
}

export async function loadQuickLoginCredentials(): Promise<{
  email: string;
  password: string;
} | null> {
  const email = await SecureStore.getItemAsync(QUICK_LOGIN_EMAIL_KEY);
  if (!email) return null;
  const password = await SecureStore.getItemAsync(QUICK_LOGIN_PASSWORD_KEY, {
    requireAuthentication: true,
    authenticationPrompt: "Authenticate to sign in",
  });
  if (!password) return null;
  return { email, password };
}

export async function hasQuickLoginCredentials(): Promise<boolean> {
  const email = await SecureStore.getItemAsync(QUICK_LOGIN_EMAIL_KEY);
  return Boolean(email);
}

export async function clearQuickLoginCredentials(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(QUICK_LOGIN_EMAIL_KEY),
    SecureStore.deleteItemAsync(QUICK_LOGIN_PASSWORD_KEY),
  ]);
}
