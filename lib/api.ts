import { getVToken } from "./v";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://api.fgeha.online";

let token: string | null = null;
let authFailureHandler: (() => void | Promise<void>) | null = null;

export function setAuthToken(t: string | null) {
  token = t;
}

export function setAuthFailureHandler(handler: (() => void | Promise<void>) | null) {
  authFailureHandler = handler;
}

function isNetworkError(e: unknown): boolean {
  if (e instanceof TypeError)
    return e.message === "Failed to fetch" || e.message === "Network request failed";
  if (e instanceof Error) {
    const msg = e.message.toLowerCase();
    return msg.includes("network") || msg.includes("fetch") || msg.includes("failed to connect");
  }
  return false;
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const base = (API_URL ?? "").replace(/\/+$/, "");
  const pathNorm = (path ?? "").startsWith("/") ? path : `/${path}`;
  const url = path.startsWith("http") ? path : `${base}${pathNorm}`;
  const headers: HeadersInit = {
    Accept: "application/json",
    ...(options.headers ?? {}),
  };
  if (!(options.body instanceof FormData) && !(headers as Record<string, string>)["Content-Type"]) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const v = getVToken();
  if (v) (headers as Record<string, string>)["X-V"] = v;
  let res: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (e) {
    const rawMsg = e instanceof Error ? e.message : String(e);
    
    // Check for timeout/abort – show user-friendly message
    if (e instanceof Error && (e.name === "AbortError" || rawMsg.includes("timeout"))) {
      throw new Error("The request took too long. Please check your internet connection and try again.");
    }

    if (isNetworkError(e)) {
      throw new Error("Unable to connect. Please check your internet connection and try again.");
    }
    const msg = rawMsg;
    if (msg === "Failed to fetch" || msg === "Network request failed" || msg.includes("Network Error")) {
      throw new Error("Unable to connect. Please check your internet connection and try again.");
    }
    throw e;
  }
  if (!res.ok) {
    if (res.status === 401 && authFailureHandler) {
      await Promise.resolve(authFailureHandler()).catch(() => {
        // Keep original API error if auth cleanup fails.
      });
    }
    if (res.status === 401) {
      throw new Error("Session expired. Please login again.");
    }
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const msg = (err as { message?: string | string[] }).message;
    const text = Array.isArray(msg) ? msg.join(". ") : (msg ?? "Something went wrong. Please try again.");
    throw new Error(text);
  }
  return res.json() as Promise<T>;
}

export const apiGet = <T>(path: string) => api<T>(path, { method: "GET" });
export const apiPost = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body) });
export const apiPostForm = <T>(path: string, body: FormData) =>
  api<T>(path, { method: "POST", body });
export const apiPatch = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body) });

/** Unwrap list from API: raw array, or { data: [] } / { items: [] } */
export function unwrapList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object" && "data" in (raw as object)) {
    const d = (raw as { data: unknown }).data;
    if (Array.isArray(d)) return d as T[];
  }
  if (raw && typeof raw === "object" && "items" in (raw as object)) {
    const i = (raw as { items: unknown }).items;
    if (Array.isArray(i)) return i as T[];
  }
  return [];
}

/** User-friendly hint when network/connection fails */
export function getNetworkErrorHint(): string {
  return "Check your internet connection and try again. If the problem persists, try again in a few moments.";
}
