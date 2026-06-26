import { api, API_BASE, setToken, clearToken } from "./client";
import type { AuthResponse, User } from "./types";

export function register(body: { email: string; password: string; name?: string }) {
  return api
    .post<AuthResponse>("/api/auth/register", body, { auth: false })
    .then((r) => {
      setToken(r.token);
      return r;
    });
}

export function login(body: { email: string; password: string }) {
  return api
    .post<AuthResponse>("/api/auth/login", body, { auth: false })
    .then((r) => {
      setToken(r.token);
      return r;
    });
}

export function me() {
  return api.get<{ user: User }>("/api/auth/me");
}

export function logout() {
  clearToken();
}

// Full-page navigation to the provider (not fetch). Server redirects back to
// FRONTEND_URL/auth/callback#token=<jwt>.
export function oauthUrl(provider: "google" | "github"): string {
  return `${API_BASE}/api/auth/oauth/${provider}`;
}
