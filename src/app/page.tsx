"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Briefcase,
  Radio,
  BarChart3,
  CheckSquare,
  LayoutDashboard,
  LogIn,
  UserPlus,
  MessageSquare,
  Zap,
  Clock,
  Database,
  Bell,
  Rocket,
  Settings,
  Globe,
  Github,
  Activity,
  Server,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TimezonePicker } from "@/components/TimezonePicker";
import { CeramicPicker } from "@/components/CeramicPicker";
import "./home.css";

export default function Home() {
  const [logoClicks, setLogoClicks] = useState(0);
  const [glitchMode, setGlitchMode] = useState(false);
  const { authenticated } = useAuth();

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
          {authenticated ? (
            <>
              <Link href="/stats" className="terminal-btn">
                <BarChart3 size={14} />
                STATS
              </Link>
              <Link href="/applied" className="terminal-btn">
                <CheckSquare size={14} />
                APPLIED
              </Link>
              <Link href="/dashboard" className="terminal-btn">
                <LayoutDashboard size={14} />
                DASHBOARD
              </Link>
              <Link href="/messages" className="terminal-btn">
                <MessageSquare size={14} />
                MESSAGES
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="terminal-btn">
                <LogIn size={14} />
                LOGIN
              </Link>
              <Link href="/register" className="terminal-btn">
                <UserPlus size={14} />
                SIGN UP
              </Link>
            </>
          )}
          <CeramicPicker />
          <TimezonePicker />
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

        {/* Quick Actions | only for logged-in users (these routes are gated) */}
        {authenticated && (
        <>
        <div className="terminal-panel">
          <div className="panel-header">
            <LayoutDashboard size={14} />
            MY DASHBOARD
          </div>
          <div className="action-panel-content">
            <p className="action-description">
              Manage your own feeds, Telegram channels, job filters (JFS), and cron schedules.
            </p>
            <ul className="feature-list-compact">
              <li>Personal RSS feeds &amp; notifications</li>
              <li>Telegram bot tokens (encrypted)</li>
              <li>Per-user scrape &amp; check schedules</li>
            </ul>
            <Link href="/dashboard" className="terminal-btn action-btn">
              <LayoutDashboard size={14} />
              OPEN DASHBOARD
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
        </>
        )}

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
                <span className="system-info-label">DATA</span>
                <span className="system-info-value">Server API</span>
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
