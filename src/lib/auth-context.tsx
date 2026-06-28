import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Doctor } from "./types";

interface AuthState {
  doctor: Doctor | null;
  token: string | null;
  signIn: () => void;
  signOut: () => void;
}

const AuthCtx = createContext<AuthState | null>(null);

const DEMO_DOCTOR: Doctor = {
  name: "Dr. Anjali Rao",
  email: "anjali.rao@rheumcare.app",
};

const SESSION_KEY = "rheumcare_auth_v1";

export function AuthProvider({ children }: { children: ReactNode }) {
  // Persist a flag (not the token!) so the user stays signed in across reloads in the demo.
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sess = sessionStorage.getItem(SESSION_KEY);
    if (sess === "1") {
      setDoctor(DEMO_DOCTOR);
      setToken("mock_jwt_token_in_memory_only");
    }
  }, []);

  const signIn = () => {
    setDoctor(DEMO_DOCTOR);
    setToken("mock_jwt_token_in_memory_only");
    if (typeof window !== "undefined") sessionStorage.setItem(SESSION_KEY, "1");
  };

  const signOut = () => {
    setDoctor(null);
    setToken(null);
    if (typeof window !== "undefined") sessionStorage.removeItem(SESSION_KEY);
  };

  return (
    <AuthCtx.Provider value={{ doctor, token, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
