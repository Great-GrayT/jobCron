import { api, API_BASE, setToken, clearToken } from "./client";
import type { AuthResponse, User, ProfileInput, RegisterResponse } from "./types";

/**
 * Register an account. Does NOT log the user in | the server emails a
 * verification link and login is blocked until the email is confirmed.
 */
export function register(body: { email: string; password: string; name?: string } & ProfileInput) {
  return api.post<RegisterResponse>("/api/auth/register", body, { auth: false });
}

/** Log in with an email or username. Stores the JWT on success. */
export function login(body: { identifier: string; password: string }) {
  return api.post<AuthResponse>("/api/auth/login", body, { auth: false }).then((r) => {
    setToken(r.token);
    return r;
  });
}

export function me() {
  return api.get<{ user: User }>("/api/auth/me");
}

export function updateProfile(body: ProfileInput & { name?: string }) {
  return api.patch<{ user: User }>("/api/auth/me", body);
}

export function resendVerification(email: string) {
  return api.post<{ ok: boolean }>("/api/auth/resend-verification", { email }, { auth: false });
}

export function forgotPassword(identifier: string) {
  return api.post<{ ok: boolean }>("/api/auth/forgot-password", { identifier }, { auth: false });
}

export function resetPassword(token: string, password: string) {
  return api.post<{ ok: boolean }>("/api/auth/reset-password", { token, password }, { auth: false });
}

/**
 * Set or change the logged-in user's password (currentPassword required if one
 * exists). Changing the password revokes all old tokens server-side, so store
 * the fresh token it returns to keep THIS session valid.
 */
export function setPassword(body: { password: string; currentPassword?: string }) {
  return api.post<{ ok: boolean; token?: string }>("/api/auth/set-password", body).then((r) => {
    if (r.token) setToken(r.token);
    return r;
  });
}

export function logout() {
  clearToken();
}

// Full-page navigation to the provider (not fetch). Server redirects back to
// FRONTEND_URL/auth/callback#token=<jwt>.
export function oauthUrl(provider: "google" | "github"): string {
  return `${API_BASE}/api/auth/oauth/${provider}`;
}
