/**
 * auth-context.tsx — Real Google OAuth flow via backend.
 */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Doctor } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

interface AuthState {
  doctor: Doctor | null;
  token: string | null;
  loading: boolean;
  signIn: () => void;
  signOut: () => void;
  updateProfile: (patch: Partial<Doctor>) => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

let inMemoryToken: string | null = null;
const SESSION_TOKEN_KEY = "rheumcare_token";

function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

function setSessionToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    try { sessionStorage.removeItem(SESSION_TOKEN_KEY); } catch { /* ignore */ }
  }
  inMemoryToken = token;
}

export function getAuthToken(): string | null {
  return inMemoryToken || getSessionToken();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const callbackToken = params.get("token");
    if (callbackToken) {
      setSessionToken(callbackToken);
      window.history.replaceState({}, "", window.location.pathname);
    }

    const existingToken = getSessionToken();
    if (existingToken) {
      inMemoryToken = existingToken;
      setToken(existingToken);

      fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${existingToken}` },
      })
        .then((r) => {
          if (!r.ok) throw new Error("Token expired");
          return r.json();
        })
        .then((user) =>
          fetch(`${API_BASE}/api/profile`, {
            headers: { Authorization: `Bearer ${existingToken}` },
          })
            .then((r) => (r.ok ? r.json().catch(() => null) : null))
            .then((profile) => {
              if (profile && profile.name) {
                setDoctor({ ...profile, email: user.email, avatar: user.picture, profileComplete: profile.profileComplete ?? true });
              } else {
                // Profile endpoint missing/empty but token is valid — treat as complete to avoid setup loop.
                setDoctor({ name: user.name || "", email: user.email, avatar: user.picture, profileComplete: true });
              }
            }),
        )
        .catch(() => {
          setSessionToken(null);
          setToken(null);
          setDoctor(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/url`);
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error("Failed to get auth URL:", err);
    }
  }, []);

  const signOut = useCallback(() => {
    setSessionToken(null);
    setToken(null);
    setDoctor(null);
  }, []);

  const updateProfile = useCallback(async (patch: Partial<Doctor>) => {
    const currentToken = getAuthToken();
    if (!currentToken) return;
    setDoctor((prev) => {
      const next = { ...(prev || { name: "", email: "" }), ...patch } as Doctor;
      fetch(`${API_BASE}/api/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify(next),
      }).catch(console.error);
      return next;
    });
  }, []);

  return (
    <AuthCtx.Provider value={{ doctor, token, loading, signIn, signOut, updateProfile }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
