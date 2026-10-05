/**
 * auth-context.tsx — Google OAuth via backend. The session persists until the user signs out
 * or the backend explicitly rejects the token with a re-auth code.
 */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Doctor } from "./types";
import {
  TOKEN_KEY,
  DOCTOR_CACHE_KEY,
  isReauthResponse,
  markSessionExpired,
  markSessionRestored,
  clearLocalPatientData,
} from "./session";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

interface AuthState {
  doctor: Doctor | null;
  token: string | null;
  loading: boolean;
  signIn: () => void;
  /** Opens Google sign-in in a new tab (falls back to same tab if blocked). */
  signInNewTab: () => Promise<void>;
  signOut: () => void;
  signOutAllDevices: () => Promise<void>;
  updateProfile: (patch: Partial<Doctor>) => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

let inMemoryToken: string | null = null;

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else {
    localStorage.removeItem(TOKEN_KEY);
    try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  }
  inMemoryToken = token;
}

export function getAuthToken(): string | null {
  return getStoredToken() || inMemoryToken;
}

function readCachedDoctor(): Doctor | null {
  try {
    const raw = localStorage.getItem(DOCTOR_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Doctor) : null;
  } catch { return null; }
}
function cacheDoctor(d: Doctor | null) {
  try {
    if (d) localStorage.setItem(DOCTOR_CACHE_KEY, JSON.stringify(d));
    else localStorage.removeItem(DOCTOR_CACHE_KEY);
  } catch { /* ignore */ }
}

async function getAuthUrl(): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/url`);
  const { url } = await res.json();
  return url;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [doctor, setDoctorState] = useState<Doctor | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setDoctor = useCallback((d: Doctor | null) => {
    setDoctorState(d);
    cacheDoctor(d);
  }, []);

  const validate = useCallback(async (tok: string) => {
    try {
      const r = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${tok}` } });
      if (await isReauthResponse(r)) {
        // Backend explicitly ended the session.
        if (!readCachedDoctor()) {
          setStoredToken(null);
          setToken(null);
          setDoctor(null);
        } else {
          // Keep the user in the app; show the re-sign-in banner so no work is lost.
          markSessionExpired();
        }
        return;
      }
      if (!r.ok) return; // 429 / 5xx / other — keep the session and cached profile
      const user = await r.json();
      const profile = await fetch(`${API_BASE}/api/profile`, { headers: { Authorization: `Bearer ${tok}` } })
        .then((p) => (p.ok ? p.json().catch(() => null) : null))
        .catch(() => null);
      if (profile && profile.name) {
        setDoctor({ ...profile, email: user.email, avatar: user.picture, profileComplete: profile.profileComplete ?? true });
      } else {
        setDoctor({ name: user.name || "", email: user.email, avatar: user.picture, profileComplete: true });
      }
    } catch {
      // network error — never sign out
    }
  }, [setDoctor]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const callbackToken = params.get("token");
    if (callbackToken) {
      setStoredToken(callbackToken);
      window.history.replaceState({}, "", window.location.pathname);
    }

    const existing = getStoredToken();
    if (existing) {
      inMemoryToken = existing;
      setToken(existing);
      const cached = readCachedDoctor();
      if (cached) {
        setDoctorState(cached);
        setLoading(false);
        validate(existing);
      } else {
        validate(existing).finally(() => setLoading(false));
      }
    } else {
      setLoading(false);
    }

    // Another tab signed in (e.g. the re-sign-in tab) → pick up the new token.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== TOKEN_KEY) return;
      if (e.newValue) {
        inMemoryToken = e.newValue;
        setToken(e.newValue);
        markSessionRestored();
        validate(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [validate]);

  const signIn = useCallback(async () => {
    try {
      window.location.href = await getAuthUrl();
    } catch (err) {
      console.error("Failed to get auth URL:", err);
    }
  }, []);

  const signInNewTab = useCallback(async () => {
    // Open synchronously to avoid popup blockers, then point it at the auth URL.
    const win = window.open("", "_blank");
    try {
      const url = await getAuthUrl();
      if (win && !win.closed) win.location.href = url;
      else window.location.href = url; // blocked — same-tab is safe thanks to local drafts
    } catch (err) {
      win?.close();
      console.error("Failed to get auth URL:", err);
      throw err;
    }
  }, []);

  const signOut = useCallback(() => {
    setStoredToken(null);
    clearLocalPatientData();
    markSessionRestored();
    setToken(null);
    setDoctor(null);
  }, [setDoctor]);

  const signOutAllDevices = useCallback(async () => {
    const tok = getAuthToken();
    if (tok) {
      const r = await fetch(`${API_BASE}/auth/logout-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!r.ok && r.status !== 401) throw new Error("Could not sign out of all devices");
    }
    signOut();
  }, [signOut]);

  const updateProfile = useCallback(async (patch: Partial<Doctor>) => {
    const currentToken = getAuthToken();
    if (!currentToken) return;
    setDoctorState((prev) => {
      const next = { ...(prev || { name: "", email: "" }), ...patch } as Doctor;
      cacheDoctor(next);
      fetch(`${API_BASE}/api/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` },
        body: JSON.stringify(next),
      }).catch(console.error);
      return next;
    });
  }, []);

  return (
    <AuthCtx.Provider value={{ doctor, token, loading, signIn, signInNewTab, signOut, signOutAllDevices, updateProfile }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
