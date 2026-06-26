"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getToken } from "@/lib/api/client";
import * as auth from "@/lib/api/auth";
import type { User } from "@/lib/api/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { user } = await auth.me();
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // React to token changes from other tabs / the api client (401 -> clear).
    const onChange = () => refresh();
    window.addEventListener("jobcron-auth-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("jobcron-auth-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const r = await auth.login({ email, password });
    setUser(r.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const r = await auth.register({ email, password, name });
    setUser(r.user);
  }, []);

  const logout = useCallback(() => {
    auth.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, authenticated: Boolean(user), login, register, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
