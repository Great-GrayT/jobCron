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
  rebuildStats: (operations: RebuildOp[]) =>
    api.post<{ ok: boolean; ms: number; ran: string[]; logs: LogLine[] }>(
      "/api/admin/stats/rebuild",
      { operations },
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

  // DESTRUCTIVE | empties selected datasets. Server re-verifies admin role AND
  // the acting admin's password; datasets are an allowlist (no table names sent).
  cleanDb: (datasets: CleanDataset[], password: string) =>
    api.post<CleanResult>("/api/admin/clean-db", { datasets, password }),
};

export type RebuildOp =
  | "clampDates"
  | "rebuildRollups"
  | "pruneDescriptions"
  | "pruneRunHistory"
  | "purgeUnverified"
  | "pruneUrlCache";

// Mirrors the server OPERATIONS allowlist (stats/rebuild route). `default` items
// are pre-checked (the common "fix dates + rebuild" path).
export const REBUILD_OPS: { key: RebuildOp; label: string; desc: string; default?: boolean }[] = [
  { key: "clampDates", label: "Fix publication dates", desc: "Clamp out-of-range posted dates (before 2026 / in the future) to now.", default: true },
  { key: "rebuildRollups", label: "Rebuild stats rollups", desc: "Recompute the summary tables (velocity, heatmap, hourly, monthly) from raw jobs.", default: true },
  { key: "pruneDescriptions", label: "Prune old descriptions", desc: "Delete job description rows past the retention window." },
  { key: "pruneRunHistory", label: "Prune run history", desc: "Trim old schedule + cron run records." },
  { key: "purgeUnverified", label: "Purge unverified users", desc: "Remove accounts that never verified their email." },
  { key: "pruneUrlCache", label: "Prune sent-URL cache", desc: "Drop expired Telegram dedup entries." },
];

export type CleanDataset = "jobs" | "applied" | "dedup" | "backfills";

export interface CleanResult {
  ok: boolean;
  cleared: string[];
  counts: Record<string, number>;
  tables: string[];
}

// Mirrors the server allowlist (FUNC-cleanup-repo). Account data is NOT clearable.
export const CLEAN_DATASETS: { key: CleanDataset; label: string; desc: string }[] = [
  { key: "jobs", label: "Job data + stats", desc: "All jobs, descriptions, user links and stats rollups. Repopulate via g2 import + Rebuild stats." },
  { key: "applied", label: "Applied / tracking", desc: "Every user's applied-job records." },
  { key: "dedup", label: "Dedup ledger", desc: "Telegram sent-URL history (old jobs may re-notify after clearing)." },
  { key: "backfills", label: "Backfill history", desc: "Past import run records." },
];

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
