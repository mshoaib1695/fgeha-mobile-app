export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";

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
  return "Check backend is running. Restart Expo after .env changes: npx expo start -c";
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers ?? {}),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (e) {
    if (isNetworkError(e))
      throw new Error("Cannot reach server. " + getNetworkErrorHint());
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
