"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
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
      const url = month
        ? `/api/applied?month=${month}`
        : "/api/applied";
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

  return (
    <div className="applied-page">
      <div className="container">
        {/* Header */}
        <header className="page-header">
          <Link href="/" className="back-link">
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </Link>
          <h1 className="page-title">
            <Briefcase size={32} />
            Applied Jobs
          </h1>
          <p className="page-subtitle">
            Track all jobs you've applied to through the Telegram links
          </p>
        </header>

        {/* Stats Cards */}
        {stats && (
          <section className="stats-section">
            <div className="stats-grid">
              <div className="stat-card card">
                <div className="stat-icon">
                  <TrendingUp size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.totalApplications}</div>
                  <div className="stat-label">Total Applications</div>
                </div>
              </div>

              <div className="stat-card card">
                <div className="stat-icon">
                  <Calendar size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{availableMonths.length}</div>
                  <div className="stat-label">Months Tracked</div>
                </div>
              </div>

              <div className="stat-card card">
                <div className="stat-icon">
                  <Clock size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">
                    {stats.lastUpdated
                      ? getTimeAgo(stats.lastUpdated)
                      : "Never"}
                  </div>
                  <div className="stat-label">Last Updated</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Filters */}
        <section className="filters-section">
          <div className="filters-row">
            <div className="filter-group">
              <Filter size={16} />
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

            <button
              onClick={() => fetchApplications(selectedMonth || undefined)}
              className="refresh-btn"
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              <span>Refresh</span>
            </button>
          </div>
        </section>

        {/* Content */}
        <section className="content-section">
          {loading ? (
            <div className="loading-state">
              <Loader2 size={48} className="spin" />
              <p>Loading applications...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
              <button onClick={() => fetchApplications()} className="retry-btn">
                Try Again
              </button>
            </div>
          ) : applications.length === 0 ? (
            <div className="empty-state">
              <Briefcase size={64} />
              <h3>No Applications Yet</h3>
              <p>
                When you click on job links from Telegram, they will appear here.
              </p>
            </div>
          ) : (
            <div className="applications-list">
              {applications.map((app) => (
                <div key={app.id} className="application-card card">
                  <div className="app-header">
                    <h3 className="app-title">{app.jobTitle}</h3>
                    <a
                      href={app.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="app-link"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>

                  <div className="app-details">
                    <div className="app-detail">
                      <Building2 size={14} />
                      <span>{app.company}</span>
                    </div>
                    <div className="app-detail">
                      <MapPin size={14} />
                      <span>{app.location}</span>
                    </div>
                    {app.roleType && (
                      <div className="app-detail">
                        <Briefcase size={14} />
                        <span>{app.roleType}</span>
                      </div>
                    )}
                  </div>

                  <div className="app-footer">
                    <div className="app-dates">
                      <span className="app-date">
                        <Calendar size={12} />
                        Applied: {formatDate(app.appliedAt)}
                      </span>
                      {app.postedDate && (
                        <span className="app-date posted">
                          Posted: {formatDate(app.postedDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
