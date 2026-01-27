"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Radio,
  Search,
  BarChart3,
  CheckSquare,
  Zap,
  Clock,
  Database,
  Bell,
  Rocket,
  Settings,
  Globe,
  Github,
  ArrowUpRight,
  Activity,
  Server,
  Cpu,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./home.css";

export default function Home() {
  const [logoClicks, setLogoClicks] = useState(0);
  const [glitchMode, setGlitchMode] = useState(false);

  // Easter egg: Multiple clicks on logo
  const handleLogoClick = () => {
    const newClicks = logoClicks + 1;
    setLogoClicks(newClicks);

    if (newClicks === 7) {
      setGlitchMode(true);
      setTimeout(() => {
        setGlitchMode(false);
        setLogoClicks(0);
      }, 2000);
    }

    setTimeout(() => setLogoClicks(0), 2000);
  };

  return (
    <div className="terminal-page">
      {/* Top Bar */}
      <header className="terminal-topbar">
        <div className="terminal-topbar-left">
          <div
            className={`terminal-logo ${glitchMode ? "glitch-active" : ""}`}
            onClick={handleLogoClick}
          >
            <Briefcase size={20} />
          </div>
          <span className="terminal-title">JOB MONITOR</span>
          <span className="terminal-separator">|</span>
          <span className="terminal-subtitle">Command Center</span>
        </div>
        <div className="terminal-topbar-right">
          <Link href="/rss" className="terminal-btn">
            <Radio size={14} />
            RSS
          </Link>
          <Link href="/scrape" className="terminal-btn">
            <Search size={14} />
            SCRAPE
          </Link>
          <Link href="/stats" className="terminal-btn">
            <BarChart3 size={14} />
            STATS
          </Link>
          <Link href="/applied" className="terminal-btn">
            <CheckSquare size={14} />
            APPLIED
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Status Bar */}
      <div className="terminal-statusbar">
        <div className="status-item active">
          <Activity size={12} />
          <span>SYSTEM ACTIVE</span>
        </div>
        <div className="status-item">
          <Clock size={12} />
          <span>5 MIN INTERVAL</span>
        </div>
        <div className="status-item">
          <Database size={12} />
          <span>GIST CACHE</span>
        </div>
        <div className="status-item">
          <Bell size={12} />
          <span>TELEGRAM</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="terminal-grid">
        {/* Key Metrics Panel */}
        <div className="terminal-panel span-full">
          <div className="panel-header">
            <BarChart3 size={14} />
            KEY METRICS
          </div>
          <div className="stats-cards-grid">
            <div className="stat-card-terminal">
              <div className="stat-card-icon">
                <Radio size={24} />
              </div>
              <div className="stat-card-value">24/7</div>
              <div className="stat-card-label">RSS MONITORING</div>
            </div>
            <div className="stat-card-terminal">
              <div className="stat-card-icon">
                <Globe size={24} />
              </div>
              <div className="stat-card-value">13</div>
              <div className="stat-card-label">COUNTRIES</div>
            </div>
            <div className="stat-card-terminal">
              <div className="stat-card-icon">
                <Zap size={24} />
              </div>
              <div className="stat-card-value">10x</div>
              <div className="stat-card-label">CONCURRENT SCRAPING</div>
            </div>
            <div className="stat-card-terminal">
              <div className="stat-card-icon">
                <Database size={24} />
              </div>
              <div className="stat-card-value">48h</div>
              <div className="stat-card-label">CACHE HORIZON</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="terminal-panel">
          <div className="panel-header">
            <Radio size={14} />
            RSS MONITOR
          </div>
          <div className="action-panel-content">
            <p className="action-description">
              Automated job monitoring with smart deduplication and instant Telegram notifications.
            </p>
            <ul className="feature-list-compact">
              <li>5-minute check interval</li>
              <li>Persistent GitHub Gist caching</li>
              <li>48-hour deduplication window</li>
            </ul>
            <Link href="/rss" className="terminal-btn action-btn">
              <Radio size={14} />
              OPEN DASHBOARD
            </Link>
          </div>
        </div>

        <div className="terminal-panel">
          <div className="panel-header">
            <Search size={14} />
            LINKEDIN SCRAPER
          </div>
          <div className="action-panel-content">
            <p className="action-description">
              Manual job search with concurrent processing and Excel export via Telegram.
            </p>
            <ul className="feature-list-compact">
              <li>Multi-keyword search</li>
              <li>13 country support</li>
              <li>Real-time progress streaming</li>
            </ul>
            <Link href="/scrape" className="terminal-btn action-btn">
              <Search size={14} />
              LAUNCH SCRAPER
            </Link>
          </div>
        </div>

        <div className="terminal-panel">
          <div className="panel-header">
            <BarChart3 size={14} />
            JOB STATISTICS
          </div>
          <div className="action-panel-content">
            <p className="action-description">
              Comprehensive analytics dashboard with industry insights and salary data.
            </p>
            <ul className="feature-list-compact">
              <li>Industry distribution analysis</li>
              <li>Skills & certificate trends</li>
              <li>Salary range insights</li>
            </ul>
            <Link href="/stats" className="terminal-btn action-btn">
              <BarChart3 size={14} />
              VIEW ANALYTICS
            </Link>
          </div>
        </div>

        <div className="terminal-panel">
          <div className="panel-header">
            <CheckSquare size={14} />
            APPLICATION TRACKER
          </div>
          <div className="action-panel-content">
            <p className="action-description">
              Track jobs applied through Telegram with response time analytics.
            </p>
            <ul className="feature-list-compact">
              <li>Application velocity charts</li>
              <li>Company distribution</li>
              <li>Response time analysis</li>
            </ul>
            <Link href="/applied" className="terminal-btn action-btn">
              <CheckSquare size={14} />
              TRACK APPLICATIONS
            </Link>
          </div>
        </div>

        <div className="terminal-panel">
          <div className="panel-header">
            <Zap size={14} />
            MANUAL TRIGGER
          </div>
          <div className="action-panel-content">
            <p className="action-description">
              Manually trigger RSS job check outside the automated schedule.
            </p>
            <ul className="feature-list-compact">
              <li>Immediate RSS check</li>
              <li>Returns JSON response</li>
              <li>Opens in new tab</li>
            </ul>
            <a
              href="/api/cron/check-jobs"
              target="_blank"
              rel="noopener noreferrer"
              className="terminal-btn action-btn"
            >
              <Zap size={14} />
              TRIGGER NOW
              <ArrowUpRight size={12} />
            </a>
          </div>
        </div>

        {/* System Information */}
        <div className="terminal-panel">
          <div className="panel-header">
            <Server size={14} />
            SYSTEM INFO
          </div>
          <div className="system-info-grid">
            <div className="system-info-item">
              <Rocket size={16} />
              <div className="system-info-content">
                <span className="system-info-label">PLATFORM</span>
                <span className="system-info-value">Vercel</span>
              </div>
            </div>
            <div className="system-info-item">
              <Settings size={16} />
              <div className="system-info-content">
                <span className="system-info-label">FRAMEWORK</span>
                <span className="system-info-value">Next.js 14</span>
              </div>
            </div>
            <div className="system-info-item">
              <Database size={16} />
              <div className="system-info-content">
                <span className="system-info-label">CACHE</span>
                <span className="system-info-value">GitHub Gist</span>
              </div>
            </div>
            <div className="system-info-item">
              <Bell size={16} />
              <div className="system-info-content">
                <span className="system-info-label">NOTIFICATIONS</span>
                <span className="system-info-value">Telegram Bot</span>
              </div>
            </div>
          </div>
        </div>

        {/* API Endpoints */}
        <div className="terminal-panel span-2">
          <div className="panel-header">
            <Cpu size={14} />
            API ENDPOINTS
          </div>
          <div className="endpoints-grid">
            <div className="endpoint-row">
              <span className="endpoint-method get">GET</span>
              <code className="endpoint-path">/api/cron/check-jobs</code>
              <span className="endpoint-desc">Automated RSS monitoring endpoint</span>
            </div>
            <div className="endpoint-row">
              <span className="endpoint-method mixed">GET/POST</span>
              <code className="endpoint-path">/api/scrape-jobs</code>
              <span className="endpoint-desc">LinkedIn job scraper (non-streaming)</span>
            </div>
            <div className="endpoint-row">
              <span className="endpoint-method get">GET</span>
              <code className="endpoint-path">/api/scrape-jobs-stream</code>
              <span className="endpoint-desc">LinkedIn scraper with SSE streaming</span>
            </div>
            <div className="endpoint-row">
              <span className="endpoint-method get">GET</span>
              <code className="endpoint-path">/api/stats</code>
              <span className="endpoint-desc">Job statistics and analytics data</span>
            </div>
            <div className="endpoint-row">
              <span className="endpoint-method get">GET</span>
              <code className="endpoint-path">/api/applied</code>
              <span className="endpoint-desc">Applied jobs tracking data</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="terminal-footer">
        <div className="footer-content">
          <a
            href="https://github.com/Great-GrayT/jobCron"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-github"
          >
            <Github size={14} />
            <span>GitHub</span>
          </a>
          <span className="footer-separator">•</span>
          <span className="footer-tech">Next.js</span>
          <span className="footer-separator">•</span>
          <span className="footer-tech">Vercel</span>
          <span className="footer-separator">•</span>
          <span className="footer-tech">24/7 Monitoring</span>
        </div>
        <div className="easter-egg-hint">
          <Zap size={12} />
          <span>Click the briefcase 7 times</span>
        </div>
      </footer>
    </div>
  );
}
