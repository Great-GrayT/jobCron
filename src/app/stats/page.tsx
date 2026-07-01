"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { BarChart3, TrendingUp, RefreshCw, Loader2, X, Filter, Calendar, Briefcase, Award, Target, MapPin, Building2, Zap, Users, DollarSign, TrendingDown, AlertCircle, Sparkles, Activity, Globe } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Area } from 'recharts';
import WorldMap from '@/components/WorldMap';
import {
  AnimatedNumber,
  IndustryTreemap,
  SkillsTagCloud,
  PostingHeatmap,
  CertsBump,
  CHART_COLORS,
} from '@/components/charts';
import { AdminShell } from "@/components/AdminShell";
import { featuresMenu } from "@/components/navMenu";
import { useAuth } from "@/context/AuthContext";
import { SearchFilterPanel } from "@/components/SearchFilterPanel";
import {
  fetchStatistics,
  fetchSummary,
  fetchJobs,
  fetchJobDescription,
  fetchMonths,
  type MonthlyStatistics,
  type JobStatistic,
  type ActiveFilters,
} from "@/lib/api/stats";
import "./stats.css";

// MonthlyStatistics / JobStatistic / ActiveFilters now come from the server API
// client (src/lib/api/stats.ts). StatsData is a thin synthetic wrapper kept so
// the existing render layer stays untouched.
interface StatsData {
  currentMonth: {
    month: string;
    lastUpdated: string;
    jobCount: number;
    statistics: MonthlyStatistics;
  };
  summary: {
    totalJobsAllTime: number;
    currentMonth: string;
    availableArchives: string[];
    overallStatistics: {
      totalMonths: number;
      averageJobsPerMonth: number;
    };
  };
}

const EMPTY_FILTERS: ActiveFilters = {
  industry: [], certificate: [], seniority: [], location: [], company: [],
  keyword: [], country: [], city: [], software: [], programmingSkill: [],
  yearsExperience: [], academicDegree: [], region: [], roleType: [], roleCategory: [],
};

function currentMonthStr(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function StatsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  // Filtered aggregates that drive every chart (server already applied filters).
  const [filteredStatistics, setFilteredStatistics] = useState<MonthlyStatistics | null>(null);
  // Unfiltered aggregates for the current view — powers the filter dropdowns.
  const [baseStatistics, setBaseStatistics] = useState<MonthlyStatistics | null>(null);
  const [jobs, setJobs] = useState<JobStatistic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<string>('all');
  const [timelineDays, setTimelineDays] = useState<number>(0); // 0 = full range
  // "public" = all shared feeds (default); "me" = only the user's own feeds.
  const [scope, setScope] = useState<'public' | 'me'>('public');
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({ ...EMPTY_FILTERS });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [textSearch, setTextSearch] = useState<string>('');
  const [debouncedTextSearch, setDebouncedTextSearch] = useState<string>('');
  const [reloadKey, setReloadKey] = useState(0);
  const [hoveredJob, setHoveredJob] = useState<JobStatistic | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveringJobId, setHoveringJobId] = useState<string | null>(null);
  const [isMouseOverPopup, setIsMouseOverPopup] = useState<boolean>(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const loadingBarRef = useRef<HTMLDivElement>(null);
  const jobsBarRef = useRef<HTMLDivElement>(null);
  const [jobsLoading, setJobsLoading] = useState<boolean>(false);
  const [descriptionCache, setDescriptionCache] = useState<Map<string, string>>(new Map());
  const [loadingDescriptionsDate, setLoadingDescriptionsDate] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('INITIALIZING...');
  const [loadingProgress, setLoadingProgress] = useState<number>(0);

  // Manual refresh (LOAD DATA button) — bumps the key both data effects watch.
  const loadStatistics = () => setReloadKey(k => k + 1);

  // Debounce text search to avoid refetching on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTextSearch(textSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [textSearch]);

  // Sync loading bar widths imperatively (avoids inline-style linter warnings)
  useEffect(() => {
    if (loadingBarRef.current) loadingBarRef.current.style.width = `${loadingProgress}%`;
    if (jobsBarRef.current) jobsBarRef.current.style.width = `${loadingProgress}%`;
  }, [loadingProgress]);

  // Base load — unfiltered aggregates for the current view + the summary cards.
  // Powers the filter dropdowns, so it ignores the active facet filters.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setLoadingStep('CONNECTING TO DATA LAYER...');
    setLoadingProgress(15);
    const month = currentMonthStr();
    const baseQ = { filters: EMPTY_FILTERS, viewMode, selectedDate, q: debouncedTextSearch || undefined, scope };
    const allTimeQ = { filters: EMPTY_FILTERS, viewMode: 'all', selectedDate: null, scope };
    const monthQ = { filters: EMPTY_FILTERS, viewMode: 'current', selectedDate: null, scope };
    setLoadingStep('LOADING MARKET STATISTICS...');
    setLoadingProgress(40);
    Promise.all([fetchStatistics(baseQ), fetchSummary(allTimeQ), fetchSummary(monthQ), fetchMonths(scope)])
      .then(([base, allTime, thisMonth, months]) => {
        if (cancelled) return;
        setBaseStatistics(base);
        setStatsData({
          currentMonth: {
            month,
            lastUpdated: new Date().toISOString(),
            jobCount: thisMonth.total,
            statistics: base,
          },
          summary: {
            totalJobsAllTime: allTime.total,
            currentMonth: month,
            availableArchives: months,
            overallStatistics: { totalMonths: months.length || 1, averageJobsPerMonth: thisMonth.total },
          },
        });
        setLoadingStep('READY');
        setLoadingProgress(100);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load statistics');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [viewMode, selectedDate, debouncedTextSearch, scope, reloadKey]);

  // Filtered load — aggregates + job rows for the active filter set.
  useEffect(() => {
    let cancelled = false;
    setJobsLoading(true);
    setLoadingStep('LOADING JOB RECORDS...');
    setLoadingProgress(85);
    const q = { filters: activeFilters, viewMode, selectedDate, q: debouncedTextSearch || undefined, scope };
    Promise.all([
      fetchStatistics(q),
      fetchJobs(q, { pageSize: 200, withDescription: false }),
    ])
      .then(([stats, jobsPage]) => {
        if (cancelled) return;
        setFilteredStatistics(stats);
        setJobs(jobsPage.jobs);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load jobs');
      })
      .finally(() => {
        if (!cancelled) {
          setJobsLoading(false);
          setLoadingStep('READY');
          setLoadingProgress(100);
        }
      });
    return () => { cancelled = true; };
  }, [activeFilters, viewMode, selectedDate, debouncedTextSearch, scope, reloadKey]);

  // Filter management
  const toggleFilter = (category: keyof ActiveFilters, value: string) => {
    setActiveFilters(prev => {
      const current = prev[category];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const clearAllFilters = () => {
    setActiveFilters({
      industry: [],
      certificate: [],
      seniority: [],
      location: [],
      company: [],
      keyword: [],
      country: [],
      city: [],
      software: [],
      programmingSkill: [],
      yearsExperience: [],
      academicDegree: [],
      region: [],
      roleType: [],
      roleCategory: [],
    });
    setSelectedDate(null);
  };

  const removeFilter = (category: keyof ActiveFilters, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [category]: prev[category].filter(v => v !== value),
    }));
  };

  const hasActiveFilters = Object.values(activeFilters).some(arr => arr.length > 0) || selectedDate !== null || debouncedTextSearch.length > 0;

  // Normalize city names
  const normalizeCity = (cityName: string | null): string | null => {
    if (!cityName) return null;

    const normalized = cityName
      .replace(/\s+Area$/i, '')
      .replace(/^City of\s+/i, '')
      .replace(/^Greater\s+/i, '')
      .trim();

    // Filter out non-city names
    if (/^England$/i.test(normalized) ||
        /^Scotland$/i.test(normalized) ||
        /^Wales$/i.test(normalized) ||
        /^United Kingdom$/i.test(normalized)) {
      return null;
    }

    return normalized;
  };

  // Available filter options come from the UNFILTERED aggregates for the current
  // view (baseStatistics), so the dropdowns stay stable as filters are applied.
  const availableFilterOptions = useMemo(() => {
    const empty: Record<keyof ActiveFilters, Array<{ value: string; count: number }>> = {
      industry: [], certificate: [], seniority: [], location: [], company: [],
      keyword: [], country: [], city: [], software: [], programmingSkill: [],
      yearsExperience: [], academicDegree: [], region: [], roleType: [], roleCategory: [],
    };
    const stats = baseStatistics;
    if (!stats) return empty;

    const toSortedArray = (record: Record<string, number> | undefined): Array<{ value: string; count: number }> =>
      Object.entries(record || {})
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);

    return {
      industry: toSortedArray(stats.byIndustry),
      certificate: toSortedArray(stats.byCertificate),
      seniority: toSortedArray(stats.bySeniority),
      location: toSortedArray(stats.byLocation),
      company: toSortedArray(stats.byCompany),
      keyword: toSortedArray(stats.byKeyword),
      country: toSortedArray(stats.byCountry),
      city: toSortedArray(stats.byCity),
      software: toSortedArray(stats.bySoftware),
      programmingSkill: toSortedArray(stats.byProgrammingSkill),
      yearsExperience: toSortedArray(stats.byYearsExperience),
      academicDegree: toSortedArray(stats.byAcademicDegree),
      region: toSortedArray(stats.byRegion),
      roleType: toSortedArray(stats.byRoleType),
      roleCategory: toSortedArray(stats.byRoleCategory),
    };
  }, [baseStatistics]);

  // Jobs are already filtered server-side; just merge any on-demand descriptions.
  const filteredJobs = useMemo(
    () => jobs.map(job => ({ ...job, description: descriptionCache.get(job.id) ?? job.description })),
    [jobs, descriptionCache],
  );


  // Helper function to check if value should be filtered out
  const shouldFilterOut = (value: string): boolean => {
    const normalizedValue = value.toLowerCase().trim();
    return normalizedValue === 'n/a' ||
           normalizedValue === 'na' ||
           normalizedValue === 'unknown' ||
           normalizedValue === 'not specified' ||
           normalizedValue === '' ||
           normalizedValue === 'null';
  };

  // Chart data functions
  const getIndustryChartData = () => {
    const stats = filteredStatistics;
    if (!stats) return [];
    return Object.entries(stats.byIndustry)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  };

  const getSeniorityChartData = () => {
    const stats = filteredStatistics;
    if (!stats) return [];
    return Object.entries(stats.bySeniority)
      .filter(([name]) => !shouldFilterOut(name))
      .map(([name, value]) => ({ name, value }));
  };

  const getDateChartData = () => {
    const stats = filteredStatistics;
    if (!stats) return [];
    const entries = Object.entries(stats.byDate)
      .sort(([a], [b]) => a.localeCompare(b));
    // 0 = show the whole available range; slider trims to the last N days.
    const limit = timelineDays > 0 ? timelineDays : entries.length;
    return entries
      .slice(-limit)
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        jobs: count,
        rawDate: date,
      }));
  };
  const timelineTotalDays = Object.keys(filteredStatistics?.byDate ?? {}).length;

  const getCertificateChartData = () => {
    const stats = filteredStatistics;
    if (!stats) return [];
    return Object.entries(stats.byCertificate)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  };

  const getTopKeywords = () => {
    const stats = filteredStatistics;
    if (!stats) return [];
    return Object.entries(stats.byKeyword)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15);
  };

  const getLocationChartData = () => {
    const stats = filteredStatistics;
    if (!stats) return [];
    return Object.entries(stats.byLocation)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  };

  const getCompanyChartData = () => {
    const stats = filteredStatistics;
    if (!stats) return [];
    return Object.entries(stats.byCompany)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  };

  // Geographic data helpers
  const getRegionData = () => {
    const stats = filteredStatistics;
    if (!stats || !stats.byRegion) return [];
    return Object.entries(stats.byRegion)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  };

  const getCountryData = (limit?: number) => {
    const stats = filteredStatistics;
    if (!stats || !stats.byCountry) return [];
    const sorted = Object.entries(stats.byCountry)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
    return limit ? sorted.slice(0, limit) : sorted;
  };

  const getCityData = () => {
    const stats = filteredStatistics;
    if (!stats || !stats.byCity) return [];
    return Object.entries(stats.byCity)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 12)
      .map(([name, value]) => ({ name, value }));
  };

  // Color mapping for regions
  const getRegionColor = (region: string) => {
    const colors: Record<string, string> = {
      'Europe': '#06ffa5',
      'America': '#ffd700',
      'Middle East': '#ff6b6b',
    };
    return colors[region] || '#06ffa5';
  };

  // Salary data helpers
  const formatSalary = (amount: number | null) => {
    if (!amount) return 'N/A';
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}k`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const getSalaryRangeChartData = () => {
    const stats = filteredStatistics;
    if (!stats?.salaryStats) return [];
    const ranges = stats.salaryStats.salaryRanges;
    return [
      { range: '$0-30k', count: ranges['0-30k'] },
      { range: '$30-50k', count: ranges['30-50k'] },
      { range: '$50-75k', count: ranges['50-75k'] },
      { range: '$75-100k', count: ranges['75-100k'] },
      { range: '$100-150k', count: ranges['100-150k'] },
      { range: '$150k+', count: ranges['150k+'] },
    ].filter(item => item.count > 0);
  };

  const getSalaryByIndustryData = () => {
    const stats = filteredStatistics;
    if (!stats?.salaryStats) return [];
    return Object.entries(stats.salaryStats.byIndustry)
      .map(([name, data]) => ({ name, avg: data.avg, median: data.median, count: data.count }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8);
  };

  const getSalaryBySeniorityData = () => {
    const stats = filteredStatistics;
    if (!stats?.salaryStats) return [];
    return Object.entries(stats.salaryStats.bySeniority)
      .map(([name, data]) => ({ name, avg: data.avg, median: data.median, count: data.count }))
      .sort((a, b) => {
        const order: Record<string, number> = { 'Entry': 1, 'Mid': 2, 'Senior': 3, 'Management': 4, 'Executive': 5 };
        return (order[a.name] || 0) - (order[b.name] || 0);
      });
  };

  // Market insights with useMemo for performance
  const marketInsights = useMemo(() => {
    if (!statsData) return [];

    const insights: Array<{type: string; priority: string; title: string; description: string}> = [];
    const stats = filteredStatistics;

    if (!stats) return insights;

    // Salary insights
    if (stats.salaryStats && stats.salaryStats.totalWithSalary > 0) {
      const salaryPercentage = (stats.salaryStats.totalWithSalary / stats.totalJobs) * 100;

      if (salaryPercentage >= 30) {
        insights.push({
          type: 'salary',
          priority: 'high',
          title: 'High Salary Transparency',
          description: `${salaryPercentage.toFixed(0)}% of jobs include salary information`
        });
      }

      if (stats.salaryStats.averageSalary) {
        insights.push({
          type: 'salary',
          priority: 'medium',
          title: `Average Salary: ${formatSalary(stats.salaryStats.averageSalary)}`,
          description: `Median: ${formatSalary(stats.salaryStats.medianSalary)} across ${stats.salaryStats.totalWithSalary} positions`
        });
      }
    }

    // Top hiring companies
    const topCompanies = Object.entries(stats.byCompany)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    if (topCompanies.length > 0 && topCompanies[0][1] >= 5) {
      insights.push({
        type: 'trend',
        priority: 'high',
        title: 'Top Hiring Companies',
        description: `${topCompanies.map(([name, count]) => `${name} (${count})`).join(', ')}`
      });
    }

    // Hot skills
    const topSkills = Object.entries(stats.byKeyword)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    if (topSkills.length > 0) {
      insights.push({
        type: 'skill',
        priority: 'medium',
        title: 'Most In-Demand Skills',
        description: topSkills.map(([skill]) => skill).join(', ')
      });
    }

    // Industry distribution
    const topIndustries = Object.entries(stats.byIndustry)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    if (topIndustries.length > 0) {
      const topIndustry = topIndustries[0];
      const percentage = ((topIndustry[1] / stats.totalJobs) * 100).toFixed(0);
      insights.push({
        type: 'industry',
        priority: 'medium',
        title: `${topIndustry[0]} Leads Market`,
        description: `${percentage}% of all job postings are in ${topIndustry[0]}`
      });
    }

    return insights.slice(0, 6); // Limit to 6 insights
  }, [filteredStatistics, hasActiveFilters]);

  // Company velocity data
  const getCompanyVelocityData = () => {
    const stats = filteredStatistics;
    if (!stats) return [];
    return Object.entries(stats.byCompany)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([company, jobs]) => ({
        company,
        jobs,
        status: jobs >= 10 ? 'scaling' : jobs >= 5 ? 'hiring' : 'active'
      }));
  };

  // Fetch a single job's description on demand (heavy field, excluded from list).
  const loadJobDescription = async (id: string, dateKey: string) => {
    if (descriptionCache.has(id)) return;
    setLoadingDescriptionsDate(dateKey);
    try {
      const description = await fetchJobDescription(id);
      setDescriptionCache(prev => new Map(prev).set(id, description));
    } catch { /* non-fatal */ }
    finally {
      setLoadingDescriptionsDate(null);
    }
  };

  // Handler for date click on POSTING VELOCITY chart. Setting the date triggers
  // a server refetch scoped to that day.
  const handleDateClick = (data: any) => {
    if (!data || !data.activePayload || !data.activePayload[0]) return;
    const clickedDate = data.activePayload[0].payload.rawDate;
    if (!clickedDate) return;
    setSelectedDate(selectedDate === clickedDate ? null : clickedDate);
  };

  // Handler for country/city clicks
  const handleCountryClick = (data: any) => {
    if (data && data.name) {
      toggleFilter('country', data.name);
    }
  };

  const handleMapCountryClick = (countryName: string) => {
    toggleFilter('country', countryName);
  };

  const handleCityClick = (data: any) => {
    if (data && data.name) {
      toggleFilter('city', data.name);
    }
  };

  // Software data helpers
  const getSoftwareData = () => {
    const stats = filteredStatistics;
    if (!stats || !stats.bySoftware) return [];
    return Object.entries(stats.bySoftware)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([name, value]) => ({ name, value }));
  };

  // Programming skills data helpers
  const getProgrammingSkillsData = () => {
    const stats = filteredStatistics;
    if (!stats || !stats.byProgrammingSkill) return [];
    return Object.entries(stats.byProgrammingSkill)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([name, value]) => ({ name, value }));
  };

  // Years of experience data helpers
  const getYearsExperienceData = () => {
    const stats = filteredStatistics;
    if (!stats || !stats.byYearsExperience) return [];

    // Helper to extract numeric value for sorting
    const getNumericValue = (yearString: string): number => {
      // Match patterns like "2+ years", "3-5 years", "0-2 years"
      const rangeMatch = yearString.match(/(\d+)\s*-\s*(\d+)/);
      if (rangeMatch) {
        // For ranges like "3-5 years", use the average
        const min = parseInt(rangeMatch[1], 10);
        const max = parseInt(rangeMatch[2], 10);
        return (min + max) / 2;
      }

      const plusMatch = yearString.match(/(\d+)\+/);
      if (plusMatch) {
        // For patterns like "2+ years", use the number
        return parseInt(plusMatch[1], 10);
      }

      // Fallback: try to extract any number
      const numberMatch = yearString.match(/(\d+)/);
      if (numberMatch) {
        return parseInt(numberMatch[1], 10);
      }

      return 0;
    };

    return Object.entries(stats.byYearsExperience)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([a], [b]) => getNumericValue(a) - getNumericValue(b))
      .map(([name, value]) => ({ name, value }));
  };

  // Academic degrees data helpers
  const getAcademicDegreesData = () => {
    const stats = filteredStatistics;
    if (!stats || !stats.byAcademicDegree) return [];
    return Object.entries(stats.byAcademicDegree)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  };

  // Role type data helpers
  const getRoleTypeData = () => {
    const stats = filteredStatistics;
    if (!stats || !stats.byRoleType) return [];
    return Object.entries(stats.byRoleType)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([name, value]) => ({ name, value }));
  };

  const getRoleCategoryData = () => {
    const stats = filteredStatistics;
    if (!stats || !stats.byRoleCategory) return [];
    return Object.entries(stats.byRoleCategory)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  };

  const filteredStats = filteredStatistics;
  const hasSalaryData = filteredStats?.salaryStats && filteredStats.salaryStats.totalWithSalary > 0;
  const hasSoftwareData = filteredStats?.bySoftware && Object.keys(filteredStats.bySoftware).length > 0;
  const hasProgrammingData = filteredStats?.byProgrammingSkill && Object.keys(filteredStats.byProgrammingSkill).length > 0;
  const hasYearsExperienceData = filteredStats?.byYearsExperience && Object.keys(filteredStats.byYearsExperience).length > 0;
  const hasAcademicDegreesData = filteredStats?.byAcademicDegree && Object.keys(filteredStats.byAcademicDegree).length > 0;
  const hasRoleTypeData = filteredStats?.byRoleType && Object.keys(filteredStats.byRoleType).length > 0;
  const hasRoleCategoryData = filteredStats?.byRoleCategory && Object.keys(filteredStats.byRoleCategory).length > 0;

  // Get publication time analysis data
  // Priority 1: real 10-minute slots from loaded jobs (genuine sub-hour variation)
  // Priority 2: pre-computed byHour stats as honest hourly bars (no synthetic splitting)
  const getPublicationTimeData = () => {
    if (filteredJobs.length > 0) {
      const timeSlots: Record<string, number> = {};
      filteredJobs.forEach(job => {
        const date = new Date(job.postedDate);
        const hours = date.getUTCHours();
        const roundedMinutes = Math.floor(date.getUTCMinutes() / 10) * 10;
        const timeKey = `${String(hours).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
        timeSlots[timeKey] = (timeSlots[timeKey] || 0) + 1;
      });
      return Object.entries(timeSlots)
        .map(([time, count]) => ({ time, count }))
        .sort((a, b) => a.time.localeCompare(b.time));
    }

    const byHour = filteredStats?.byHour;
    if (byHour && Object.keys(byHour).length > 0) {
      return Object.entries(byHour)
        .map(([hour, count]) => ({ time: `${hour.padStart(2, '0')}:00`, count }))
        .sort((a, b) => a.time.localeCompare(b.time));
    }

    return [];
  };

  // Get jobs sorted by publish time (most recent first)
  const getSortedJobs = () => {
    return filteredJobs
      .sort((a: JobStatistic, b: JobStatistic) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime())
      .slice(0, 100);
  };

  // Format date for display
  const formatPublishDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const heroActions = (
    <>
      <div className="scope-toggle" role="group" aria-label="Stats scope">
        <button
          type="button"
          onClick={() => setScope('public')}
          className={`button is-small ${scope === 'public' ? 'is-primary' : 'is-light'}`}
          title="All shared feeds"
        >
          <Globe size={14} />
          <span>Total</span>
        </button>
        <button
          type="button"
          onClick={() => setScope('me')}
          className={`button is-small ${scope === 'me' ? 'is-primary' : 'is-light'}`}
          title="Only feeds you use"
        >
          <Users size={14} />
          <span>Personal</span>
        </button>
      </div>
      <button
        onClick={loadStatistics}
        disabled={loading}
        className="button is-primary is-small"
      >
        {loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
        <span>Load data</span>
      </button>
    </>
  );

  return (
    <AdminShell menu={featuresMenu(user?.role)} breadcrumb={["Features", "Stats"]} title="Job Market Analytics" actions={heroActions}>
      {/* Status Bar */}
      {statsData && (
        <div className="terminal-statusbar">
          <div className="status-item">
            <Calendar size={12} />
            <span>{statsData.currentMonth.month}</span>
          </div>
          <div className="status-item">
            <Target size={12} />
            <span>LAST UPDATE: {new Date(statsData.currentMonth.lastUpdated).toLocaleString()}</span>
          </div>
          <div className="status-item">
            <Briefcase size={12} />
            <span>{filteredStats?.totalJobs || 0} JOBS</span>
          </div>
          {hasActiveFilters && (
            <div className="status-item active">
              <Filter size={12} />
              <span>FILTERS ACTIVE</span>
            </div>
          )}
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="terminal-alert error">
          ✗ ERROR: {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-screen">
          <div className="loading-screen-card">
            <div className="loading-brand">
              <div className="loading-brand-icon"><BarChart3 size={28} /></div>
              <div>
                <div className="loading-brand-title">JOB MARKET ANALYTICS</div>
                <div className="loading-brand-sub">RECRUITMENT INTELLIGENCE TERMINAL</div>
              </div>
            </div>
            <div className="loading-stage">
              <span className="loading-prompt">&gt; </span>
              <span className="loading-stage-text">{loadingStep}</span>
              <span className="loading-cursor">█</span>
            </div>
            <div className="loading-bar-track">
              <div className="loading-bar-fill" ref={loadingBarRef} />
            </div>
            <div className="loading-bar-footer">
              <span className="loading-pct">{loadingProgress}%</span>
              <span className="loading-steps-hint">
                STAGE {loadingProgress < 20 ? 1 : loadingProgress < 80 ? 2 : 3} / 3
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter Panel */}
      {!loading && statsData && (
        <SearchFilterPanel
          activeFilters={activeFilters}
          setActiveFilters={setActiveFilters}
          availableOptions={availableFilterOptions}
          textSearch={textSearch}
          setTextSearch={setTextSearch}
          selectedDate={selectedDate}
          loadingDescriptions={loadingDescriptionsDate !== null}
        />
      )}

      {/* Slim jobs-loading strip */}
      {!loading && jobsLoading && (
        <div className="jobs-loading-strip">
          <span className="jobs-loading-label">{loadingStep}</span>
          <div className="jobs-loading-bar-track">
            <div className="jobs-loading-bar-fill" ref={jobsBarRef} />
          </div>
          <span className="jobs-loading-pct">{loadingProgress}%</span>
        </div>
      )}

      {/* Main Content */}
      {!loading && statsData && (
        <div className="terminal-grid">
          {/* Key Metrics Panel */}
          <div className="terminal-panel span-full">
            <div className="panel-header">
              <TrendingUp size={14} />
              <span>KEY METRICS</span>
            </div>
            <div className="metrics-compact">
              <div className="metric-compact">
                <div className="metric-compact-label">TOTAL</div>
                <div className="metric-compact-value">
                  <AnimatedNumber value={statsData.summary.totalJobsAllTime} />
                </div>
              </div>
              <div className="metric-compact">
                <div className="metric-compact-label">THIS MONTH</div>
                <div className="metric-compact-value">
                  <AnimatedNumber value={statsData.currentMonth.jobCount} />
                </div>
              </div>
              <div className="metric-compact">
                <div className="metric-compact-label">AVG/MONTH</div>
                <div className="metric-compact-value">
                  <AnimatedNumber value={Math.round(statsData.summary.overallStatistics.averageJobsPerMonth)} />
                </div>
              </div>
              <div className="metric-compact">
                <div className="metric-compact-label">FILTERED</div>
                <div className="metric-compact-value highlight">
                  <AnimatedNumber value={filteredStats?.totalJobs || 0} />
                </div>
              </div>
              <div className="metric-compact">
                <div className="metric-compact-label">ARCHIVES</div>
                <div className="metric-compact-value">
                  <AnimatedNumber value={statsData.summary.availableArchives.length} />
                </div>
              </div>
              <div className="metric-compact">
                <div className="metric-compact-label">VIEW</div>
                <div className="metric-compact-toggle">
                  <select
                    value={viewMode}
                    aria-label="View mode"
                    onChange={(e) => {
                      setViewMode(e.target.value);
                      setSelectedDate(null);
                    }}
                    className="view-mode-select"
                  >
                    <option value="all">ALL</option>
                    <option value="current">CURRENT</option>
                    {statsData.summary.availableArchives.map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="terminal-panel span-full filters-active">
              <div className="panel-header">
                <Filter size={14} />
                <span>ACTIVE FILTERS</span>
                <button onClick={clearAllFilters} className="filter-clear-all">
                  CLEAR ALL
                </button>
              </div>
              <div className="filter-chips">
                {selectedDate && (
                  <div key="date-filter" className="filter-chip">
                    <span className="filter-category">DATE:</span>
                    <span className="filter-value">{selectedDate}</span>
                    <button onClick={() => setSelectedDate(null)}>
                      <X size={12} />
                    </button>
                  </div>
                )}
                {Object.entries(activeFilters).map(([category, values]) =>
                  values.map((value: string) => (
                    <div key={`${category}-${value}`} className="filter-chip">
                      <span className="filter-category">{category.toUpperCase()}:</span>
                      <span className="filter-value">{value}</span>
                      <button onClick={() => removeFilter(category as keyof ActiveFilters, value)}>
                        <X size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Row 1: Time Charts - spans full width */}
          <div className="terminal-panel span-2">
            <div className="panel-header">
              <TrendingUp size={14} />
              <span>POSTING VELOCITY</span>
              {selectedDate && <span style={{ marginLeft: '8px', color: '#00d4ff', fontSize: '10px' }}>(FILTERED: {selectedDate})</span>}
              {timelineTotalDays > 1 && (
                <div className="timeline-range">
                  <span>{timelineDays > 0 ? `last ${Math.min(timelineDays, timelineTotalDays)}d` : `all ${timelineTotalDays}d`}</span>
                  <input
                    type="range"
                    min={0}
                    max={timelineTotalDays}
                    step={1}
                    value={timelineDays}
                    onChange={(e) => setTimelineDays(Number(e.target.value))}
                    title="Limit the visible time range (0 = all)"
                    aria-label="Limit visible time range"
                  />
                </div>
              )}
            </div>
            <div className="chart-container compact">
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={getDateChartData()} onClick={handleDateClick}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                  <XAxis dataKey="date" stroke="#4a5568" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#4a5568" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0e1a', border: '1px solid #00d4ff', fontSize: 11 }}
                    labelStyle={{ color: '#00d4ff' }}
                    cursor={{ fill: '#00d4ff20' }}
                  />
                  <Area type="monotone" dataKey="jobs" fill="#00d4ff20" stroke="none" />
                  <Line
                    type="monotone"
                    dataKey="jobs"
                    stroke="#00d4ff"
                    strokeWidth={2}
                    dot={(props: any) => {
                      const rawDate = props.payload?.rawDate;
                      const isActive = selectedDate === rawDate;
                      const handleDotClick = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        if (rawDate) {
                          setSelectedDate(selectedDate === rawDate ? null : rawDate);
                        }
                      };
                      return (
                        <circle
                          key={`dot-${props.index}`}
                          cx={props.cx}
                          cy={props.cy}
                          r={isActive ? 6 : 4}
                          fill={isActive ? '#00ff88' : '#00d4ff'}
                          stroke={isActive ? '#00ff88' : 'none'}
                          strokeWidth={isActive ? 2 : 0}
                          style={{ cursor: 'pointer' }}
                          onClick={handleDotClick}
                          onMouseDown={handleDotClick}
                        />
                      );
                    }}
                    activeDot={(props: any) => {
                      const rawDate = props.payload?.rawDate;
                      const isActive = selectedDate === rawDate;
                      const handleActiveDotClick = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        if (rawDate) {
                          setSelectedDate(selectedDate === rawDate ? null : rawDate);
                        }
                      };
                      return (
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={isActive ? 8 : 6}
                          fill={isActive ? '#00ff88' : '#00d4ff'}
                          stroke="#fff"
                          strokeWidth={2}
                          style={{ cursor: 'pointer' }}
                          onClick={handleActiveDotClick}
                          onMouseDown={handleActiveDotClick}
                        />
                      );
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Publication Time Analysis */}
          <div className="terminal-panel">
            <div className="panel-header">
              <Calendar size={14} />
              <span>PUBLICATION TIMES</span>
            </div>
            <div className="chart-container compact">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={getPublicationTimeData()} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                  <XAxis
                    dataKey="time"
                    stroke="#4a5568"
                    tick={{ fontSize: 7 }}
                    interval="preserveStartEnd"
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis stroke="#4a5568" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0e1a', border: '1px solid #ffcc00', fontSize: 11 }}
                    labelStyle={{ color: '#ffcc00' }}
                  />
                  <Bar dataKey="count" fill="#ffcc00" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Industry, Seniority, Heatmap */}
          <div className="terminal-panel">
            <div className="panel-header">
              <Building2 size={14} />
              <span>INDUSTRY DISTRIBUTION</span>
            </div>
            <div className="chart-container compact" style={{ height: 240 }}>
              <IndustryTreemap
                data={getIndustryChartData()}
                onIndustryClick={(industry) => toggleFilter('industry', industry)}
                activeFilters={activeFilters.industry}
              />
            </div>
          </div>

          <div className="terminal-panel">
            <div className="panel-header">
              <Users size={14} />
              <span>SENIORITY</span>
            </div>
            <div className="chart-container compact" style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={getSeniorityChartData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                    onClick={(data) => toggleFilter('seniority', data.name)}
                    style={{ cursor: 'pointer' }}
                  >
                    {getSeniorityChartData().map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0e1a', border: '1px solid #ffcc00', fontSize: 11 }}
                    labelStyle={{ color: '#ffcc00' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="terminal-panel">
            <div className="panel-header">
              <Calendar size={14} />
              <span>POSTING HEATMAP</span>
            </div>
            <div className="chart-container compact" style={{ height: 240 }}>
              <PostingHeatmap
                jobs={filteredJobs}
                byDayHour={filteredStats?.byDayHour}
              />
            </div>
          </div>

          {/* Row 3: Certificates, Regional, Top Employers */}
          <div className="terminal-panel">
            <div className="panel-header">
              <Award size={14} />
              <span>TOP CERTIFICATES</span>
            </div>
            <div className="chart-container compact" style={{ height: 240, overflow: 'hidden' }}>
              <CertsBump
                data={getCertificateChartData()}
                onCertClick={(cert) => toggleFilter('certificate', cert)}
                activeFilters={activeFilters.certificate}
              />
            </div>
          </div>

          <div className="terminal-panel">
            <div className="panel-header">
              <Globe size={14} />
              <span>REGIONAL DISTRIBUTION</span>
            </div>
            <div className="chart-container compact" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={getRegionData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                    onClick={(data) => data && data.name && toggleFilter('region', data.name)}
                    style={{ cursor: 'pointer' }}
                  >
                    {getRegionData().map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={activeFilters.region.includes(entry.name) ? '#00ff88' : CHART_COLORS[index % CHART_COLORS.length]}
                        stroke={activeFilters.region.includes(entry.name) ? '#00ff88' : 'transparent'}
                        strokeWidth={activeFilters.region.includes(entry.name) ? 2 : 0}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0e1a', border: '1px solid #06ffa5', fontSize: 11 }}
                    labelStyle={{ color: '#06ffa5' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="terminal-panel">
            <div className="panel-header">
              <Building2 size={14} />
              <span>TOP EMPLOYERS</span>
            </div>
            <div className="chart-container compact" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={getCompanyChartData()} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                  <XAxis type="number" stroke="#4a5568" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#4a5568" width={80} tick={{ fontSize: 8 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0e1a', border: '1px solid #06ffa5', fontSize: 11 }}
                    labelStyle={{ color: '#06ffa5' }}
                  />
                  <Bar dataKey="value" fill="#06ffa5" onClick={(data) => data.name && toggleFilter('company', data.name)} cursor="pointer" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 4: World Map (large) + Top Cities */}
          <div className="terminal-panel span-2">
            <div className="panel-header">
              <Globe size={14} />
              <span>GLOBAL JOB DISTRIBUTION</span>
            </div>
            <div className="chart-container compact" style={{ height: 360 }}>
              <WorldMap
                data={getCountryData()}
                onCountryClick={handleMapCountryClick}
                selectedCountry={activeFilters.country.length > 0 ? activeFilters.country[0] : null}
              />
            </div>
          </div>

          <div className="terminal-panel">
            <div className="panel-header">
              <MapPin size={14} />
              <span>TOP CITIES</span>
            </div>
            <div className="chart-container compact" style={{ height: 360 }}>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={getCityData()} layout="vertical" margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                  <XAxis type="number" stroke="#4a5568" tick={{ fontSize: 9 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#4a5568" width={80} tick={{ fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0e1a', border: '1px solid #4cc9f0', fontSize: 11 }}
                    labelStyle={{ color: '#4cc9f0' }}
                    formatter={(value: number | undefined) => value ? [`${value} jobs`, 'Count'] : ['0 jobs', 'Count']}
                  />
                  <Bar
                    dataKey="value"
                    fill="#4cc9f0"
                    onClick={handleCityClick}
                    cursor="pointer"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 5: Experience/Degrees (if available) + Salary */}
          {/* Years of Experience */}
          {hasYearsExperienceData && (
            <div className="terminal-panel">
              <div className="panel-header">
                <Target size={14} />
                <span>EXPERIENCE REQUIRED</span>
              </div>
              <div className="chart-container compact" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={getYearsExperienceData()} margin={{ top: 5, right: 15, left: 5, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                    <XAxis
                      dataKey="name"
                      stroke="#4a5568"
                      tick={{ fontSize: 8 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis stroke="#4a5568" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0a0e1a', border: '1px solid #4cc9f0', fontSize: 11 }}
                      labelStyle={{ color: '#4cc9f0' }}
                    />
                    <Bar
                      dataKey="value"
                      fill="#4cc9f0"
                      radius={[4, 4, 0, 0]}
                      onClick={(data) => data.name && toggleFilter('yearsExperience', data.name)}
                      cursor="pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Academic Degrees */}
          {hasAcademicDegreesData && (
            <div className="terminal-panel">
              <div className="panel-header">
                <Award size={14} />
                <span>DEGREES REQUIRED</span>
              </div>
              <div className="chart-container compact" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={getAcademicDegreesData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                      onClick={(data) => toggleFilter('academicDegree', data.name)}
                      style={{ cursor: 'pointer' }}
                    >
                      {getAcademicDegreesData().map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0a0e1a', border: '1px solid #ffcc00', fontSize: 11 }}
                      labelStyle={{ color: '#ffcc00' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Jobs List Table */}
          <div className="terminal-panel span-full">
            <div className="panel-header">
              <Briefcase size={14} />
              <span>RECENT JOBS (TOP 100)</span>
              {jobsLoading && <Loader2 size={12} className="spin panel-header-spinner" />}
            </div>
            <div className="jobs-table-container">
              <table className="jobs-table-full">
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>JOB TITLE</th>
                    <th style={{ width: '13%' }}>EMPLOYER</th>
                    <th style={{ width: '12%' }}>INDUSTRY</th>
                    <th style={{ width: '10%' }}>SENIORITY</th>
                    <th style={{ width: '10%' }}>COUNTRY</th>
                    <th style={{ width: '10%' }}>CITY</th>
                    <th style={{ width: '10%' }}>PUBLISHED</th>
                  </tr>
                </thead>
                <tbody>
                  {jobsLoading && filteredJobs.length === 0 && (
                    <tr className="jobs-loading-row">
                      <td colSpan={7}>Loading jobs...</td>
                    </tr>
                  )}
                  {getSortedJobs().map((job: JobStatistic) => (
                    <tr
                      key={job.id}
                      onClick={() => window.open(job.url, '_blank')}
                    >
                      <td
                        className="cell-title"
                        style={{ position: 'relative' }}
                        onMouseEnter={(e) => {
                          e.stopPropagation();
                          setHoveringJobId(job.id);

                          // Show popup after 3 seconds
                          hoverTimerRef.current = setTimeout(() => {
                            const dateKey = job.extractedDate.split('T')[0];
                            setHoveredJob(job);
                            setPopupPosition({
                              x: window.innerWidth / 2 - 200,
                              y: window.innerHeight / 2 - 250
                            });
                            if (!descriptionCache.has(job.id)) {
                              loadJobDescription(job.id, dateKey);
                            }
                          }, 3000);
                        }}
                        onMouseLeave={(e) => {
                          e.stopPropagation();
                          // Clear loading timer
                          if (hoverTimerRef.current) {
                            clearTimeout(hoverTimerRef.current);
                            hoverTimerRef.current = null;
                          }
                          setHoveringJobId(null);

                          // Only close popup if mouse is not moving to the popup
                          // Use a small delay to allow mouse to reach the popup
                          setTimeout(() => {
                            if (!isMouseOverPopup) {
                              setHoveredJob(null);
                              setPopupPosition(null);
                            }
                          }, 100);
                        }}
                      >
                        {/* Loading circle indicator - top right of title cell */}
                        {hoveringJobId === job.id && !hoveredJob && (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            style={{
                              position: 'absolute',
                              right: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                            }}
                          >
                            <circle
                              cx="10"
                              cy="10"
                              r="8"
                              fill="none"
                              className="loading-circle-bg"
                              strokeWidth="2"
                            />
                            <circle
                              cx="10"
                              cy="10"
                              r="8"
                              fill="none"
                              className="loading-circle-fg loading-circle-progress"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeDasharray="50.27"
                              strokeDashoffset="50.27"
                            />
                          </svg>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 'bold' }}>{job.title}</span>
                        </div>
                      </td>
                      <td className="cell-company">{job.company || 'N/A'}</td>
                      <td className="cell-industry">{job.industry || 'N/A'}</td>
                      <td className="cell-seniority">{job.seniority || 'N/A'}</td>
                      <td className="cell-location">{job.country || 'N/A'}</td>
                      <td className="cell-location">{normalizeCity(job.city) || 'N/A'}</td>
                      <td className="cell-date">
                        {formatPublishDate(job.postedDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Comprehensive Statistics Table */}
          <div className="terminal-panel span-full">
            <div className="panel-header">
              <BarChart3 size={14} />
              <span>COMPREHENSIVE STATISTICS</span>
            </div>
            <div className="stats-table-container">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>METRIC</th>
                    <th>VALUE</th>
                    <th>DETAILS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Total Jobs</td>
                    <td>{filteredStats?.totalJobs.toLocaleString()}</td>
                    <td>Filtered results</td>
                  </tr>
                  <tr>
                    <td>Industries</td>
                    <td>{Object.keys(filteredStats?.byIndustry || {}).length}</td>
                    <td>
                      Top: {Object.entries(filteredStats?.byIndustry || {}).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
                    </td>
                  </tr>
                  <tr>
                    <td>Companies</td>
                    <td>{Object.keys(filteredStats?.byCompany || {}).length}</td>
                    <td>
                      Most Active: {Object.entries(filteredStats?.byCompany || {}).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'} ({Object.entries(filteredStats?.byCompany || {}).sort(([,a], [,b]) => b - a)[0]?.[1] || 0} jobs)
                    </td>
                  </tr>
                  <tr>
                    <td>Locations</td>
                    <td>{Object.keys(filteredStats?.byLocation || {}).length}</td>
                    <td>
                      Countries: {Object.keys(filteredStats?.byCountry || {}).length} | Cities: {Object.keys(filteredStats?.byCity || {}).length}
                    </td>
                  </tr>
                  <tr>
                    <td>Certificates</td>
                    <td>{Object.keys(filteredStats?.byCertificate || {}).length}</td>
                    <td>
                      Most Required: {Object.entries(filteredStats?.byCertificate || {}).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
                    </td>
                  </tr>
                  <tr>
                    <td>Seniority Levels</td>
                    <td>{Object.keys(filteredStats?.bySeniority || {}).length}</td>
                    <td>
                      Most Common: {Object.entries(filteredStats?.bySeniority || {}).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
                    </td>
                  </tr>
                  {hasSoftwareData && (
                    <tr>
                      <td>Software & Tools</td>
                      <td className="cell-company">{Object.keys(filteredStats?.bySoftware || {}).length}</td>
                      <td>
                        Most Required: {Object.entries(filteredStats?.bySoftware || {}).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'} ({Object.entries(filteredStats?.bySoftware || {}).sort(([,a], [,b]) => b - a)[0]?.[1] || 0} jobs)
                      </td>
                    </tr>
                  )}
                  {hasProgrammingData && (
                    <tr>
                      <td>Programming Languages</td>
                      <td className="cell-industry">{Object.keys(filteredStats?.byProgrammingSkill || {}).length}</td>
                      <td>
                        Most Used: {Object.entries(filteredStats?.byProgrammingSkill || {}).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'} ({Object.entries(filteredStats?.byProgrammingSkill || {}).sort(([,a], [,b]) => b - a)[0]?.[1] || 0} jobs)
                      </td>
                    </tr>
                  )}
                  {hasYearsExperienceData && (
                    <tr>
                      <td>Years of Experience</td>
                      <td className="cell-location">{Object.values(filteredStats?.byYearsExperience || {}).reduce((a, b) => a + b, 0)}</td>
                      <td>
                        Most Common: {Object.entries(filteredStats?.byYearsExperience || {}).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'} ({Object.entries(filteredStats?.byYearsExperience || {}).sort(([,a], [,b]) => b - a)[0]?.[1] || 0} jobs)
                      </td>
                    </tr>
                  )}
                  {hasAcademicDegreesData && (
                    <tr>
                      <td>Academic Degrees</td>
                      <td className="cell-seniority">{Object.values(filteredStats?.byAcademicDegree || {}).reduce((a, b) => a + b, 0)}</td>
                      <td>
                        Most Required: {Object.entries(filteredStats?.byAcademicDegree || {}).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'} ({Object.entries(filteredStats?.byAcademicDegree || {}).sort(([,a], [,b]) => b - a)[0]?.[1] || 0} jobs)
                      </td>
                    </tr>
                  )}
                  {hasRoleTypeData && (
                    <tr>
                      <td>Role Types</td>
                      <td className="cell-title">{Object.keys(filteredStats?.byRoleType || {}).length}</td>
                      <td>
                        Top Role: {Object.entries(filteredStats?.byRoleType || {}).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'} ({Object.entries(filteredStats?.byRoleType || {}).sort(([,a], [,b]) => b - a)[0]?.[1] || 0} jobs)
                      </td>
                    </tr>
                  )}
                  {hasRoleCategoryData && (
                    <tr>
                      <td>Role Categories</td>
                      <td className="cell-highlight">{Object.keys(filteredStats?.byRoleCategory || {}).length}</td>
                      <td>
                        Top Category: {Object.entries(filteredStats?.byRoleCategory || {}).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'} ({Object.entries(filteredStats?.byRoleCategory || {}).sort(([,a], [,b]) => b - a)[0]?.[1] || 0} jobs)
                      </td>
                    </tr>
                  )}
                  {hasSalaryData && (
                    <>
                      <tr>
                        <td>Salary Transparency</td>
                        <td className="cell-seniority">{(((filteredStats.salaryStats?.totalWithSalary || 0) / filteredStats.totalJobs) * 100).toFixed(1)}%</td>
                        <td>
                          {filteredStats.salaryStats?.totalWithSalary || 0} jobs with salary data
                        </td>
                      </tr>
                      <tr>
                        <td>Average Salary</td>
                        <td className="cell-seniority">{formatSalary(filteredStats.salaryStats?.averageSalary || null)}</td>
                        <td>
                          Median: {formatSalary(filteredStats.salaryStats?.medianSalary || null)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Software Tools Analysis */}
          {hasSoftwareData && (
            <div className="terminal-panel span-full">
              <div className="panel-header">
                <Building2 size={14} />
                <span>SOFTWARE & TOOLS</span>
              </div>
              <div className="keywords-compact">
                {getSoftwareData().map(({name, value}) => (
                  <button
                    key={name}
                    className={`keyword-compact ${activeFilters.software.includes(name) ? 'active' : ''}`}
                    onClick={() => toggleFilter('software', name)}
                    style={{
                      background: activeFilters.software.includes(name)
                        ? `linear-gradient(135deg, #7b2cbf 0%, #5a189a 100%)`
                        : `linear-gradient(135deg, #9d4edd 0%, #7b2cbf 100%)`,
                      border: '1px solid #9d4edd',
                      cursor: 'pointer'
                    }}
                  >
                    <span className="keyword-name">{name}</span>
                    <span className="keyword-value">{value}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Programming Languages Analysis */}
          {hasProgrammingData && (
            <div className="terminal-panel span-full">
              <div className="panel-header">
                <Activity size={14} />
                <span>PROGRAMMING LANGUAGES</span>
              </div>
              <div className="keywords-compact">
                {getProgrammingSkillsData().map(({name, value}) => (
                  <button
                    key={name}
                    className={`keyword-compact ${activeFilters.programmingSkill.includes(name) ? 'active' : ''}`}
                    onClick={() => toggleFilter('programmingSkill', name)}
                    style={{
                      background: activeFilters.programmingSkill.includes(name)
                        ? `linear-gradient(135deg, #d90429 0%, #a4031f 100%)`
                        : `linear-gradient(135deg, #ff006e 0%, #d90429 100%)`,
                      border: '1px solid #ff006e',
                      cursor: 'pointer'
                    }}
                  >
                    <span className="keyword-name">{name}</span>
                    <span className="keyword-value">{value}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Role Categories - Pie Chart */}
          {hasRoleCategoryData && (
            <div className="terminal-panel">
              <div className="panel-header">
                <Briefcase size={14} />
                <span>JOB CATEGORIES</span>
              </div>
              <div className="chart-container compact" style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={getRoleCategoryData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => (percent || 0) > 0.05 ? `${(name || '').toString().split(' ')[0]} ${((percent || 0) * 100).toFixed(0)}%` : ''}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                      onClick={(data) => data && data.name && toggleFilter('roleCategory', data.name)}
                      style={{ cursor: 'pointer' }}
                    >
                      {getRoleCategoryData().map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={activeFilters.roleCategory.includes(entry.name) ? '#00ff88' : CHART_COLORS[index % CHART_COLORS.length]}
                          stroke={activeFilters.roleCategory.includes(entry.name) ? '#00ff88' : 'transparent'}
                          strokeWidth={activeFilters.roleCategory.includes(entry.name) ? 2 : 0}
                          style={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0a0e1a', border: '1px solid #00d4ff', fontSize: 11 }}
                      labelStyle={{ color: '#00d4ff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Role Types - Horizontal Bar Chart */}
          {hasRoleTypeData && (
            <div className="terminal-panel span-2">
              <div className="panel-header">
                <Target size={14} />
                <span>TOP ROLE TYPES</span>
              </div>
              <div className="chart-container compact" style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={getRoleTypeData().slice(0, 12)} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                    <XAxis type="number" stroke="#4a5568" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="#4a5568" width={140} tick={{ fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0a0e1a', border: '1px solid #00d4ff', fontSize: 11 }}
                      labelStyle={{ color: '#00d4ff' }}
                    />
                    <Bar
                      dataKey="value"
                      fill="#00d4ff"
                      onClick={(data) => data.name && toggleFilter('roleType', data.name)}
                      cursor="pointer"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Role Types - Tag Cloud */}
          {hasRoleTypeData && (
            <div className="terminal-panel span-full">
              <div className="panel-header">
                <Briefcase size={14} />
                <span>JOB ROLE TYPES</span>
              </div>
              <div className="keywords-compact">
                {getRoleTypeData().map(({name, value}) => (
                  <button
                    key={name}
                    className={`keyword-compact ${activeFilters.roleType.includes(name) ? 'active' : ''}`}
                    onClick={() => toggleFilter('roleType', name)}
                    style={{
                      background: activeFilters.roleType.includes(name)
                        ? `linear-gradient(135deg, #0077b6 0%, #023e8a 100%)`
                        : `linear-gradient(135deg, #00d4ff 0%, #0077b6 100%)`,
                      border: '1px solid #00d4ff',
                      cursor: 'pointer'
                    }}
                  >
                    <span className="keyword-name">{name}</span>
                    <span className="keyword-value">{value}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Keyword Analysis Table */}
          <div className="terminal-panel span-full">
            <div className="panel-header">
              <Zap size={14} />
              <span>KEYWORD ANALYSIS - DETAILED BREAKDOWN</span>
            </div>
            <div className="stats-table-container">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>RANK</th>
                    <th style={{ textAlign: 'left' }}>KEYWORD</th>
                    <th style={{ textAlign: 'right' }}>COUNT</th>
                    <th style={{ textAlign: 'right' }}>% OF JOBS</th>
                    <th style={{ textAlign: 'center' }}>TREND</th>
                  </tr>
                </thead>
                <tbody>
                  {getTopKeywords().map(([keyword, count], index) => {
                    const percentage = ((count / (filteredStats?.totalJobs || 1)) * 100).toFixed(1);
                    return (
                      <tr
                        key={keyword}
                        className={`keyword-row ${activeFilters.keyword.includes(keyword) ? 'active' : ''}`}
                        onClick={() => toggleFilter('keyword', keyword)}
                      >
                        <td className="cell-muted" style={{ fontWeight: 'bold' }}>#{index + 1}</td>
                        <td className="cell-title">{keyword}</td>
                        <td className="cell-highlight" style={{ textAlign: 'right' }}>{count}</td>
                        <td className="cell-seniority" style={{ textAlign: 'right' }}>{percentage}%</td>
                        <td className="cell-location" style={{ textAlign: 'center' }}>
                          {index < 5 ? '🔥 HOT' : index < 10 ? '↗ RISING' : '→ STABLE'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Keywords Panel - Tag Cloud */}
          <div className="terminal-panel span-full">
            <div className="panel-header">
              <Zap size={14} />
              <span>IN-DEMAND SKILLS</span>
            </div>
            <div className="chart-container compact" style={{ height: 'auto', minHeight: 100 }}>
              <SkillsTagCloud
                data={getTopKeywords()}
                onWordClick={(word) => toggleFilter('keyword', word)}
                activeFilters={activeFilters.keyword}
                maxWords={20}
              />
            </div>
          </div>
        </div>
      )}

      {/* Job Description Popup */}
      {hoveredJob && popupPosition && (
        <div
          ref={popupRef}
          className="job-popup job-description-popup"
          style={{
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
            pointerEvents: 'auto',
          }}
          onMouseEnter={() => {
            setIsMouseOverPopup(true);
          }}
          onMouseLeave={() => {
            setIsMouseOverPopup(false);
            setHoveredJob(null);
            setPopupPosition(null);
          }}
        >
          {/* Header with close button - fixed */}
          <div className="job-popup-header">
            <button
              className="job-popup-close"
              onClick={() => {
                setIsMouseOverPopup(false);
                setHoveredJob(null);
                setPopupPosition(null);
              }}
            >
              <X size={16} />
            </button>
          </div>
          {/* Scrollable content area */}
          <div
            className="job-popup-content"
            onWheel={(e) => {
              e.stopPropagation();
            }}
          >
            {loadingDescriptionsDate === hoveredJob.extractedDate.split('T')[0] && !descriptionCache.has(hoveredJob.id) ? (
              <div className="popup-desc-loading">
                <Loader2 size={24} className="spin" />
                <p>Loading description...</p>
              </div>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: descriptionCache.get(hoveredJob.id) || hoveredJob.description || '' }} />
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
