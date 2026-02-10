import { getVToken } from "./v";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://api.fgeha.online";

let token: string | null = null;

export function setAuthToken(t: string | null) {
  token = t;
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

export function getNetworkErrorHint(): string {
  if (API_URL.includes("localhost") || API_URL.includes("127.0.0.1"))
    return "On a phone or emulator, use your computer's IP in .env: EXPO_PUBLIC_API_URL=http://YOUR_IP:8080";
  const parts = [
    "Restart Expo after .env changes: npx expo start -c",
    "If you use Expo in the browser (web), the API must allow your app origin (CORS).",
    "If the API supports HTTPS, try changing EXPO_PUBLIC_API_URL to https://api.fgeha.online",
    "On a physical device, ensure it can reach the API (same network, DNS working).",
    "For deployed servers: 1) Verify server is running, 2) Check DNS resolves correctly, 3) Test URL in device browser, 4) Check firewall/security groups allow connections, 5) Verify reverse proxy (nginx/apache) is configured correctly.",
  ];
  return parts.join(" ");
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const base = (API_URL ?? "").replace(/\/+$/, "");
  const pathNorm = (path ?? "").startsWith("/") ? path : `/${path}`;
  const url = path.startsWith("http") ? path : `${base}${pathNorm}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
    // Removed custom User-Agent - some servers/WAFs block custom User-Agents
    ...(options.headers ?? {}),
  };
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
    
    // Check for timeout/abort
    if (e instanceof Error && (e.name === "AbortError" || rawMsg.includes("timeout"))) {
      const errorMsg = `Request timed out after 30 seconds. URL: ${url}\n\n` +
        `Troubleshooting:\n` +
        `1. Test in device browser: ${url}\n` +
        `2. If browser works but app doesn't: Check if device/emulator can reach internet\n` +
        `3. Try HTTPS: Change EXPO_PUBLIC_API_URL to https://api.fgeha.online\n` +
        `4. Check network: Ensure device is on same network as server (or can reach internet)\n` +
        `5. Emulator: Use 10.0.2.2 for localhost, or ensure emulator has internet access`;
      throw new Error(errorMsg);
    }
    
    if (isNetworkError(e)) {
      const hint = getNetworkErrorHint();
      throw new Error(`Cannot reach server (${rawMsg}). Attempted URL: ${url}. ${hint}`);
    }
    const msg = rawMsg;
    if (msg === "Failed to fetch" || msg === "Network request failed" || msg.includes("Network Error")) {
      const hint = getNetworkErrorHint();
      throw new Error(`Cannot reach server (${rawMsg}). Attempted URL: ${url}. ${hint}`);
    }
    throw e;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const msg = (err as { message?: string | string[] }).message;
    const text = Array.isArray(msg) ? msg.join(". ") : (msg ?? "Request failed");
    throw new Error(text);
  }
  return res.json() as Promise<T>;
}

export const apiGet = <T>(path: string) => api<T>(path, { method: "GET" });
export const apiPost = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body) });
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
