"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  Briefcase,
  Building2,
  MapPin,
  Calendar,
  ExternalLink,
  Clock,
  TrendingUp,
  Filter,
  BarChart3,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import "./applied.css";

interface AppliedJob {
  id: string;
  jobId: string;
  appliedAt: string;
  jobTitle: string;
  company: string;
  location: string;
  originalUrl: string;
  postedDate: string;
  roleType?: string;
  industry?: string;
}

interface Stats {
  totalApplications: number;
  applicationsByMonth: Record<string, number>;
  lastUpdated: string;
}

const CHART_COLORS = ["#00d4ff", "#00ff88", "#ffcc00", "#ff6b6b", "#9d4edd", "#4cc9f0", "#06ffa5", "#ff006e"];

export default function AppliedJobsPage() {
  const [applications, setApplications] = useState<AppliedJob[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const fetchApplications = async (month?: string) => {
    setLoading(true);
    setError(null);

    try {
      const url = month ? `/api/applied?month=${month}` : "/api/applied";
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setApplications(data.data);
        setStats(data.stats);
      } else {
        setError(data.error || "Failed to fetch applications");
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    fetchApplications(month || undefined);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const availableMonths = stats
    ? Object.keys(stats.applicationsByMonth).sort().reverse()
    : [];

  // Analytics data calculations
  const analyticsData = useMemo(() => {
    if (!applications.length) return null;

    // Applications by date (last 14 days)
    const byDate: Record<string, number> = {};
    applications.forEach((app) => {
      const date = app.appliedAt.split("T")[0];
      byDate[date] = (byDate[date] || 0) + 1;
    });
    const dateData = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        applications: count,
      }));

    // Applications by company
    const byCompany: Record<string, number> = {};
    applications.forEach((app) => {
      byCompany[app.company] = (byCompany[app.company] || 0) + 1;
    });
    const companyData = Object.entries(byCompany)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));

    // Applications by location
    const byLocation: Record<string, number> = {};
    applications.forEach((app) => {
      if (app.location) {
        // Extract city/country from location
        const loc = app.location.split(",")[0].trim();
        byLocation[loc] = (byLocation[loc] || 0) + 1;
      }
    });
    const locationData = Object.entries(byLocation)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));

    // Applications by industry (if available)
    const byIndustry: Record<string, number> = {};
    applications.forEach((app) => {
      if (app.industry) {
        byIndustry[app.industry] = (byIndustry[app.industry] || 0) + 1;
      }
    });
    const industryData = Object.entries(byIndustry)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));

    // Applications by role type (if available)
    const byRoleType: Record<string, number> = {};
    applications.forEach((app) => {
      if (app.roleType) {
        byRoleType[app.roleType] = (byRoleType[app.roleType] || 0) + 1;
      }
    });
    const roleTypeData = Object.entries(byRoleType)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));

    // Average applications per day
    const uniqueDays = Object.keys(byDate).length;
    const avgPerDay = uniqueDays > 0 ? (applications.length / uniqueDays).toFixed(1) : "0";

    // Most active day
    const mostActiveDay = Object.entries(byDate).sort(([, a], [, b]) => b - a)[0];

    return {
      dateData,
      companyData,
      locationData,
      industryData,
      roleTypeData,
      avgPerDay,
      mostActiveDay,
      totalCompanies: Object.keys(byCompany).length,
      totalLocations: Object.keys(byLocation).length,
    };
  }, [applications]);

  return (
    <div className="terminal-page">
      {/* Top Bar */}
      <div className="terminal-topbar">
        <div className="terminal-topbar-left">
          <Briefcase size={20} />
          <span className="terminal-title">APPLICATION TRACKER</span>
          <span className="terminal-separator">|</span>
          <span className="terminal-subtitle">JOB APPLICATION ANALYTICS</span>
        </div>
        <div className="terminal-topbar-right">
          <button
            onClick={() => fetchApplications(selectedMonth || undefined)}
            disabled={loading}
            className={`terminal-btn ${loading ? "loading" : ""}`}
          >
            {loading ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            <span>REFRESH</span>
          </button>
          <Link href="/stats" className="terminal-btn">
            <BarChart3 size={14} />
            <span>STATS</span>
          </Link>
          <Link href="/" className="terminal-btn">
            <ArrowLeft size={14} />
            <span>HOME</span>
          </Link>
        </div>
      </div>

      {/* Status Bar */}
      {stats && (
        <div className="terminal-statusbar">
          <div className="status-item">
            <Target size={12} />
            <span>TOTAL: {stats.totalApplications}</span>
          </div>
          <div className="status-item">
            <Calendar size={12} />
            <span>MONTHS: {availableMonths.length}</span>
          </div>
          <div className="status-item">
            <Clock size={12} />
            <span>
              UPDATED:{" "}
              {stats.lastUpdated ? getTimeAgo(stats.lastUpdated) : "Never"}
            </span>
          </div>
          {selectedMonth && (
            <div className="status-item highlight">
              <Filter size={12} />
              <span>FILTER: {selectedMonth}</span>
            </div>
          )}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="terminal-alert error">✗ ERROR: {error}</div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="terminal-loading">
          <Loader2 size={32} className="spin" />
          <p>LOADING APPLICATION DATA...</p>
        </div>
      )}

      {/* Main Content */}
      {!loading && (
        <div className="terminal-grid">
          {/* Key Metrics Panel */}
          <div className="terminal-panel span-full">
            <div className="panel-header">
              <TrendingUp size={14} />
              <span>KEY METRICS</span>
            </div>
            <div className="metrics-compact">
              <div className="metric-compact">
                <div className="metric-compact-label">TOTAL APPLICATIONS</div>
                <div className="metric-compact-value highlight">
                  {stats?.totalApplications || 0}
                </div>
              </div>
              <div className="metric-compact">
                <div className="metric-compact-label">COMPANIES</div>
                <div className="metric-compact-value">
                  {analyticsData?.totalCompanies || 0}
                </div>
              </div>
              <div className="metric-compact">
                <div className="metric-compact-label">LOCATIONS</div>
                <div className="metric-compact-value">
                  {analyticsData?.totalLocations || 0}
                </div>
              </div>
              <div className="metric-compact">
                <div className="metric-compact-label">AVG/DAY</div>
                <div className="metric-compact-value warning">
                  {analyticsData?.avgPerDay || "0"}
                </div>
              </div>
              <div className="metric-compact">
                <div className="metric-compact-label">MONTHS TRACKED</div>
                <div className="metric-compact-value">
                  {availableMonths.length}
                </div>
              </div>
              <div className="metric-compact">
                <div className="metric-compact-label">FILTER</div>
                <div className="filter-section" style={{ padding: 0 }}>
                  <select
                    value={selectedMonth}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="month-select"
                  >
                    <option value="">All Months</option>
                    {availableMonths.map((month) => (
                      <option key={month} value={month}>
                        {month} ({stats?.applicationsByMonth[month] || 0})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Application Timeline */}
          {analyticsData && analyticsData.dateData.length > 0 && (
            <div className="terminal-panel span-2">
              <div className="panel-header">
                <TrendingUp size={14} />
                <span>APPLICATION VELOCITY</span>
              </div>
              <div className="chart-container compact" style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={analyticsData.dateData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                    <XAxis
                      dataKey="date"
                      stroke="#4a5568"
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      stroke="#4a5568"
                      tick={{ fontSize: 10 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0a0e1a",
                        border: "1px solid #00d4ff",
                        fontSize: 11,
                      }}
                      labelStyle={{ color: "#00d4ff" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="applications"
                      stroke="#00d4ff"
                      strokeWidth={2}
                      dot={{ fill: "#00d4ff", r: 4 }}
                      activeDot={{ r: 6, fill: "#00ff88" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Monthly Breakdown */}
          {stats && Object.keys(stats.applicationsByMonth).length > 0 && (
            <div className="terminal-panel">
              <div className="panel-header">
                <Calendar size={14} />
                <span>MONTHLY BREAKDOWN</span>
              </div>
              <div style={{ padding: "0.75rem", maxHeight: 200, overflowY: "auto" }}>
                {Object.entries(stats.applicationsByMonth)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([month, count]) => (
                    <div key={month} className="month-item">
                      <span className="month-name">{month}</span>
                      <span className="month-count">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Top Companies */}
          {analyticsData && analyticsData.companyData.length > 0 && (
            <div className="terminal-panel">
              <div className="panel-header">
                <Building2 size={14} />
                <span>TOP COMPANIES</span>
              </div>
              <div className="chart-container compact" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={analyticsData.companyData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                    <XAxis
                      type="number"
                      stroke="#4a5568"
                      tick={{ fontSize: 10 }}
                      allowDecimals={false}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#4a5568"
                      width={80}
                      tick={{ fontSize: 8 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0a0e1a",
                        border: "1px solid #9d4edd",
                        fontSize: 11,
                      }}
                      labelStyle={{ color: "#9d4edd" }}
                    />
                    <Bar
                      dataKey="value"
                      fill="#9d4edd"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top Locations */}
          {analyticsData && analyticsData.locationData.length > 0 && (
            <div className="terminal-panel">
              <div className="panel-header">
                <MapPin size={14} />
                <span>TOP LOCATIONS</span>
              </div>
              <div className="chart-container compact" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={analyticsData.locationData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                    <XAxis
                      type="number"
                      stroke="#4a5568"
                      tick={{ fontSize: 10 }}
                      allowDecimals={false}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#4a5568"
                      width={80}
                      tick={{ fontSize: 8 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0a0e1a",
                        border: "1px solid #4cc9f0",
                        fontSize: 11,
                      }}
                      labelStyle={{ color: "#4cc9f0" }}
                    />
                    <Bar
                      dataKey="value"
                      fill="#4cc9f0"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Industry Distribution (if data available) */}
          {analyticsData && analyticsData.industryData.length > 0 && (
            <div className="terminal-panel">
              <div className="panel-header">
                <Briefcase size={14} />
                <span>INDUSTRY DISTRIBUTION</span>
              </div>
              <div
                className="chart-container compact"
                style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={analyticsData.industryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${((percent || 0) * 100).toFixed(0)}%`
                      }
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analyticsData.industryData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0a0e1a",
                        border: "1px solid #ffcc00",
                        fontSize: 11,
                      }}
                      labelStyle={{ color: "#ffcc00" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Applications Table */}
          <div className="terminal-panel span-full">
            <div className="panel-header">
              <Briefcase size={14} />
              <span>
                APPLICATIONS ({applications.length})
                {selectedMonth && ` - ${selectedMonth}`}
              </span>
            </div>
            {applications.length === 0 ? (
              <div className="empty-state">
                <Briefcase size={48} />
                <h3>NO APPLICATIONS FOUND</h3>
                <p>
                  When you click on job links from Telegram, they will appear
                  here.
                </p>
              </div>
            ) : (
              <div
                style={{
                  padding: "0.5rem",
                  overflowX: "auto",
                  maxHeight: "500px",
                  overflowY: "auto",
                }}
              >
                <table className="jobs-table">
                  <thead>
                    <tr>
                      <th style={{ width: "30%" }}>JOB TITLE</th>
                      <th style={{ width: "15%" }}>COMPANY</th>
                      <th style={{ width: "15%" }}>LOCATION</th>
                      <th style={{ width: "12%" }}>ROLE TYPE</th>
                      <th style={{ width: "13%" }}>APPLIED</th>
                      <th style={{ width: "10%" }}>POSTED</th>
                      <th style={{ width: "5%" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app, index) => (
                      <tr
                        key={app.id}
                        onClick={() => window.open(app.originalUrl, "_blank")}
                      >
                        <td className="job-title-cell">{app.jobTitle}</td>
                        <td className="company-cell">{app.company}</td>
                        <td className="location-cell">{app.location}</td>
                        <td style={{ color: "#ffcc00" }}>
                          {app.roleType || "N/A"}
                        </td>
                        <td className="date-cell">{formatShortDate(app.appliedAt)}</td>
                        <td className="date-cell">
                          {app.postedDate ? formatShortDate(app.postedDate) : "N/A"}
                        </td>
                        <td>
                          <a
                            href={app.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="external-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={14} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Comprehensive Statistics */}
          {analyticsData && (
            <div className="terminal-panel span-full">
              <div className="panel-header">
                <BarChart3 size={14} />
                <span>COMPREHENSIVE STATISTICS</span>
              </div>
              <div style={{ padding: "0.75rem", overflowX: "auto" }}>
                <table className="jobs-table">
                  <thead>
                    <tr>
                      <th style={{ width: "40%" }}>METRIC</th>
                      <th style={{ width: "20%", textAlign: "right" }}>VALUE</th>
                      <th style={{ width: "40%" }}>DETAILS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ color: "#6b7280" }}>Total Applications</td>
                      <td
                        style={{
                          textAlign: "right",
                          color: "#00ff88",
                          fontWeight: "bold",
                        }}
                      >
                        {stats?.totalApplications || 0}
                      </td>
                      <td style={{ color: "#6b7280" }}>
                        Across {availableMonths.length} month(s)
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: "#6b7280" }}>Unique Companies</td>
                      <td
                        style={{
                          textAlign: "right",
                          color: "#9d4edd",
                          fontWeight: "bold",
                        }}
                      >
                        {analyticsData.totalCompanies}
                      </td>
                      <td style={{ color: "#6b7280" }}>
                        Top:{" "}
                        {analyticsData.companyData[0]?.name || "N/A"} (
                        {analyticsData.companyData[0]?.value || 0})
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: "#6b7280" }}>Unique Locations</td>
                      <td
                        style={{
                          textAlign: "right",
                          color: "#4cc9f0",
                          fontWeight: "bold",
                        }}
                      >
                        {analyticsData.totalLocations}
                      </td>
                      <td style={{ color: "#6b7280" }}>
                        Top:{" "}
                        {analyticsData.locationData[0]?.name || "N/A"} (
                        {analyticsData.locationData[0]?.value || 0})
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: "#6b7280" }}>Average Per Day</td>
                      <td
                        style={{
                          textAlign: "right",
                          color: "#ffcc00",
                          fontWeight: "bold",
                        }}
                      >
                        {analyticsData.avgPerDay}
                      </td>
                      <td style={{ color: "#6b7280" }}>
                        Most Active:{" "}
                        {analyticsData.mostActiveDay
                          ? `${analyticsData.mostActiveDay[0]} (${analyticsData.mostActiveDay[1]})`
                          : "N/A"}
                      </td>
                    </tr>
                    {analyticsData.industryData.length > 0 && (
                      <tr>
                        <td style={{ color: "#6b7280" }}>Industries</td>
                        <td
                          style={{
                            textAlign: "right",
                            color: "#06ffa5",
                            fontWeight: "bold",
                          }}
                        >
                          {analyticsData.industryData.length}
                        </td>
                        <td style={{ color: "#6b7280" }}>
                          Top:{" "}
                          {analyticsData.industryData[0]?.name || "N/A"} (
                          {analyticsData.industryData[0]?.value || 0})
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
