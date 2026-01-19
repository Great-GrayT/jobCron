"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { BarChart3, TrendingUp, RefreshCw, Loader2, ArrowLeft, X, Filter, Calendar, Briefcase, Award, Target, MapPin, Building2, Zap, Users, DollarSign, TrendingDown, AlertCircle, Sparkles, Activity, Globe } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Area } from 'recharts';
import WorldMap from '@/components/WorldMap';
import {
  AnimatedNumber,
  IndustryTreemap,
  SkillsTagCloud,
  SalaryGauges,
  PostingHeatmap,
  CertsBump,
  CHART_COLORS,
} from '@/components/charts';
import "./stats.css";

interface SalaryData {
  min: number | null;
  max: number | null;
  currency: string;
  period: 'year' | 'month' | 'hour' | 'unknown';
  raw: string;
  confidence: 'high' | 'medium' | 'low';
}

interface JobStatistic {
  id: string;
  title: string;
  company: string;
  location: string;
  country: string | null;
  city: string | null;
  region: 'Europe' | 'America' | 'Middle East' | null;
  url: string;
  postedDate: string;
  extractedDate: string;
  keywords: string[];
  certificates: string[];
  industry: string;
  seniority: string;
  description: string;
  salary?: SalaryData | null;
  software?: string[];
  programmingSkills?: string[];
  yearsExperience?: string | null;
  academicDegrees?: string[];
}

interface SalaryStats {
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
    '0-30k': number;
    '30-50k': number;
    '50-75k': number;
    '75-100k': number;
    '100-150k': number;
    '150k+': number;
  };
}

interface MonthlyStatistics {
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
  salaryStats?: SalaryStats;
}

interface StatsData {
  currentMonth: {
    month: string;
    lastUpdated: string;
    jobCount: number;
    statistics: MonthlyStatistics;
    jobs: JobStatistic[];
  };
  summary: {
    totalJobsAllTime: number;
    currentMonth: string;
    availableArchives: string[];
    overallStatistics: {
      totalMonths: number;
      averageJobsPerMonth: number;
      topIndustries: Record<string, number>;
      topCertificates: Record<string, number>;
      topKeywords: Record<string, number>;
    };
  };
  aggregated?: {
    totalJobs: number;
    statistics: MonthlyStatistics;
    monthsIncluded: number;
    archives: Array<{ month: string; jobCount: number }>;
  };
}

interface ExtractResult {
  processed: number;
  newJobs: number;
  currentMonthTotal: number;
}

interface ActiveFilters {
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
}

export default function StatsPage() {
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [updateResult, setUpdateResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useAggregated, setUseAggregated] = useState<boolean>(true);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
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
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [hoveredJob, setHoveredJob] = useState<JobStatistic | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveringJobId, setHoveringJobId] = useState<string | null>(null);
  const [isMouseOverPopup, setIsMouseOverPopup] = useState<boolean>(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/stats/load');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setStatsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGist = async () => {
    setUpdating(true);
    setError(null);
    setUpdateResult(null);
    try {
      const response = await fetch('/api/stats/get');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setUpdateResult({
        processed: data.processed,
        newJobs: data.newJobs,
        currentMonthTotal: data.summary?.currentMonthJobs || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUpdating(false);
    }
  };

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
    });
    setSelectedDate(null);
  };

  const removeFilter = (category: keyof ActiveFilters, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [category]: prev[category].filter(v => v !== value),
    }));
  };

  const hasActiveFilters = Object.values(activeFilters).some(arr => arr.length > 0) || selectedDate !== null;

  // Get active statistics
  const getActiveStatistics = (): MonthlyStatistics | null => {
    if (!statsData) return null;
    if (useAggregated && statsData.aggregated) {
      return statsData.aggregated.statistics;
    }
    return statsData.currentMonth.statistics;
  };

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

  // Filter jobs based on active filters
  const getFilteredJobs = (): JobStatistic[] => {
    if (!statsData) return [];
    return statsData.currentMonth.jobs.filter(job => {
      if (activeFilters.industry.length > 0 && !activeFilters.industry.includes(job.industry)) return false;
      if (activeFilters.certificate.length > 0 && !job.certificates.some(c => activeFilters.certificate.includes(c))) return false;
      if (activeFilters.seniority.length > 0 && !activeFilters.seniority.includes(job.seniority)) return false;
      if (activeFilters.location.length > 0 && !activeFilters.location.some(loc => job.location.toLowerCase().includes(loc.toLowerCase()))) return false;
      if (activeFilters.company.length > 0 && !activeFilters.company.includes(job.company)) return false;
      if (activeFilters.keyword.length > 0 && !job.keywords.some(k => activeFilters.keyword.includes(k))) return false;

      // Country filter: exclude jobs without country or with invalid country
      if (activeFilters.country.length > 0) {
        if (!job.country || !activeFilters.country.includes(job.country)) return false;
      }

      // City filter: exclude jobs without city or with invalid city
      if (activeFilters.city.length > 0) {
        const normalizedJobCity = normalizeCity(job.city);
        if (!normalizedJobCity || !activeFilters.city.includes(normalizedJobCity)) return false;
      }

      // Software filter
      if (activeFilters.software.length > 0) {
        if (!job.software || !job.software.some(s => activeFilters.software.includes(s))) return false;
      }

      // Programming skill filter
      if (activeFilters.programmingSkill.length > 0) {
        if (!job.programmingSkills || !job.programmingSkills.some(s => activeFilters.programmingSkill.includes(s))) return false;
      }

      // Years of experience filter
      if (activeFilters.yearsExperience.length > 0) {
        if (!job.yearsExperience || !activeFilters.yearsExperience.includes(job.yearsExperience)) return false;
      }

      // Academic degree filter
      if (activeFilters.academicDegree.length > 0) {
        if (!job.academicDegrees || !job.academicDegrees.some(d => activeFilters.academicDegree.includes(d))) return false;
      }

      // Region filter
      if (activeFilters.region.length > 0) {
        if (!job.region || !activeFilters.region.includes(job.region)) return false;
      }

      if (selectedDate) {
        const jobDate = job.extractedDate.split('T')[0];
        if (jobDate !== selectedDate) return false;
      }
      return true;
    });
  };

  // Apply filters to statistics
  const getFilteredStatistics = (): MonthlyStatistics | null => {
    const stats = getActiveStatistics();
    if (!stats || !hasActiveFilters) return stats;

    const filteredJobs = getFilteredJobs();

    // Rebuild statistics from filtered jobs
    const filtered: MonthlyStatistics = {
      totalJobs: filteredJobs.length,
      byDate: {},
      byIndustry: {},
      byCertificate: {},
      byKeyword: {},
      bySeniority: {},
      byLocation: {},
      byCountry: {},
      byCity: {},
      byRegion: {},
      byCompany: {},
      bySoftware: {},
      byProgrammingSkill: {},
      byYearsExperience: {},
      byAcademicDegree: {},
    };

    filteredJobs.forEach(job => {
      const date = job.extractedDate.split('T')[0];
      filtered.byDate[date] = (filtered.byDate[date] || 0) + 1;
      filtered.byIndustry[job.industry] = (filtered.byIndustry[job.industry] || 0) + 1;
      filtered.bySeniority[job.seniority] = (filtered.bySeniority[job.seniority] || 0) + 1;
      filtered.byLocation[job.location] = (filtered.byLocation[job.location] || 0) + 1;
      if (job.country) filtered.byCountry[job.country] = (filtered.byCountry[job.country] || 0) + 1;
      const normalizedCity = normalizeCity(job.city);
      if (normalizedCity) filtered.byCity[normalizedCity] = (filtered.byCity[normalizedCity] || 0) + 1;
      if (job.region) filtered.byRegion[job.region] = (filtered.byRegion[job.region] || 0) + 1;
      filtered.byCompany[job.company] = (filtered.byCompany[job.company] || 0) + 1;
      job.certificates.forEach(cert => {
        filtered.byCertificate[cert] = (filtered.byCertificate[cert] || 0) + 1;
      });
      job.keywords.forEach(keyword => {
        filtered.byKeyword[keyword] = (filtered.byKeyword[keyword] || 0) + 1;
      });
      if (job.software) {
        job.software.forEach(soft => {
          if (!filtered.bySoftware) filtered.bySoftware = {};
          filtered.bySoftware[soft] = (filtered.bySoftware[soft] || 0) + 1;
        });
      }
      if (job.programmingSkills) {
        job.programmingSkills.forEach(skill => {
          if (!filtered.byProgrammingSkill) filtered.byProgrammingSkill = {};
          filtered.byProgrammingSkill[skill] = (filtered.byProgrammingSkill[skill] || 0) + 1;
        });
      }
      if (job.yearsExperience) {
        if (!filtered.byYearsExperience) filtered.byYearsExperience = {};
        filtered.byYearsExperience[job.yearsExperience] = (filtered.byYearsExperience[job.yearsExperience] || 0) + 1;
      }
      if (job.academicDegrees) {
        job.academicDegrees.forEach(degree => {
          if (!filtered.byAcademicDegree) filtered.byAcademicDegree = {};
          filtered.byAcademicDegree[degree] = (filtered.byAcademicDegree[degree] || 0) + 1;
        });
      }
    });

    return filtered;
  };

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
    const stats = getFilteredStatistics();
    if (!stats) return [];
    return Object.entries(stats.byIndustry)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  };

  const getSeniorityChartData = () => {
    const stats = getFilteredStatistics();
    if (!stats) return [];
    return Object.entries(stats.bySeniority)
      .filter(([name]) => !shouldFilterOut(name))
      .map(([name, value]) => ({ name, value }));
  };

  const getDateChartData = () => {
    const stats = getFilteredStatistics();
    if (!stats) return [];
    const entries = Object.entries(stats.byDate)
      .sort(([a], [b]) => a.localeCompare(b));
    const limit = useAggregated ? 30 : 14;
    return entries
      .slice(-limit)
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        jobs: count,
        rawDate: date,
      }));
  };

  const getCertificateChartData = () => {
    const stats = getFilteredStatistics();
    if (!stats) return [];
    return Object.entries(stats.byCertificate)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  };

  const getTopKeywords = () => {
    const stats = getFilteredStatistics();
    if (!stats) return [];
    return Object.entries(stats.byKeyword)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15);
  };

  const getLocationChartData = () => {
    const stats = getFilteredStatistics();
    if (!stats) return [];
    return Object.entries(stats.byLocation)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  };

  const getCompanyChartData = () => {
    const stats = getFilteredStatistics();
    if (!stats) return [];
    return Object.entries(stats.byCompany)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  };

  // Geographic data helpers
  const getRegionData = () => {
    const stats = getFilteredStatistics();
    if (!stats || !stats.byRegion) return [];
    return Object.entries(stats.byRegion)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  };

  const getCountryData = (limit?: number) => {
    const stats = getFilteredStatistics();
    if (!stats || !stats.byCountry) return [];
    const sorted = Object.entries(stats.byCountry)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
    return limit ? sorted.slice(0, limit) : sorted;
  };

  const getCityData = () => {
    const stats = getFilteredStatistics();
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
    const stats = getFilteredStatistics();
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
    const stats = getFilteredStatistics();
    if (!stats?.salaryStats) return [];
    return Object.entries(stats.salaryStats.byIndustry)
      .map(([name, data]) => ({ name, avg: data.avg, median: data.median, count: data.count }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8);
  };

  const getSalaryBySeniorityData = () => {
    const stats = getFilteredStatistics();
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
    const stats = getFilteredStatistics();

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
  }, [statsData, hasActiveFilters]);

  // Company velocity data
  const getCompanyVelocityData = () => {
    const stats = getFilteredStatistics();
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

  // Handler for date click on POSTING VELOCITY chart
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
    const stats = getFilteredStatistics();
    if (!stats || !stats.bySoftware) return [];
    return Object.entries(stats.bySoftware)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([name, value]) => ({ name, value }));
  };

  // Programming skills data helpers
  const getProgrammingSkillsData = () => {
    const stats = getFilteredStatistics();
    if (!stats || !stats.byProgrammingSkill) return [];
    return Object.entries(stats.byProgrammingSkill)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([name, value]) => ({ name, value }));
  };

  // Years of experience data helpers
  const getYearsExperienceData = () => {
    const stats = getFilteredStatistics();
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
    const stats = getFilteredStatistics();
    if (!stats || !stats.byAcademicDegree) return [];
    return Object.entries(stats.byAcademicDegree)
      .filter(([name]) => !shouldFilterOut(name))
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  };

  const filteredStats = getFilteredStatistics();
  const filteredJobs = getFilteredJobs();
  const hasSalaryData = filteredStats?.salaryStats && filteredStats.salaryStats.totalWithSalary > 0;
  const hasSoftwareData = filteredStats?.bySoftware && Object.keys(filteredStats.bySoftware).length > 0;
  const hasProgrammingData = filteredStats?.byProgrammingSkill && Object.keys(filteredStats.byProgrammingSkill).length > 0;
  const hasYearsExperienceData = filteredStats?.byYearsExperience && Object.keys(filteredStats.byYearsExperience).length > 0;
  const hasAcademicDegreesData = filteredStats?.byAcademicDegree && Object.keys(filteredStats.byAcademicDegree).length > 0;

  // Get publication time analysis data
  const getPublicationTimeData = () => {
    const jobs = getFilteredJobs();
    const timeSlots: Record<string, number> = {};

    jobs.forEach(job => {
      const date = new Date(job.postedDate);
      const hours = date.getUTCHours();
      const minutes = date.getUTCMinutes();

      // Round to nearest 10-minute slot
      const roundedMinutes = Math.floor(minutes / 10) * 10;
      const timeKey = `${String(hours).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;

      timeSlots[timeKey] = (timeSlots[timeKey] || 0) + 1;
    });

    // Convert to array and sort by time
    return Object.entries(timeSlots)
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  // Get jobs sorted by publish time (most recent first)
  const getSortedJobs = () => {
    return getFilteredJobs()
      .sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime())
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

  return (
    <div className="terminal-page">
      {/* Top Bar */}
      <div className="terminal-topbar">
        <div className="terminal-topbar-left">
          <BarChart3 size={20} />
          <span className="terminal-title">JOB MARKET ANALYTICS</span>
          <span className="terminal-separator">|</span>
          <span className="terminal-subtitle">RECRUITMENT INTELLIGENCE TERMINAL</span>
        </div>
        <div className="terminal-topbar-right">
          <button
            onClick={handleUpdateGist}
            disabled={updating}
            className={`terminal-btn ${updating ? 'loading' : ''}`}
          >
            {updating ? <Loader2 size={14} className="spin" /> : <TrendingUp size={14} />}
            <span>UPDATE GIST</span>
          </button>
          <button
            onClick={loadStatistics}
            disabled={loading}
            className={`terminal-btn ${loading ? 'loading' : ''}`}
          >
            {loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
            <span>LOAD DATA</span>
          </button>
          <Link href="/" className="terminal-btn">
            <ArrowLeft size={14} />
            <span>HOME</span>
          </Link>
        </div>
      </div>

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
      {updateResult && (
        <div className="terminal-alert success">
          ✓ GIST UPDATED: {updateResult.newJobs} new jobs added | Total: {updateResult.currentMonthTotal}
        </div>
      )}
      {error && (
        <div className="terminal-alert error">
          ✗ ERROR: {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="terminal-loading">
          <Loader2 size={32} className="spin" />
          <p>LOADING MARKET DATA...</p>
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
                  <button
                    onClick={() => setUseAggregated(true)}
                    className={useAggregated ? 'active' : ''}
                  >
                    ALL
                  </button>
                  <button
                    onClick={() => setUseAggregated(false)}
                    className={!useAggregated ? 'active' : ''}
                  >
                    CURRENT
                  </button>
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
                    dot={{ fill: '#00d4ff', r: 4, cursor: 'pointer' }}
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
              <PostingHeatmap jobs={filteredJobs} />
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

          {/* Salary Section - organized in a row */}
          {hasSalaryData && (
            <>
              <div className="terminal-panel">
                <div className="panel-header">
                  <DollarSign size={14} />
                  <span>SALARY OVERVIEW</span>
                </div>
                <div className="chart-container compact" style={{ height: 240 }}>
                  <SalaryGauges
                    stats={{
                      totalWithSalary: filteredStats.salaryStats?.totalWithSalary || 0,
                      averageSalary: filteredStats.salaryStats?.averageSalary || null,
                      medianSalary: filteredStats.salaryStats?.medianSalary || null,
                    }}
                    totalJobs={filteredStats.totalJobs}
                  />
                </div>
              </div>

              <div className="terminal-panel">
                <div className="panel-header">
                  <DollarSign size={14} />
                  <span>SALARY DISTRIBUTION</span>
                </div>
                <div className="chart-container compact" style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={getSalaryRangeChartData()} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                      <XAxis dataKey="range" stroke="#4a5568" tick={{ fontSize: 8 }} />
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

              <div className="terminal-panel">
                <div className="panel-header">
                  <Users size={14} />
                  <span>SALARY BY SENIORITY</span>
                </div>
                <div className="chart-container compact" style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={getSalaryBySeniorityData()} margin={{ top: 5, right: 15, left: 15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                      <XAxis dataKey="name" stroke="#4a5568" tick={{ fontSize: 8 }} />
                      <YAxis stroke="#4a5568" tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0a0e1a', border: '1px solid #9d4edd', fontSize: 11 }}
                        labelStyle={{ color: '#9d4edd' }}
                        formatter={(value: number | undefined) => value ? [`$${(value / 1000).toFixed(0)}k`, 'Avg Salary'] : ['N/A', 'Avg Salary']}
                      />
                      <Bar dataKey="avg" fill="#9d4edd" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Salary by Industry - full width for better readability */}
              <div className="terminal-panel span-full">
                <div className="panel-header">
                  <Building2 size={14} />
                  <span>SALARY BY INDUSTRY</span>
                </div>
                <div className="chart-container compact" style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={getSalaryByIndustryData()} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                      <XAxis type="number" stroke="#4a5568" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" stroke="#4a5568" width={120} tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0a0e1a', border: '1px solid #00ff88', fontSize: 11 }}
                        labelStyle={{ color: '#00ff88' }}
                        formatter={(value: number | undefined) => value ? [`$${(value / 1000).toFixed(0)}k`, 'Avg Salary'] : ['N/A', 'Avg Salary']}
                      />
                      <Bar dataKey="avg" fill="#00ff88" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* Jobs List Table */}
          <div className="terminal-panel span-full">
            <div className="panel-header">
              <Briefcase size={14} />
              <span>RECENT JOBS (TOP 100)</span>
            </div>
            <div style={{ padding: '12px', overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#0a0e1a', zIndex: 1 }}>
                  <tr style={{ borderBottom: '2px solid #00d4ff' }}>
                    <th style={{ textAlign: 'left', padding: '8px', color: '#00d4ff', width: '35%' }}>JOB TITLE</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: '#00d4ff', width: '13%' }}>EMPLOYER</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: '#00d4ff', width: '12%' }}>INDUSTRY</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: '#00d4ff', width: '10%' }}>SENIORITY</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: '#00d4ff', width: '10%' }}>COUNTRY</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: '#00d4ff', width: '10%' }}>CITY</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: '#00d4ff', width: '10%' }}>PUBLISHED</th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedJobs().map((job, index) => (
                    <tr
                      key={job.id}
                      style={{
                        borderBottom: '1px solid #1a2332',
                        cursor: 'pointer',
                        backgroundColor: hoveringJobId === job.id
                          ? (index % 2 === 0 ? 'transparent' : '#0a0e1a80')
                          : (index % 2 === 0 ? 'transparent' : '#0a0e1a80')
                      }}
                      onClick={() => window.open(job.url, '_blank')}
                      onMouseEnter={(e) => {
                        // Only highlight if not hovering on title cell (loading state)
                        if (hoveringJobId !== job.id) {
                          e.currentTarget.style.backgroundColor = '#00d4ff20';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'transparent' : '#0a0e1a80';
                      }}
                    >
                      <td
                        style={{ padding: '8px', color: '#00ff88', position: 'relative' }}
                        onMouseEnter={(e) => {
                          e.stopPropagation();
                          setHoveringJobId(job.id);

                          // Reset row background when entering title cell
                          const row = e.currentTarget.parentElement;
                          if (row) {
                            row.style.backgroundColor = index % 2 === 0 ? 'transparent' : '#0a0e1a80';
                          }

                          // Show popup after 3 seconds
                          hoverTimerRef.current = setTimeout(() => {
                            setHoveredJob(job);
                            setPopupPosition({
                              x: window.innerWidth / 2 - 200,
                              y: window.innerHeight / 2 - 250
                            });
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
                              stroke="#1a2332"
                              strokeWidth="2"
                            />
                            <circle
                              cx="10"
                              cy="10"
                              r="8"
                              fill="none"
                              stroke="#00d4ff"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeDasharray="50.27"
                              strokeDashoffset="50.27"
                              className="loading-circle-progress"
                            />
                          </svg>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 'bold' }}>{job.title}</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px', color: '#9d4edd', fontSize: '10px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.company || 'N/A'}</td>
                      <td style={{ padding: '8px', color: '#ff6b6b', fontSize: '10px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.industry || 'N/A'}</td>
                      <td style={{ padding: '8px', color: '#ffcc00', fontSize: '10px', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.seniority || 'N/A'}</td>
                      <td style={{ padding: '8px', color: '#06ffa5', fontSize: '10px', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.country || 'N/A'}</td>
                      <td style={{ padding: '8px', color: '#06ffa5', fontSize: '10px', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{normalizeCity(job.city) || 'N/A'}</td>
                      <td style={{ padding: '8px', color: '#4a5568', fontSize: '10px' }}>
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
            <div style={{ padding: '12px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #00d4ff' }}>
                    <th style={{ textAlign: 'left', padding: '8px', color: '#00d4ff' }}>METRIC</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: '#00d4ff' }}>VALUE</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: '#00d4ff' }}>DETAILS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #1a2332' }}>
                    <td style={{ padding: '8px', color: '#4a5568' }}>Total Jobs</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#00ff88', fontWeight: 'bold' }}>{filteredStats?.totalJobs.toLocaleString()}</td>
                    <td style={{ padding: '8px', color: '#4a5568' }}>Filtered results</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1a2332' }}>
                    <td style={{ padding: '8px', color: '#4a5568' }}>Industries</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#00ff88', fontWeight: 'bold' }}>{Object.keys(filteredStats?.byIndustry || {}).length}</td>
                    <td style={{ padding: '8px', color: '#4a5568' }}>
                      Top: {Object.entries(filteredStats?.byIndustry || {}).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1a2332' }}>
                    <td style={{ padding: '8px', color: '#4a5568' }}>Companies</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#00ff88', fontWeight: 'bold' }}>{Object.keys(filteredStats?.byCompany || {}).length}</td>
                    <td style={{ padding: '8px', color: '#4a5568' }}>
                      Most Active: {Object.entries(filteredStats?.byCompany || {}).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'} ({Object.entries(filteredStats?.byCompany || {}).sort(([,a], [,b]) => b - a)[0]?.[1] || 0} jobs)
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1a2332' }}>
                    <td style={{ padding: '8px', color: '#4a5568' }}>Locations</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#00ff88', fontWeight: 'bold' }}>{Object.keys(filteredStats?.byLocation || {}).length}</td>
                    <td style={{ padding: '8px', color: '#4a5568' }}>
                      Countries: {Object.keys(filteredStats?.byCountry || {}).length} | Cities: {Object.keys(filteredStats?.byCity || {}).length}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1a2332' }}>
                    <td style={{ padding: '8px', color: '#4a5568' }}>Certificates</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#00ff88', fontWeight: 'bold' }}>{Object.keys(filteredStats?.byCertificate || {}).length}</td>
                    <td style={{ padding: '8px', color: '#4a5568' }}>
                      Most Required: {Object.entries(filteredStats?.byCertificate || {}).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1a2332' }}>
                    <td style={{ padding: '8px', color: '#4a5568' }}>Seniority Levels</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#00ff88', fontWeight: 'bold' }}>{Object.keys(filteredStats?.bySeniority || {}).length}</td>
                    <td style={{ padding: '8px', color: '#4a5568' }}>
                      Most Common: {Object.entries(filteredStats?.bySeniority || {}).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
                    </td>
                  </tr>
                  {hasSoftwareData && (
                    <tr style={{ borderBottom: '1px solid #1a2332' }}>
                      <td style={{ padding: '8px', color: '#4a5568' }}>Software & Tools</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#9d4edd', fontWeight: 'bold' }}>
                        {Object.keys(filteredStats?.bySoftware || {}).length}
                      </td>
                      <td style={{ padding: '8px', color: '#4a5568' }}>
                        Most Required: {Object.entries(filteredStats?.bySoftware || {}).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'} ({Object.entries(filteredStats?.bySoftware || {}).sort(([,a], [,b]) => b - a)[0]?.[1] || 0} jobs)
                      </td>
                    </tr>
                  )}
                  {hasProgrammingData && (
                    <tr style={{ borderBottom: '1px solid #1a2332' }}>
                      <td style={{ padding: '8px', color: '#4a5568' }}>Programming Languages</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#ff006e', fontWeight: 'bold' }}>
                        {Object.keys(filteredStats?.byProgrammingSkill || {}).length}
                      </td>
                      <td style={{ padding: '8px', color: '#4a5568' }}>
                        Most Used: {Object.entries(filteredStats?.byProgrammingSkill || {}).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'} ({Object.entries(filteredStats?.byProgrammingSkill || {}).sort(([,a], [,b]) => b - a)[0]?.[1] || 0} jobs)
                      </td>
                    </tr>
                  )}
                  {hasYearsExperienceData && (
                    <tr style={{ borderBottom: '1px solid #1a2332' }}>
                      <td style={{ padding: '8px', color: '#4a5568' }}>Years of Experience</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#4cc9f0', fontWeight: 'bold' }}>
                        {Object.values(filteredStats?.byYearsExperience || {}).reduce((a, b) => a + b, 0)}
                      </td>
                      <td style={{ padding: '8px', color: '#4a5568' }}>
                        Most Common: {Object.entries(filteredStats?.byYearsExperience || {}).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'} ({Object.entries(filteredStats?.byYearsExperience || {}).sort(([,a], [,b]) => b - a)[0]?.[1] || 0} jobs)
                      </td>
                    </tr>
                  )}
                  {hasAcademicDegreesData && (
                    <tr style={{ borderBottom: '1px solid #1a2332' }}>
                      <td style={{ padding: '8px', color: '#4a5568' }}>Academic Degrees</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#ffcc00', fontWeight: 'bold' }}>
                        {Object.values(filteredStats?.byAcademicDegree || {}).reduce((a, b) => a + b, 0)}
                      </td>
                      <td style={{ padding: '8px', color: '#4a5568' }}>
                        Most Required: {Object.entries(filteredStats?.byAcademicDegree || {}).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'} ({Object.entries(filteredStats?.byAcademicDegree || {}).sort(([,a], [,b]) => b - a)[0]?.[1] || 0} jobs)
                      </td>
                    </tr>
                  )}
                  {hasSalaryData && (
                    <>
                      <tr style={{ borderBottom: '1px solid #1a2332' }}>
                        <td style={{ padding: '8px', color: '#4a5568' }}>Salary Transparency</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#ffcc00', fontWeight: 'bold' }}>
                          {(((filteredStats.salaryStats?.totalWithSalary || 0) / filteredStats.totalJobs) * 100).toFixed(1)}%
                        </td>
                        <td style={{ padding: '8px', color: '#4a5568' }}>
                          {filteredStats.salaryStats?.totalWithSalary || 0} jobs with salary data
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #1a2332' }}>
                        <td style={{ padding: '8px', color: '#4a5568' }}>Average Salary</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#ffcc00', fontWeight: 'bold' }}>
                          {formatSalary(filteredStats.salaryStats?.averageSalary || null)}
                        </td>
                        <td style={{ padding: '8px', color: '#4a5568' }}>
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

          {/* Keyword Analysis Table */}
          <div className="terminal-panel span-full">
            <div className="panel-header">
              <Zap size={14} />
              <span>KEYWORD ANALYSIS - DETAILED BREAKDOWN</span>
            </div>
            <div style={{ padding: '12px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #00d4ff' }}>
                    <th style={{ textAlign: 'left', padding: '8px', color: '#00d4ff' }}>RANK</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: '#00d4ff' }}>KEYWORD</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: '#00d4ff' }}>COUNT</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: '#00d4ff' }}>% OF JOBS</th>
                    <th style={{ textAlign: 'center', padding: '8px', color: '#00d4ff' }}>TREND</th>
                  </tr>
                </thead>
                <tbody>
                  {getTopKeywords().map(([keyword, count], index) => {
                    const percentage = ((count / (filteredStats?.totalJobs || 1)) * 100).toFixed(1);
                    return (
                      <tr
                        key={keyword}
                        style={{
                          borderBottom: '1px solid #1a2332',
                          cursor: 'pointer',
                          backgroundColor: activeFilters.keyword.includes(keyword) ? '#00d4ff20' : 'transparent'
                        }}
                        onClick={() => toggleFilter('keyword', keyword)}
                      >
                        <td style={{ padding: '8px', color: '#4a5568', fontWeight: 'bold' }}>#{index + 1}</td>
                        <td style={{ padding: '8px', color: '#00ff88', fontWeight: 'bold' }}>{keyword}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#00d4ff', fontWeight: 'bold' }}>{count}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#ffcc00' }}>{percentage}%</td>
                        <td style={{ padding: '8px', textAlign: 'center', color: '#06ffa5' }}>
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
          style={{
            position: 'fixed',
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
            width: '400px',
            maxHeight: '500px',
            backgroundColor: '#0a0e1a',
            border: '2px solid #00d4ff',
            borderRadius: '8px',
            zIndex: 9999,
            boxShadow: '0 8px 32px rgba(0, 212, 255, 0.5)',
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
          className="job-description-popup"
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
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '8px 16px',
            borderBottom: '1px solid #1a2332',
            flexShrink: 0,
          }}>
            <button
              onClick={() => {
                setIsMouseOverPopup(false);
                setHoveredJob(null);
                setPopupPosition(null);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#4a5568',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#00d4ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#4a5568';
              }}
            >
              <X size={16} />
            </button>
          </div>
          {/* Scrollable content area */}
          <div
            style={{
              padding: '16px',
              overflowY: 'auto',
              overflowX: 'hidden',
              flex: 1,
              maxHeight: '450px',
            }}
            onWheel={(e) => {
              // Stop propagation to prevent main page from scrolling
              e.stopPropagation();
            }}
          >
            <div
              style={{
                color: '#e2e8f0',
                fontSize: '11px',
                lineHeight: '1.5',
              }}
              dangerouslySetInnerHTML={{ __html: hoveredJob.description }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
