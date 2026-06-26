// Shared types for the multi-tenant server API (see FRONTEND_CHANGES.md).

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Feed {
  id: string;
  url: string;
  name: string | null;
  notify: boolean;
  shareToStats: boolean;
  active: boolean;
  createdAt: string;
}

export type ChannelKind = "main" | "goat";

export interface Channel {
  id: string;
  kind: ChannelKind;
  botTokenMasked: string;
  chatId: string;
  active: boolean;
}

export interface GoatConfig {
  enabled: boolean;
  requireIndustry: boolean;
  requireCategory: boolean;
  categories: string[];
  industries: string[];
  seniorities: string[];
  companyBlacklist: string[];
  vipCompanies: string[];
  locationTerms: string[];
}

export type ScheduleJob = "check-jobs" | "stats-ingest" | "scrape";

export interface Schedule {
  id: string;
  job: ScheduleJob;
  intervalMinutes: number;
  enabled: boolean;
  scrapeSearch?: string | null;
  scrapeCountries?: string | null;
  scrapeTimeFilter?: number | null;
}
