import { api, ApiError, getToken } from "./client";
import type { ActionResult, AdminUser, AdminUserDetail, LogLine } from "./types";

export interface BackfillStart {
  success?: boolean;
  jobId: string;
  status: string;
  error?: string;
}

export interface BackfillStatus {
  jobId: string;
  status: "running" | "done" | "failed" | "idle";
  phase: string;
  monthsDone: number;
  daysDone: number;
  read: number;
  inserted: number;
  logs: LogLine[];
  error?: string | null;
  startedAt?: string;
  finishedAt?: string;
}

async function action(path: string): Promise<ActionResult> {
  try {
    return await api.post<ActionResult>(path);
  } catch (e) {
    if (e instanceof ApiError && e.body && typeof e.body === "object" && "logs" in e.body) {
      return e.body as ActionResult;
    }
    return {
      ok: false,
      logs: [{ level: "error", message: e instanceof Error ? e.message : "request failed" }],
    };
  }
}

export const admin = {
  users: () => api.get<{ users: AdminUser[] }>("/api/admin/users").then((r) => r.users),
  user: (id: string) => api.get<AdminUserDetail>(`/api/admin/users/${id}`),
  setAccess: (id: string, body: { revokedPages?: string[]; role?: "user" | "admin" }) =>
    api.patch<{ user: { id: string; role: string; revokedPages: string[] } }>(
      `/api/admin/users/${id}`,
      body,
    ),
  remove: (id: string, password: string) =>
    api.delete<{ ok: boolean; reassigned: number }>(`/api/admin/users/${id}`, { body: { password } }),
  rebuildStats: () =>
    api.post<{ ok: boolean; ms: number; days: number; total: number; logs: LogLine[] }>(
      "/api/admin/stats/rebuild",
    ),
  testFeed: (id: string) => action(`/api/admin/feeds/${id}/test`),
  sendFeed: (id: string) => action(`/api/admin/feeds/${id}/send`),
  testChannel: (id: string) => action(`/api/admin/channels/${id}/test`),
  runSchedule: (id: string) => action(`/api/admin/schedules/${id}/run`),

  // g2 backfill: hits the SAME-ORIGIN frontend route, which forwards R2 creds
  // (from host env) + the admin JWT to the cron-server. R2 secrets stay server-side.
  // The import is async: START returns a jobId, then poll backfillStatus().
  backfillG2Start: async (): Promise<BackfillStart> => {
    const token = getToken();
    const res = await fetch("/api/admin/backfill-r2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    // 409 = one already running: re-attach to it instead of erroring.
    if (res.status === 409 && data?.jobId) return data as BackfillStart;
    if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
    return data as BackfillStart;
  },

  backfillStatus: async (jobId: string): Promise<BackfillStatus> => {
    const token = getToken();
    const res = await fetch(`/api/admin/backfill-r2?jobId=${encodeURIComponent(jobId)}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
    return data as BackfillStatus;
  },
};

// Page keys used by the per-user ban system (admin) + RouteGuard enforcement.
export const GATED_PAGES: { key: string; label: string }[] = [
  { key: "stats", label: "Stats" },
  { key: "applied", label: "Tracking" },
  { key: "rss", label: "RSS App" },
  { key: "messages", label: "Messages" },
  { key: "dashboard", label: "Dashboard" },
  { key: "feeds", label: "Feeds" },
  { key: "telegram", label: "Telegram" },
  { key: "jfs", label: "JFS" },
  { key: "schedules", label: "Schedules" },
];
