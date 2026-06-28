import { api, ApiError } from "./client";
import type {
  ActionResult,
  Channel,
  ChannelKind,
  Feed,
  GoatConfig,
  Schedule,
  ScheduleJob,
  ScheduleRun,
} from "./types";

// Test/send/run actions return {ok,logs} and use 422 for "ran but failed" — we
// still want the logs in that case, so unwrap the ApiError body instead of throwing.
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

// ---- feeds -------------------------------------------------------------------

export const feeds = {
  list: () => api.get<{ feeds: Feed[] }>("/api/me/feeds").then((r) => r.feeds),
  create: (body: { url: string; name?: string; notify?: boolean; shareToStats?: boolean }) =>
    api.post<{ feed: Feed }>("/api/me/feeds", body).then((r) => r.feed),
  update: (
    id: string,
    body: { name?: string; notify?: boolean; shareToStats?: boolean; active?: boolean },
  ) => api.patch<{ feed: Feed }>(`/api/me/feeds/${id}`, body).then((r) => r.feed),
  remove: (id: string) => api.delete<{ ok: boolean }>(`/api/me/feeds/${id}`).then(() => undefined),
  test: (id: string) => action(`/api/me/feeds/${id}/test`),
  send: (id: string) => action(`/api/me/feeds/${id}/send`),
};

// ---- telegram channels -------------------------------------------------------

export const channels = {
  list: () => api.get<{ channels: Channel[] }>("/api/me/channels").then((r) => r.channels),
  upsert: (body: { kind: ChannelKind; botToken: string; chatId: string; active?: boolean }) =>
    api.post<{ channel: Channel }>("/api/me/channels", body).then((r) => r.channel),
  remove: (id: string) =>
    api.delete<{ ok: boolean }>(`/api/me/channels/${id}`).then(() => undefined),
  test: (id: string) => action(`/api/me/channels/${id}/test`),
};

// ---- goat filters ------------------------------------------------------------

export const goat = {
  get: () => api.get<{ config: GoatConfig | null }>("/api/me/goat"),
  put: (config: GoatConfig) => api.put<{ config: GoatConfig }>("/api/me/goat", config),
};

// ---- schedules ---------------------------------------------------------------

export const schedules = {
  list: () => api.get<{ schedules: Schedule[] }>("/api/me/schedules").then((r) => r.schedules),
  create: (body: {
    job: ScheduleJob;
    intervalMinutes: number;
    cronExpr?: string | null;
    enabled?: boolean;
    scrapeSearch?: string;
    scrapeCountries?: string;
    scrapeTimeFilter?: number;
  }) => api.post<{ schedule: Schedule }>("/api/me/schedules", body).then((r) => r.schedule),
  update: (id: string, body: Partial<Omit<Schedule, "id">>) =>
    api.patch<{ schedule: Schedule }>(`/api/me/schedules/${id}`, body).then((r) => r.schedule),
  remove: (id: string) =>
    api.delete<{ ok: boolean }>(`/api/me/schedules/${id}`).then(() => undefined),
  run: (id: string) => action(`/api/me/schedules/${id}/run`),
  runs: (id: string) =>
    api.get<{ runs: ScheduleRun[] }>(`/api/me/schedules/${id}/runs`).then((r) => r.runs),
};
