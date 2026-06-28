import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Doctor } from "./types";

interface AuthState {
  doctor: Doctor | null;
  token: string | null;
  signIn: () => void;
  signOut: () => void;
  updateProfile: (patch: Partial<Doctor>) => void;
}

const AuthCtx = createContext<AuthState | null>(null);

const SESSION_KEY = "rheumcare_auth_v1";
const PROFILE_KEY = "rheumcare_profile_v1";

// Mocks the email returned by Google after OAuth. Profile fields start blank
// so the user fills them in via /profile-setup the first time they sign in.
const GOOGLE_EMAIL = "doctor@rheumcare.app";

function loadProfile(): Doctor | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Doctor) : null;
  } catch {
    return null;
  }
}

function saveProfile(d: Doctor) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(d));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      const stored = loadProfile();
      setDoctor(stored ?? { name: "", email: GOOGLE_EMAIL, profileComplete: false });
      setToken("mock_jwt_token_in_memory_only");
    }
  }, []);

  const signIn = () => {
    const stored = loadProfile();
    const d: Doctor = stored ?? { name: "", email: GOOGLE_EMAIL, profileComplete: false };
    setDoctor(d);
    setToken("mock_jwt_token_in_memory_only");
    if (typeof window !== "undefined") sessionStorage.setItem(SESSION_KEY, "1");
  };

  const signOut = () => {
    setDoctor(null);
    setToken(null);
    if (typeof window !== "undefined") sessionStorage.removeItem(SESSION_KEY);
  };

  const updateProfile = (patch: Partial<Doctor>) => {
    setDoctor((prev) => {
      const base = prev ?? { name: "", email: GOOGLE_EMAIL };
      const next: Doctor = { ...base, ...patch };
      saveProfile(next);
      return next;
    });
  };

  return (
    <AuthCtx.Provider value={{ doctor, token, signIn, signOut, updateProfile }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
