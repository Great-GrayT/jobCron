"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart3, TrendingUp, RefreshCw, Loader2, ArrowLeft, ArrowRight, Filter, Download, Sparkles, Calendar, Briefcase, Award, Target, MapPin, Building2 } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import "./stats.css";

interface JobStatistic {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  postedDate: string;
  extractedDate: string;
  keywords: string[];
  certificates: string[];
  industry: string;
  seniority: string;
  description: string;
}

interface MonthlyStatistics {
  totalJobs: number;
  byDate: Record<string, number>;
  byIndustry: Record<string, number>;
  byCertificate: Record<string, number>;
  byKeyword: Record<string, number>;
  bySeniority: Record<string, number>;
  byLocation: Record<string, number>;
  byCompany: Record<string, number>;
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

export default function StatsPage() {
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [selectedCertificate, setSelectedCertificate] = useState<string>("");
  const [selectedSeniority, setSelectedSeniority] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [useAggregated, setUseAggregated] = useState<boolean>(true); // Show all-time data by default

  // Easter egg states
  const [iconClicks, setIconClicks] = useState(0);
  const [secretMode, setSecretMode] = useState(false);

  // Chart colors matching theme
  const COLORS = ['#3b82f6', '#60a5fa', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#93c5fd', '#dbeafe'];

  // Easter egg: Triple click on stats icon
  const handleIconClick = () => {
    const newClicks = iconClicks + 1;
    setIconClicks(newClicks);

    if (newClicks === 3) {
      setSecretMode(true);
      setTimeout(() => {
        setSecretMode(false);
        setIconClicks(0);
      }, 3000);
    }

    setTimeout(() => setIconClicks(0), 1000);
  };

  // Load statistics on mount
  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stats/get');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setExtractResult({
        processed: data.processed,
        newJobs: data.newJobs,
        currentMonthTotal: data.currentMonthTotal,
      });

      // Reload statistics after extraction
      await loadStatistics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setExtracting(false);
    }
  };

  // Get the statistics to use (aggregated or current month only)
  const getActiveStatistics = (): MonthlyStatistics | null => {
    if (!statsData) return null;
    if (useAggregated && statsData.aggregated) {
      return statsData.aggregated.statistics;
    }
    return statsData.currentMonth.statistics;
  };

  // Filter jobs based on selected filters (current month only)
  const getFilteredJobs = (): JobStatistic[] => {
    if (!statsData) return [];

    return statsData.currentMonth.jobs.filter(job => {
      if (selectedIndustry && job.industry !== selectedIndustry) return false;
      if (selectedCertificate && !job.certificates.includes(selectedCertificate)) return false;
      if (selectedSeniority && job.seniority !== selectedSeniority) return false;
      if (selectedLocation && !job.location.toLowerCase().includes(selectedLocation.toLowerCase())) return false;
      return true;
    });
  };

  // Prepare chart data
  const getIndustryChartData = () => {
    const stats = getActiveStatistics();
    if (!stats) return [];
    return Object.entries(stats.byIndustry)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  };

  const getSeniorityChartData = () => {
    const stats = getActiveStatistics();
    if (!stats) return [];
    return Object.entries(stats.bySeniority)
      .map(([name, value]) => ({ name, value }));
  };

  const getDateChartData = () => {
    const stats = getActiveStatistics();
    if (!stats) return [];
    const entries = Object.entries(stats.byDate)
      .sort(([a], [b]) => a.localeCompare(b));

    // Show last 30 days for aggregated, last 14 for current month
    const limit = useAggregated ? 30 : 14;
    return entries
      .slice(-limit)
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        jobs: count,
      }));
  };

  const getCertificateChartData = () => {
    const stats = getActiveStatistics();
    if (!stats) return [];
    return Object.entries(stats.byCertificate)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  };

  const getTopKeywords = () => {
    const stats = getActiveStatistics();
    if (!stats) return [];
    return Object.entries(stats.byKeyword)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20); // Show more keywords for aggregated data
  };

  const getLocationChartData = () => {
    const stats = getActiveStatistics();
    if (!stats) return [];
    return Object.entries(stats.byLocation)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  };

  const filteredJobs = getFilteredJobs();

  return (
    <div className="stats-page">
      <div className="container">
        <div className="header">
          <div
            className={`stats-icon ${secretMode ? 'secret-mode' : ''}`}
            onClick={handleIconClick}
          >
            <BarChart3 size={64} strokeWidth={1.5} />
          </div>
          <h1 className="title">Job Statistics Dashboard</h1>
          <p className="subtitle">
            Comprehensive analytics and insights from RSS job feeds
          </p>
        </div>

        {/* Extract Button */}
        <div className="card-container">
          <div className="card-content">
            <div className="extract-section">
              <p className="extract-description">
                Extract jobs from RSS feeds, analyze metadata (industry, certificates, seniority),
                and save to GitHub Gist with monthly archiving.
              </p>
              <button
                onClick={handleExtractAndSave}
                disabled={extracting}
                className={`btn btn-primary extract-btn ${extracting ? 'disabled' : ''}`}
              >
                {extracting ? (
                  <>
                    <Loader2 size={20} className="spinner-icon" />
                    <span>Extracting & Analyzing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={20} />
                    <span>Extract & Save Statistics</span>
                  </>
                )}
              </button>
            </div>

            {/* Extract Results */}
            {extractResult && (
              <div className="alert alert-success animate-slideUp">
                <strong>Success!</strong> Processed {extractResult.processed} jobs,
                added {extractResult.newJobs} new jobs.
                Total in current month: {extractResult.currentMonthTotal}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="alert alert-error">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-container">
            <Loader2 size={48} className="spinner-icon" />
            <p>Loading statistics...</p>
          </div>
        )}

        {/* Statistics Display */}
        {!loading && statsData && (
          <>
            {/* Key Metrics */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon">
                  <Briefcase size={32} />
                </div>
                <div className="metric-content">
                  <div className="metric-value">{statsData.currentMonth.jobCount}</div>
                  <div className="metric-label">Jobs This Month</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon">
                  <TrendingUp size={32} />
                </div>
                <div className="metric-content">
                  <div className="metric-value">{statsData.summary.totalJobsAllTime}</div>
                  <div className="metric-label">Total All Time</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon">
                  <Target size={32} />
                </div>
                <div className="metric-content">
                  <div className="metric-value">
                    {Math.round(statsData.summary.overallStatistics.averageJobsPerMonth)}
                  </div>
                  <div className="metric-label">Avg Per Month</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon">
                  <Calendar size={32} />
                </div>
                <div className="metric-content">
                  <div className="metric-value">{statsData.summary.availableArchives.length}</div>
                  <div className="metric-label">Archived Months</div>
                </div>
              </div>
            </div>

            {/* Data View Toggle */}
            <div className="view-toggle-card">
              <div className="toggle-header">
                <span className="toggle-label">Data View:</span>
                <div className="toggle-buttons">
                  <button
                    onClick={() => setUseAggregated(true)}
                    className={`toggle-btn ${useAggregated ? 'active' : ''}`}
                  >
                    All Time ({statsData.aggregated?.monthsIncluded || 1} months)
                  </button>
                  <button
                    onClick={() => setUseAggregated(false)}
                    className={`toggle-btn ${!useAggregated ? 'active' : ''}`}
                  >
                    Current Month Only
                  </button>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="filters-card">
              <div className="filters-header">
                <Filter size={20} />
                <span>Filter Current Month Jobs</span>
              </div>
              <div className="filters-grid">
                <div className="filter-group">
                  <label>Industry</label>
                  <select
                    value={selectedIndustry}
                    onChange={(e) => setSelectedIndustry(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Industries</option>
                    {Object.keys(statsData.currentMonth.statistics.byIndustry).map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Certificate</label>
                  <select
                    value={selectedCertificate}
                    onChange={(e) => setSelectedCertificate(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Certificates</option>
                    {Object.keys(statsData.currentMonth.statistics.byCertificate).map(cert => (
                      <option key={cert} value={cert}>{cert}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Seniority</label>
                  <select
                    value={selectedSeniority}
                    onChange={(e) => setSelectedSeniority(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Levels</option>
                    {Object.keys(statsData.currentMonth.statistics.bySeniority).map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Location</label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Locations</option>
                    {Object.keys(statsData.currentMonth.statistics.byLocation)
                      .sort()
                      .slice(0, 20)
                      .map(location => (
                        <option key={location} value={location}>{location}</option>
                      ))}
                  </select>
                </div>

                <div className="filter-actions">
                  <button
                    onClick={() => {
                      setSelectedIndustry("");
                      setSelectedCertificate("");
                      setSelectedSeniority("");
                      setSelectedLocation("");
                    }}
                    className="btn btn-secondary"
                  >
                    Clear Filters
                  </button>
                  <div className="filter-count">
                    {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="charts-section">
              <h2>Visual Analytics</h2>

              {/* Jobs Over Time */}
              <div className="chart-card">
                <h3>Jobs Over Time (Last 14 Days)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getDateChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3441" />
                    <XAxis dataKey="date" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #3b82f6' }}
                      labelStyle={{ color: '#e4e6eb' }}
                    />
                    <Line type="monotone" dataKey="jobs" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Industry Distribution */}
              <div className="chart-card">
                <h3>Top Industries</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getIndustryChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3441" />
                    <XAxis dataKey="name" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #3b82f6' }}
                      labelStyle={{ color: '#e4e6eb' }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Seniority Distribution */}
              <div className="chart-card">
                <h3>Seniority Levels</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getSeniorityChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getSeniorityChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #3b82f6' }}
                      labelStyle={{ color: '#e4e6eb' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Certificates */}
              <div className="chart-card">
                <h3>Top Certificates Required</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getCertificateChartData()} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3441" />
                    <XAxis type="number" stroke="#9ca3af" />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" width={100} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #3b82f6' }}
                      labelStyle={{ color: '#e4e6eb' }}
                    />
                    <Bar dataKey="value" fill="#60a5fa" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Keywords Cloud */}
            <div className="keywords-card">
              <h3>
                <Award size={24} />
                Top Keywords
              </h3>
              <div className="keywords-cloud">
                {getTopKeywords().map(([keyword, count]) => (
                  <div
                    key={keyword}
                    className="keyword-tag"
                    style={{
                      fontSize: `${Math.min(1 + count / 10, 2)}rem`,
                    }}
                  >
                    {keyword}
                    <span className="keyword-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Month Info */}
            <div className="info-footer">
              <div className="info-item">
                <Calendar size={16} />
                <span>Current Month: {statsData.currentMonth.month}</span>
              </div>
              <div className="info-item">
                <TrendingUp size={16} />
                <span>Last Updated: {new Date(statsData.currentMonth.lastUpdated).toLocaleString()}</span>
              </div>
            </div>
          </>
        )}

        {/* Navigation */}
        <div className="nav-links">
          <Link href="/" className="nav-link">
            <ArrowLeft size={16} />
            <span>Home</span>
          </Link>
          <Link href="/rss" className="nav-link nav-link-primary">
            <span>RSS Monitor</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Easter egg hint */}
        <div className="hint-text">
          <Sparkles size={16} />
          <span>Tip: Try triple-clicking the statistics icon</span>
        </div>
      </div>
    </div>
  );
}
