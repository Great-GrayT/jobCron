import { api } from "./client";

// ---- shapes the Stats page consumes -----------------------------------------
// These mirror the legacy R2 shapes so the existing render layer is untouched;
// they are now assembled from the server's per-component aggregation endpoints.

export interface SalaryStats {
  totalWithSalary: number;
  averageSalary: number | null;
  medianSalary: number | null;
  byIndustry: Record<string, { avg: number; median: number; count: number }>;
  bySeniority: Record<string, { avg: number; median: number; count: number }>;
  byLocation: Record<string, { avg: number; median: number; count: number }>;
  byCountry: Record<string, { avg: number; median: number; count: number }>;
  byCity: Record<string, { avg: number; median: number; count: number }>;
  byCurrency: Record<string, number>;
  salaryRanges: {
    "0-30k": number;
    "30-50k": number;
    "50-75k": number;
    "75-100k": number;
    "100-150k": number;
    "150k+": number;
  };
}

export interface MonthlyStatistics {
  totalJobs: number;
  byDate: Record<string, number>;
  byIndustry: Record<string, number>;
  byCertificate: Record<string, number>;
  byKeyword: Record<string, number>;
  bySeniority: Record<string, number>;
  byLocation: Record<string, number>;
  byCountry: Record<string, number>;
  byCity: Record<string, number>;
  byRegion: Record<string, number>;
  byCompany: Record<string, number>;
  bySoftware?: Record<string, number>;
  byProgrammingSkill?: Record<string, number>;
  byYearsExperience?: Record<string, number>;
  byAcademicDegree?: Record<string, number>;
  byRoleType?: Record<string, number>;
  byRoleCategory?: Record<string, number>;
  byHour?: Record<string, number>;
  byDayHour?: Record<string, number>;
  salaryStats?: SalaryStats;
}

export interface JobStatistic {
  id: string;
  title: string;
  company: string;
  location: string;
  country: string | null;
  city: string | null;
  region: "Europe" | "America" | "Middle East" | null;
  url: string;
  postedDate: string;
  extractedDate: string;
  keywords: string[];
  certificates: string[];
  industry: string;
  seniority: string;
  description: string;
  salary?: { min: number | null; max: number | null; currency: string } | null;
  roleType?: string | null;
  roleCategory?: string | null;
}

// ---- filter serialization ----------------------------------------------------
// The Stats page keeps arrays per facet (multi-select UI). The server takes one
// value per facet, so we send the first selected value of each.

export interface ActiveFilters {
  industry: string[];
  certificate: string[];
  seniority: string[];
  location: string[];
  company: string[];
  keyword: string[];
  country: string[];
  city: string[];
  software: string[];
  programmingSkill: string[];
  yearsExperience: string[];
  academicDegree: string[];
  region: string[];
  roleType: string[];
  roleCategory: string[];
}

export type Scope = "public" | "me";

export interface StatsQuery {
  filters: ActiveFilters;
  viewMode: string; // "all" | "current" | "YYYY-MM"
  selectedDate?: string | null; // YYYY-MM-DD
  q?: string;
  scope?: Scope;
}

type QueryRecord = Record<string, string | number | boolean | undefined>;

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const first = (arr: string[]): string | undefined => (arr.length ? arr[0] : undefined);

export function serializeFilters(q: StatsQuery): QueryRecord {
  const f = q.filters;
  const out: QueryRecord = { scope: q.scope ?? "public" };

  // Time window: viewMode -> month, selectedDate -> from/to day window.
  if (q.selectedDate) {
    const day = q.selectedDate;
    out.from = `${day}T00:00:00.000Z`;
    const next = new Date(`${day}T00:00:00.000Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    out.to = next.toISOString();
  } else if (q.viewMode === "current") {
    out.month = currentMonth();
  } else if (q.viewMode !== "all") {
    out.month = q.viewMode; // YYYY-MM archive
  }

  out.industry = first(f.industry);
  out.seniority = first(f.seniority);
  out.country = first(f.country);
  out.region = first(f.region);
  out.city = first(f.city);
  out.roleType = first(f.roleType);
  out.roleCategory = first(f.roleCategory);
  out.company = first(f.company);
  out.keyword = first(f.keyword);
  out.certificate = first(f.certificate);
  out.software = first(f.software);
  out.programming = first(f.programmingSkill);
  out.degree = first(f.academicDegree);

  // yearsExperience is a numeric bucket ("3") -> exact experience filter.
  const exp = first(f.yearsExperience);
  if (exp && /^\d+$/.test(exp)) {
    out.expMin = Number(exp);
    out.expMax = Number(exp);
  }

  if (q.q) out.q = q.q;
  return out;
}

// ---- server response shapes --------------------------------------------------

type Facet = Record<string, number>;
type Wrapped<T> = { success: boolean; metric: string; data: T };

async function metric<T>(name: string, query: QueryRecord, limit?: number): Promise<T> {
  const res = await api.get<Wrapped<T>>(`/api/v1/stats/${name}`, {
    query: { ...query, ...(limit ? { limit } : {}) },
  });
  return res.data;
}

export function fetchSummary(q: StatsQuery): Promise<{ total: number; withSalary: number }> {
  return metric<{ total: number; withSalary: number }>("summary", serializeFilters(q));
}

// ---- assemble the MonthlyStatistics the page expects -------------------------

export async function fetchStatistics(q: StatsQuery): Promise<MonthlyStatistics> {
  const query = serializeFilters(q);
  const LIMIT = 100;

  const [
    summary,
    industries,
    seniority,
    roles,
    roleTypes,
    employers,
    locations,
    skills,
    certifications,
    degrees,
    experience,
    timeline,
    heatmap,
    hourly,
  ] = await Promise.all([
    metric<{ total: number; withSalary: number }>("summary", query),
    metric<Facet>("industries", query, LIMIT),
    metric<Facet>("seniority", query, LIMIT),
    metric<Facet>("roles", query, LIMIT),
    metric<Facet>("role-types", query, LIMIT),
    metric<Facet>("employers", query, LIMIT),
    metric<{ countries: Facet; regions: Facet; cities: Facet }>("locations", query, LIMIT),
    metric<{ keywords: Facet; software: Facet; programming: Facet }>("skills", query, LIMIT),
    metric<Facet>("certifications", query, LIMIT),
    metric<Facet>("degrees", query, LIMIT),
    metric<Facet>("experience", query, LIMIT),
    metric<{ series: string | null; points: { d: string; c: number }[] }>("timeline", query),
    metric<{ dow: number; hour: number; c: number }[]>("heatmap", query),
    metric<{ hour: number; c: number }[]>("hourly", query),
  ]);

  const byDate: Facet = {};
  for (const p of timeline.points) byDate[p.d] = p.c;

  const byHour: Facet = {};
  for (const r of hourly) byHour[String(r.hour).padStart(2, "0")] = r.c;

  const byDayHour: Facet = {};
  for (const r of heatmap) byDayHour[`${r.dow}-${r.hour}`] = r.c;

  return {
    totalJobs: summary.total,
    byDate,
    byIndustry: industries,
    byCertificate: certifications,
    byKeyword: skills.keywords,
    bySeniority: seniority,
    byLocation: {},
    byCountry: locations.countries,
    byCity: locations.cities,
    byRegion: locations.regions,
    byCompany: employers,
    bySoftware: skills.software,
    byProgrammingSkill: skills.programming,
    byYearsExperience: experience,
    byAcademicDegree: degrees,
    byRoleType: roleTypes,
    byRoleCategory: roles,
    byHour,
    byDayHour,
    salaryStats: undefined,
  };
}

/** Distinct YYYY-MM posting months present in the data (for the month picker). */
export function fetchMonths(scope: Scope = "public"): Promise<string[]> {
  return metric<string[]>("months", { scope });
}

// ---- jobs list / detail ------------------------------------------------------

export interface JobsPage {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  jobs: JobStatistic[];
}

export async function fetchJobs(
  q: StatsQuery,
  opts: { page?: number; pageSize?: number; sort?: string; order?: "asc" | "desc"; withDescription?: boolean } = {},
): Promise<JobsPage> {
  const query = serializeFilters(q);
  const res = await api.get<{ success: boolean } & JobsPage>("/api/v1/jobs", {
    query: {
      ...query,
      page: opts.page ?? 1,
      pageSize: opts.pageSize ?? 50,
      sort: opts.sort ?? "postedDate",
      order: opts.order ?? "desc",
      withDescription: opts.withDescription ?? false,
    },
  });
  return res;
}

export async function fetchJobDescription(id: string): Promise<string> {
  const res = await api.get<{ success: boolean; id: string; description: string }>(
    `/api/v1/jobs/${id}`,
  );
  return res.description ?? "";
}

export interface FilterOptions {
  industry: string[];
  seniority: string[];
  country: string[];
  region: string[];
  roleCategory: string[];
}

export function fetchOptions(scope: Scope = "public"): Promise<FilterOptions> {
  return metric<FilterOptions>("options", { scope });
}
