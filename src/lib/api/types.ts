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
  avatarUrl: string | null;
  avatarData: string | null;
  revokedPages: string[];
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
  avatarUrl?: string;
  avatarData?: string;
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
  cronExpr?: string | null;
  lastStatus?: TestStatus;
  lastRunAt?: string | null;
  lastError?: string | null;
}

// ---- messaging ----
export interface MessageUser {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  /** Optional — present when the API exposes the sender's role (used to gild admin bubbles). */
  role?: string | null;
}
export interface Message {
  id: string;
  fromUserId: string;
  toUserId: string | null;
  toAdmin: boolean;
  subject: string | null;
  body: string;
  readAt: string | null;
  createdAt: string;
  from: MessageUser;
  to: MessageUser | null;
}

// ---- admin ----
export interface AdminUser {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  role: string;
  emailVerified: boolean;
  revokedPages: string[];
  avatarUrl: string | null;
  avatarData?: string | null;
  createdAt: string;
  _count: { feeds: number; channels: number; schedules: number; appliedJobs: number };
}
export interface AdminUserDetail {
  user: AdminUser & {
    phoneDialCode: string | null; phoneNumber: string | null;
    mobileDialCode: string | null; mobileNumber: string | null;
    speciality: string | null; country: string | null; city: string | null;
  };
  feeds: Feed[];
  channels: Channel[];
  schedules: Schedule[];
  applied: import("./applied").AppliedJob[];
}
