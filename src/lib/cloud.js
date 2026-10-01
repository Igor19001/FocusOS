import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const SESSION_KEY = "dayquest.cloud.session.v1";
const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
const NATIVE = Capacitor.isNativePlatform();

function url(path) {
  return `${API_BASE}${path}`;
}

async function request(path, { token, ...opts } = {}) {
  if (NATIVE && !API_BASE) throw new Error("Chmura nie ma adresu backendu. Ustaw VITE_API_BASE przed budową APK.");
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url(path), { ...opts, headers });
  let body = {};
  try { body = await res.json(); } catch {}
  if (!res.ok) {
    const err = new Error(body.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export async function loadCloudSession() {
  try {
    const { value } = await Preferences.get({ key: SESSION_KEY });
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export async function saveCloudSession(session) {
  if (!session) return clearCloudSession();
  await Preferences.set({ key: SESSION_KEY, value: JSON.stringify(session) });
}

export async function clearCloudSession() {
  await Preferences.remove({ key: SESSION_KEY });
}

export const registerCloud = ({ email, password, name }) =>
  request("/api/register", { method: "POST", body: JSON.stringify({ email, password, name }) });

export const loginCloud = ({ email, password }) =>
  request("/api/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const cloudMe = (token) => request("/api/me", { token });
export const cloudState = (token) => request("/api/state", { token });

export const putCloudState = (token, state, baseRev, force = false) =>
  request("/api/state", {
    token,
    method: "PUT",
    body: JSON.stringify({ state, baseRev, force }),
  });

export const logoutCloud = (token) => request("/api/logout", { token, method: "POST" });
export const deleteCloudAccount = (token) => request("/api/account", { token, method: "DELETE" });

export function hasMeaningfulData(state) {
  if (!state) return false;
  return Boolean(
    state.xp ||
    state.session ||
    state.notes?.length ||
    Object.keys(state.history || {}).length ||
    state.finance?.accounts?.length ||
    state.finance?.goals?.netWorth
  );
}

export function sameState(a, b) {
  try { return JSON.stringify(a) === JSON.stringify(b); }
  catch { return false; }
}
