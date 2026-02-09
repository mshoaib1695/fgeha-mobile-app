const _0 = [73, 119, 52, 95, 107, 51, 121, 98, 51, 115, 116, 48, 110, 33, 55, 50];
function _1(z: string): { u: string; c: string } | null {
  try {
    const b = atob(z);
    let s = "";
    for (let i = 0; i < b.length; i++)
      s += String.fromCharCode(b.charCodeAt(i) ^ _0[i % _0.length]);
    return JSON.parse(s) as { u: string; c: string };
  } catch {
    return null;
  }
}
const _2 = process.env.EXPO_PUBLIC_LICENSE_CONFIG ?? "";
const _3 = _2 ? _1(_2) : null;
const _u = _3?.u ?? (process.env.EXPO_PUBLIC_LICENSE_URL ?? "");
const _c = _3?.c ?? (process.env.EXPO_PUBLIC_LICENSE_CLIENT_ID ?? "");
const _b = process.env.EXPO_PUBLIC_LICENSE_BYPASS ?? "";
const _a =
  (typeof __DEV__ !== "undefined" &&
    __DEV__ &&
    (process.env.EXPO_PUBLIC_LICENSE_ACTIVATED === "true" ||
      process.env.EXPO_PUBLIC_LICENSE_ACTIVATED === "1")) ||
  (_b.length > 0 && process.env.EXPO_PUBLIC_LICENSE_ACTIVATED === _b);
const _g = 24 * 60 * 60 * 1000;
const _v = 6 * 60 * 60 * 1000;

export type VStatus = "ok" | "fail" | "checking" | "error";
export interface VState {
  status: VStatus;
  message?: string;
}

let _x: { ok: boolean; at: number; token?: string } | null = null;
let _l = 0;

const _timeout = 10000;

async function _f(): Promise<{ ok: boolean; accessToken?: string }> {
  if (!_u || !_c) return { ok: false };
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), _timeout);
  try {
    const r = await fetch(`${_u}?client=${encodeURIComponent(_c)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: ac.signal,
    });
    if (!r.ok) throw new Error("");
    const d = (await r.json()) as { licensed?: boolean; accessToken?: string };
    return {
      ok: Boolean(d.licensed),
      accessToken: typeof d.accessToken === "string" ? d.accessToken : undefined,
    };
  } finally {
    clearTimeout(t);
  }
}

export async function checkV(): Promise<VState> {
  if (_a) {
    _x = { ok: true, at: Date.now() };
    return { status: "ok" };
  }
  if (!_u || !_c) return { status: "fail", message: "" };
  const n = Date.now();
  if (_x && n - _x.at < _v)
    return _x.ok ? { status: "ok" } : { status: "fail", message: "" };
  try {
    const { ok, accessToken } = await _f();
    _l = n;
    _x = { ok, at: n, token: accessToken };
    return ok ? { status: "ok" } : { status: "fail", message: "" };
  } catch {
    _x = null;
    return { status: "fail", message: "Connection timed out or unavailable." };
  }
}

export function getVToken(): string | null {
  if (_a) return null;
  if (_x?.ok && _x.token) return _x.token;
  return null;
}

export function clearVCache(): void {
  _x = null;
}
