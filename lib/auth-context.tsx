import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthToken, API_URL } from "./api";
import { getVToken } from "./v";

const TOKEN_KEY = "token";
const USER_KEY = "user";

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
  approvalStatus: string;
  accountStatus?: "active" | "deactivated";
  phoneCountryCode?: string;
  phoneNumber?: string;
  houseNo?: string;
  streetNo?: string;
  subSector?: { id: number; name: string; code: string };
  subSectorId?: number;
  /** Profile image path (e.g. profiles/uuid.jpg); use API_URL + "/" + profileImage for full URL */
  profileImage?: string | null;
}

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  phoneCountryCode: string;
  phoneNumber: string;
  houseNo: string;
  streetNo: string;
  subSectorId: number;
  /** ID card front image as base64 data URL (optional). */
  idCardFront?: string;
  /** ID card back image as base64 data URL (optional). */
  idCardBack?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const baseUrl = (API_URL ?? "").replace(/\/+$/, "");

  const setToken = (t: string | null) => {
    setTokenState(t);
    setAuthToken(t);
  };

  const loadStored = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);
      if (storedToken) {
        let parsedUser: User | null = null;
        if (storedUser) {
          try {
            parsedUser = JSON.parse(storedUser) as User;
          } catch {
            // Corrupted user data: clear token so we don't end up in inconsistent state
            await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
          }
        }
        if (parsedUser !== null || !storedUser) {
          // Restore cached session first for fast startup, then verify with backend.
          setToken(storedToken);
          if (parsedUser) setUser(parsedUser);
          try {
            const url = `${baseUrl}/auth/me`;
            const headers: Record<string, string> = {
              Accept: "application/json",
              Authorization: `Bearer ${storedToken}`,
            };
            const vToken = getVToken();
            if (vToken) headers["X-V"] = vToken;
            const res = await fetch(url, { method: "GET", headers });
            if (res.ok) {
              const freshUser = (await res.json()) as User;
              setUser(freshUser);
              await AsyncStorage.setItem(USER_KEY, JSON.stringify(freshUser));
            } else if (res.status === 401 || res.status === 403) {
              // Token is no longer valid (including deactivated account): force sign out.
              setToken(null);
              setUser(null);
              await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
            }
          } catch {
            // Keep cached session on network/transient errors.
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStored();
  }, []);

  const login = async (email: string, password: string) => {
    const url = `${baseUrl}/auth/login`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message ?? "Invalid email or password");
    }
    const { access_token, user: u } = await res.json();
    setToken(access_token);
    setUser(u);
    await AsyncStorage.setItem(TOKEN_KEY, access_token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
  };

  const register = async (data: RegisterData) => {
    const url = `${baseUrl}/auth/register`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err as { message?: string }).message ?? "Registration failed";
      throw new Error(typeof msg === "string" ? msg : "Registration failed");
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  };

  const refreshUser = async () => {
    if (!token) return;
    const { apiGet } = await import("./api");
    const u = await apiGet<User>("/auth/me");
    setUser(u);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
