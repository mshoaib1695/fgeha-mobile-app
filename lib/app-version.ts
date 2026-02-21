import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "./api";

const DISMISS_KEY_PREFIX = "forceUpdateDismissed_";
const DEFAULT_ANDROID =
  "https://play.google.com/store/apps/details?id=com.fgeha.app";
const _timeout = 10000;

export type AppVersionStatus =
  | "ok"
  | "update-required"
  | "update-available"
  | "fail";

export interface AppVersionResult {
  status: AppVersionStatus;
  message?: string;
  storeUrl?: string;
  latestVersion?: string;
  minimumVersion?: string;
}

type AppVersionResponse = {
  minimumVersion: string;
  latestVersion?: string;
  storeUrlAndroid?: string;
  storeUrlIos?: string;
};

function isVersionLess(a: string, b: string): boolean {
  const partsA = a.split(".").map((n) => parseInt(n, 10) || 0);
  const partsB = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const na = partsA[i] ?? 0;
    const nb = partsB[i] ?? 0;
    if (na < nb) return true;
    if (na > nb) return false;
  }
  return false;
}

export async function checkAppVersion(): Promise<AppVersionResult> {
  const currentVersion =
    Constants.expoConfig?.version ?? Constants.manifest?.version ?? "0.0.0";
  const base = (API_URL ?? "").replace(/\/+$/, "");
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), _timeout);
  try {
    const res = await fetch(`${base}/app-version`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: ac.signal,
    });
    clearTimeout(t);
    if (!res.ok) return { status: "ok" };
    const data = (await res.json()) as AppVersionResponse;
    const minimum = data.minimumVersion ?? "0.0.0";
    const latest = data.latestVersion ?? minimum;
    const storeUrl =
      Platform.OS === "ios"
        ? data.storeUrlIos ?? DEFAULT_ANDROID
        : data.storeUrlAndroid ?? DEFAULT_ANDROID;

    if (isVersionLess(currentVersion, minimum)) {
      return {
        status: "update-required",
        storeUrl,
        minimumVersion: minimum,
      };
    }
    if (isVersionLess(currentVersion, latest)) {
      const dismissKey = DISMISS_KEY_PREFIX + latest;
      const dismissed = await AsyncStorage.getItem(dismissKey);
      if (dismissed === "1") {
        return { status: "ok" };
      }
      return {
        status: "update-available",
        storeUrl,
        latestVersion: latest,
      };
    }
    return { status: "ok" };
  } catch {
    clearTimeout(t);
    return {
      status: "fail",
      message: "Connection timed out or unavailable.",
    };
  }
}

export async function setUpdateDismissed(version: string): Promise<void> {
  await AsyncStorage.setItem(DISMISS_KEY_PREFIX + version, "1");
}
