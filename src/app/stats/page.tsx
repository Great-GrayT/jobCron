"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { BarChart3, TrendingUp, RefreshCw, Loader2, ArrowLeft, X, Filter, Calendar, Briefcase, Award, Target, MapPin, Building2, Zap, Users, DollarSign, TrendingDown, AlertCircle, Sparkles, Activity, Globe } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Area, Treemap } from 'recharts';
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
}

export default function StatsPage() {
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useAggregated, setUseAggregated] = useState<boolean>(true);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    industry: [],
    certificate: [],
    seniority: [],
    location: [],
    company: [],
    keyword: [],
  });

  // Chart colors - Bloomberg terminal style
  const COLORS = ['#00d4ff', '#00ff88', '#ffcc00', '#ff6b6b', '#9d4edd', '#06ffa5', '#ff006e', '#4cc9f0'];

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/stats/get');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setStatsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleExtractAndSave = async () => {
    setExtracting(true);
    setError(null);
    setExtractResult(null);
    try {
      const response = await fetch('/api/stats/extract-and-save');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setExtractResult({
        processed: data.processed,
        newJobs: data.newJobs,
        currentMonthTotal: data.currentMonthTotal,
      });
      await loadStatistics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setExtracting(false);
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
    });
  };

  const removeFilter = (category: keyof ActiveFilters, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [category]: prev[category].filter(v => v !== value),
    }));
  };

  const hasActiveFilters = Object.values(activeFilters).some(arr => arr.length > 0);

  // Get active statistics
  const getActiveStatistics = (): MonthlyStatistics | null => {
    if (!statsData) return null;
    if (useAggregated && statsData.aggregated) {
      return statsData.aggregated.statistics;
    }
    return statsData.currentMonth.statistics;
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
    };

    filteredJobs.forEach(job => {
      const date = job.extractedDate.split('T')[0];
      filtered.byDate[date] = (filtered.byDate[date] || 0) + 1;
      filtered.byIndustry[job.industry] = (filtered.byIndustry[job.industry] || 0) + 1;
      filtered.bySeniority[job.seniority] = (filtered.bySeniority[job.seniority] || 0) + 1;
      filtered.byLocation[job.location] = (filtered.byLocation[job.location] || 0) + 1;
      if (job.country) filtered.byCountry[job.country] = (filtered.byCountry[job.country] || 0) + 1;
      if (job.city) filtered.byCity[job.city] = (filtered.byCity[job.city] || 0) + 1;
      if (job.region) filtered.byRegion[job.region] = (filtered.byRegion[job.region] || 0) + 1;
      filtered.byCompany[job.company] = (filtered.byCompany[job.company] || 0) + 1;
      job.certificates.forEach(cert => {
        filtered.byCertificate[cert] = (filtered.byCertificate[cert] || 0) + 1;
      });
      job.keywords.forEach(keyword => {
        filtered.byKeyword[keyword] = (filtered.byKeyword[keyword] || 0) + 1;
      });
    });

    return filtered;
  };

  // Chart data functions
  const getIndustryChartData = () => {
    const stats = getFilteredStatistics();
    if (!stats) return [];
    return Object.entries(stats.byIndustry)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  };

  const getSeniorityChartData = () => {
    const stats = getFilteredStatistics();
    if (!stats) return [];
    return Object.entries(stats.bySeniority)
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
      }));
  };

  const getCertificateChartData = () => {
    const stats = getFilteredStatistics();
    if (!stats) return [];
    return Object.entries(stats.byCertificate)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  };

  const getTopKeywords = () => {
    const stats = getFilteredStatistics();
    if (!stats) return [];
    return Object.entries(stats.byKeyword)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15);
  };

  const getLocationChartData = () => {
    const stats = getFilteredStatistics();
    if (!stats) return [];
    return Object.entries(stats.byLocation)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  };

  const getCompanyChartData = () => {
    const stats = getFilteredStatistics();
    if (!stats) return [];
    return Object.entries(stats.byCompany)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  };

  // Geographic data helpers
  const getRegionData = () => {
    const stats = getFilteredStatistics();
    if (!stats || !stats.byRegion) return [];
    return Object.entries(stats.byRegion)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  };

  const getCountryData = () => {
    const stats = getFilteredStatistics();
    if (!stats || !stats.byCountry) return [];
    return Object.entries(stats.byCountry)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  };

  const getCityData = () => {
    const stats = getFilteredStatistics();
    if (!stats || !stats.byCity) return [];
    return Object.entries(stats.byCity)
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

  const filteredStats = getFilteredStatistics();
  const filteredJobs = getFilteredJobs();
  const hasSalaryData = filteredStats?.salaryStats && filteredStats.salaryStats.totalWithSalary > 0;

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
            onClick={handleExtractAndSave}
            disabled={extracting}
            className={`terminal-btn ${extracting ? 'loading' : ''}`}
          >
            {extracting ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
            <span>SYNC</span>
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
      {extractResult && (
        <div className="terminal-alert success">
          ✓ SYNC COMPLETE: {extractResult.newJobs} new jobs added | Total: {extractResult.currentMonthTotal}
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
                <div className="metric-compact-value">{statsData.summary.totalJobsAllTime.toLocaleString()}</div>
              </div>
              <div className="metric-compact">
                <div className="metric-compact-label">THIS MONTH</div>
                <div className="metric-compact-value">{statsData.currentMonth.jobCount.toLocaleString()}</div>
              </div>
              <div className="metric-compact">
                <div className="metric-compact-label">AVG/MONTH</div>
                <div className="metric-compact-value">{Math.round(statsData.summary.overallStatistics.averageJobsPerMonth).toLocaleString()}</div>
              </div>
              <div className="metric-compact">
                <div className="metric-compact-label">FILTERED</div>
                <div className="metric-compact-value highlight">{filteredStats?.totalJobs.toLocaleString() || 0}</div>
              </div>
              <div className="metric-compact">
                <div className="metric-compact-label">ARCHIVES</div>
                <div className="metric-compact-value">{statsData.summary.availableArchives.length}</div>
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

          {/* Time Series Chart */}
          <div className="terminal-panel span-2">
            <div className="panel-header">
              <TrendingUp size={14} />
              <span>POSTING VELOCITY</span>
            </div>
            <div className="chart-container compact">
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={getDateChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                  <XAxis dataKey="date" stroke="#4a5568" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#4a5568" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0e1a', border: '1px solid #00d4ff', fontSize: 11 }}
                    labelStyle={{ color: '#00d4ff' }}
                  />
                  <Area type="monotone" dataKey="jobs" fill="#00d4ff20" stroke="none" />
                  <Line type="monotone" dataKey="jobs" stroke="#00d4ff" strokeWidth={2} dot={{ fill: '#00d4ff', r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Industry Distribution */}
          <div className="terminal-panel">
            <div className="panel-header">
              <Building2 size={14} />
              <span>INDUSTRY</span>
            </div>
            <div className="chart-container compact">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={getIndustryChartData()} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                  <XAxis type="number" stroke="#4a5568" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#4a5568" width={100} tick={{ fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0e1a', border: '1px solid #00ff88', fontSize: 11 }}
                    labelStyle={{ color: '#00ff88' }}
                  />
                  <Bar dataKey="value" fill="#00ff88" onClick={(data) => data.name && toggleFilter('industry', data.name)} cursor="pointer" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Seniority Distribution */}
          <div className="terminal-panel">
            <div className="panel-header">
              <Users size={14} />
              <span>SENIORITY</span>
            </div>
            <div className="chart-container compact">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={getSeniorityChartData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    onClick={(data) => toggleFilter('seniority', data.name)}
                    style={{ cursor: 'pointer' }}
                  >
                    {getSeniorityChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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

          {/* Certifications */}
          <div className="terminal-panel">
            <div className="panel-header">
              <Award size={14} />
              <span>TOP CERTIFICATES</span>
            </div>
            <div className="chart-container compact">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={getCertificateChartData()} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                  <XAxis type="number" stroke="#4a5568" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#4a5568" width={80} tick={{ fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0e1a', border: '1px solid #ff6b6b', fontSize: 11 }}
                    labelStyle={{ color: '#ff6b6b' }}
                  />
                  <Bar dataKey="value" fill="#ff6b6b" onClick={(data) => data.name && toggleFilter('certificate', data.name)} cursor="pointer" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Regional Distribution */}
          <div className="terminal-panel">
            <div className="panel-header">
              <Globe size={14} />
              <span>REGIONAL DISTRIBUTION</span>
            </div>
            <div className="chart-container compact">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={getRegionData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getRegionData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getRegionColor(entry.name)} />
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

          {/* Top Countries */}
          <div className="terminal-panel">
            <div className="panel-header">
              <MapPin size={14} />
              <span>TOP COUNTRIES</span>
            </div>
            <div className="chart-container compact">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={getCountryData()} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                  <XAxis type="number" stroke="#4a5568" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#4a5568" width={100} tick={{ fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0e1a', border: '1px solid #06ffa5', fontSize: 11 }}
                    labelStyle={{ color: '#06ffa5' }}
                  />
                  <Bar dataKey="value" fill="#06ffa5" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Cities */}
          <div className="terminal-panel">
            <div className="panel-header">
              <MapPin size={14} />
              <span>TOP CITIES</span>
            </div>
            <div className="keywords-compact">
              {getCityData().map(({name, value}, index) => (
                <button
                  key={name}
                  className="keyword-compact"
                  style={{
                    background: `linear-gradient(135deg, #06ffa5 0%, #00c878 100%)`,
                    border: '1px solid #06ffa5',
                    opacity: 1 - (index * 0.05)
                  }}
                >
                  <span className="keyword-name">{name}</span>
                  <span className="keyword-value">{value}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Top Companies */}
          <div className="terminal-panel">
            <div className="panel-header">
              <Building2 size={14} />
              <span>TOP EMPLOYERS</span>
            </div>
            <div className="chart-container compact">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={getCompanyChartData()} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                  <XAxis type="number" stroke="#4a5568" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#4a5568" width={100} tick={{ fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0e1a', border: '1px solid #06ffa5', fontSize: 11 }}
                    labelStyle={{ color: '#06ffa5' }}
                  />
                  <Bar dataKey="value" fill="#06ffa5" onClick={(data) => data.name && toggleFilter('company', data.name)} cursor="pointer" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Keywords Panel */}
          <div className="terminal-panel span-full">
            <div className="panel-header">
              <Zap size={14} />
              <span>IN-DEMAND SKILLS</span>
            </div>
            <div className="keywords-compact">
              {getTopKeywords().map(([keyword, count], index) => (
                <button
                  key={keyword}
                  className={`keyword-compact ${activeFilters.keyword.includes(keyword) ? 'active' : ''}`}
                  onClick={() => toggleFilter('keyword', keyword)}
                >
                  <span className="keyword-name">{keyword}</span>
                  <span className="keyword-value">{count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
