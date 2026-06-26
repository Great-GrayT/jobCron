import { api } from "./client";
import type { Channel, ChannelKind, Feed, GoatConfig, Schedule, ScheduleJob } from "./types";

// ---- feeds -------------------------------------------------------------------

export const feeds = {
  list: () => api.get<Feed[]>("/api/me/feeds"),
  create: (body: { url: string; name?: string; notify?: boolean; shareToStats?: boolean }) =>
    api.post<Feed>("/api/me/feeds", body),
  update: (
    id: string,
    body: { name?: string; notify?: boolean; shareToStats?: boolean; active?: boolean },
  ) => api.patch<Feed>(`/api/me/feeds/${id}`, body),
  remove: (id: string) => api.delete<void>(`/api/me/feeds/${id}`),
};

// ---- telegram channels -------------------------------------------------------

export const channels = {
  list: () => api.get<Channel[]>("/api/me/channels"),
  upsert: (body: { kind: ChannelKind; botToken: string; chatId: string; active?: boolean }) =>
    api.post<Channel>("/api/me/channels", body),
  remove: (id: string) => api.delete<void>(`/api/me/channels/${id}`),
};

// ---- goat filters ------------------------------------------------------------

export const goat = {
  get: () => api.get<{ config: GoatConfig | null }>("/api/me/goat"),
  put: (config: GoatConfig) => api.put<{ config: GoatConfig }>("/api/me/goat", config),
};

// ---- schedules ---------------------------------------------------------------

export const schedules = {
  list: () => api.get<Schedule[]>("/api/me/schedules"),
  create: (body: {
    job: ScheduleJob;
    intervalMinutes: number;
    enabled?: boolean;
    scrapeSearch?: string;
    scrapeCountries?: string;
    scrapeTimeFilter?: number;
  }) => api.post<Schedule>("/api/me/schedules", body),
  update: (id: string, body: Partial<Omit<Schedule, "id">>) =>
    api.patch<Schedule>(`/api/me/schedules/${id}`, body),
  remove: (id: string) => api.delete<void>(`/api/me/schedules/${id}`),
};
