"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getToken } from "@/lib/api/client";
import * as auth from "@/lib/api/auth";
import type { User, ProfileInput, RegisterResponse } from "@/lib/api/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (
    body: { email: string; password: string; name?: string } & ProfileInput,
  ) => Promise<RegisterResponse>;
  updateProfile: (body: ProfileInput & { name?: string }) => Promise<User>;
  setPassword: (body: { password: string; currentPassword?: string }) => Promise<void>;
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

  const login = useCallback(async (identifier: string, password: string) => {
    const r = await auth.login({ identifier, password });
    setUser(r.user);
    // Pull the full profile (incl. hasPassword) so prompts behave right away.
    await refresh();
  }, [refresh]);

  // Register does NOT establish a session | the user must verify their email.
  const register = useCallback(
    (body: { email: string; password: string; name?: string } & ProfileInput) => auth.register(body),
    [],
  );

  const updateProfile = useCallback(async (body: ProfileInput & { name?: string }) => {
    const { user } = await auth.updateProfile(body);
    setUser(user);
    return user;
  }, []);

  const setPassword = useCallback(
    async (body: { password: string; currentPassword?: string }) => {
      await auth.setPassword(body);
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(() => {
    auth.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, authenticated: Boolean(user), login, register, updateProfile, setPassword, logout, refresh }}
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
