// Shared types for the multi-tenant server API (see FRONTEND_CHANGES.md).

export interface User {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  role: string;
  firstName: string | null;
  lastName: string | null;
  phoneDialCode: string | null;
  phoneNumber: string | null;
  mobileDialCode: string | null;
  mobileNumber: string | null;
  speciality: string | null;
  country: string | null;
  city: string | null;
  emailVerified: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Extended profile fields shared by register + profile update.
export interface ProfileInput {
  username?: string;
  firstName?: string;
  lastName?: string;
  phoneDialCode?: string;
  phoneNumber?: string;
  mobileDialCode?: string;
  mobileNumber?: string;
  speciality?: string;
  country?: string;
  city?: string;
}

export interface RegisterResponse {
  user: User;
  requiresVerification: boolean;
}

export type TestStatus = "success" | "fail" | null;

export interface Feed {
  id: string;
  url: string;
  name: string | null;
  notify: boolean;
  shareToStats: boolean;
  active: boolean;
  createdAt: string;
  lastStatus?: TestStatus;
  lastTestedAt?: string | null;
  lastError?: string | null;
}

export type LogLevel = "success" | "error" | "warning" | "info";
export interface LogLine {
  level: LogLevel;
  message: string;
}
export interface ActionResult {
  ok: boolean;
  logs: LogLine[];
  data?: unknown;
}

export interface ScheduleRun {
  id: string;
  scheduleId: string;
  job: string;
  ok: boolean;
  summary: string | null;
  error: string | null;
  durationMs: number;
  trigger: string;
  createdAt: string;
}

export type ChannelKind = "main" | "goat";

export interface Channel {
  id: string;
  kind: ChannelKind;
  botTokenMasked: string;
  chatId: string;
  active: boolean;
  lastStatus?: TestStatus;
  lastTestedAt?: string | null;
  lastError?: string | null;
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
  lastStatus?: TestStatus;
  lastRunAt?: string | null;
  lastError?: string | null;
}
