import { api } from "./client";

// Per-user applied jobs (server scope=me). Mirrors the legacy R2 store shape.
export interface AppliedJob {
  id: string;
  jobId: string;
  appliedAt: string;
  jobTitle: string;
  company: string;
  location: string;
  city?: string;
  country?: string;
  region?: string;
  originalUrl: string;
  postedDate: string;
  roleType?: string;
  industry?: string;
}

export interface AppliedStats {
  totalApplications: number;
  applicationsByMonth: Record<string, number>;
  lastUpdated: string;
}

export const applied = {
  list: (month?: string) =>
    api.get<{ success: boolean; data: AppliedJob[]; stats: AppliedStats }>("/api/me/applied", {
      query: { month },
    }),
  remove: (id: string) => api.delete<{ ok: boolean }>(`/api/me/applied/${id}`),
  clear: () => api.delete<{ ok: boolean; removed: number }>("/api/me/applied"),
};
