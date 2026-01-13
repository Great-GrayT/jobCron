"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, Radio, Search, Database, Clock, Rocket, Settings, Smartphone, Zap, ArrowRight, ArrowUpRight, Github, BarChart3 } from "lucide-react";
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
    <div className="home-page">
      <div className="container">
        {/* Hero Section */}
        <section className="hero">
          <div
            className={`logo ${glitchMode ? 'glitch-active' : ''}`}
            onClick={handleLogoClick}
          >
            <Briefcase size={80} strokeWidth={1.5} />
          </div>
          <h1 className="main-title">
            <span className="title-line">LinkedIn Jobs</span>
            <span className="title-line title-highlight">Monitor</span>
          </h1>
          <p className="hero-subtitle">
            Automated job monitoring with RSS feeds & LinkedIn scraping
          </p>
          <div className="status-badge">
            <span className="status-dot"></span>
            System Active
          </div>
        </section>

        {/* Features Grid */}
        <section className="features-grid">
          <div className="feature-card card">
            <div className="feature-icon">
              <Radio size={48} strokeWidth={1.5} />
            </div>
            <h3>RSS Monitoring</h3>
            <p>Automatically checks RSS feeds every 5 minutes for new job postings</p>
            <ul className="feature-list">
              <li>Smart deduplication</li>
              <li>Telegram notifications</li>
              <li>Persistent caching</li>
            </ul>
          </div>

          <div className="feature-card card">
            <div className="feature-icon">
              <Search size={48} strokeWidth={1.5} />
            </div>
            <h3>LinkedIn Scraper</h3>
            <p>Manual job search with concurrent processing and Excel export</p>
            <ul className="feature-list">
              <li>10x faster with concurrency</li>
              <li>Multi-keyword search</li>
              <li>Excel file generation</li>
            </ul>
          </div>

          <div className="feature-card card">
            <div className="feature-icon">
              <Database size={48} strokeWidth={1.5} />
            </div>
            <h3>Smart Caching</h3>
            <p>GitHub Gist integration for persistent job tracking</p>
            <ul className="feature-list">
              <li>No duplicate notifications</li>
              <li>Cross-deployment persistence</li>
              <li>48h auto-reset</li>
            </ul>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="quick-actions">
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-grid">
            <Link href="/rss" className="action-card card">
              <div className="action-icon">
                <Radio size={40} strokeWidth={1.5} />
              </div>
              <div className="action-content">
                <h3>RSS Monitor</h3>
                <p>View RSS monitoring dashboard and trigger manual checks</p>
              </div>
              <div className="action-arrow">
                <ArrowRight size={32} strokeWidth={2} />
              </div>
            </Link>

            <Link href="/scrape" className="action-card card">
              <div className="action-icon">
                <Search size={40} strokeWidth={1.5} />
              </div>
              <div className="action-content">
                <h3>LinkedIn Scraper</h3>
                <p>Search LinkedIn jobs with custom keywords and countries</p>
              </div>
              <div className="action-arrow">
                <ArrowRight size={32} strokeWidth={2} />
              </div>
            </Link>

            <Link href="/stats" className="action-card card">
              <div className="action-icon">
                <BarChart3 size={40} strokeWidth={1.5} />
              </div>
              <div className="action-content">
                <h3>Job Statistics</h3>
                <p>View comprehensive analytics and insights from RSS feeds</p>
              </div>
              <div className="action-arrow">
                <ArrowRight size={32} strokeWidth={2} />
              </div>
            </Link>

            <a href="/api/cron/check-jobs" className="action-card card" target="_blank" rel="noopener noreferrer">
              <div className="action-icon">
                <Zap size={40} strokeWidth={1.5} />
              </div>
              <div className="action-content">
                <h3>Manual Trigger</h3>
                <p>Manually trigger RSS job check (opens in new tab)</p>
              </div>
              <div className="action-arrow">
                <ArrowUpRight size={32} strokeWidth={2} />
              </div>
            </a>
          </div>
        </section>

        {/* System Info */}
        <section className="system-info">
          <h2 className="section-title">System Information</h2>
          <div className="info-grid">
            <div className="info-item card">
              <div className="info-icon">
                <Clock size={32} strokeWidth={1.5} />
              </div>
              <div className="info-content">
                <div className="info-label">Check Interval</div>
                <div className="info-value">5 minutes</div>
              </div>
            </div>

            <div className="info-item card">
              <div className="info-icon">
                <Rocket size={32} strokeWidth={1.5} />
              </div>
              <div className="info-content">
                <div className="info-label">Platform</div>
                <div className="info-value">Vercel</div>
              </div>
            </div>

            <div className="info-item card">
              <div className="info-icon">
                <Settings size={32} strokeWidth={1.5} />
              </div>
              <div className="info-content">
                <div className="info-label">Framework</div>
                <div className="info-value">Next.js 14</div>
              </div>
            </div>

            <div className="info-item card">
              <div className="info-icon">
                <Smartphone size={32} strokeWidth={1.5} />
              </div>
              <div className="info-content">
                <div className="info-label">Notifications</div>
                <div className="info-value">Telegram</div>
              </div>
            </div>
          </div>
        </section>

        {/* API Endpoints */}
        <section className="api-section">
          <h2 className="section-title">API Endpoints</h2>
          <div className="endpoints-list">
            <div className="endpoint-item card">
              <div className="endpoint-badge">GET</div>
              <code className="endpoint-path">/api/cron/check-jobs</code>
              <p className="endpoint-desc">Automated RSS monitoring endpoint</p>
            </div>

            <div className="endpoint-item card">
              <div className="endpoint-badge endpoint-badge-post">GET/POST</div>
              <code className="endpoint-path">/api/scrape-jobs</code>
              <p className="endpoint-desc">LinkedIn job scraper (non-streaming)</p>
            </div>

            <div className="endpoint-item card">
              <div className="endpoint-badge">GET</div>
              <code className="endpoint-path">/api/scrape-jobs-stream</code>
              <p className="endpoint-desc">LinkedIn job scraper with SSE streaming</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-content">
            <p>Built with Next.js • Deployed on Vercel • Monitored 24/7</p>
            <div className="footer-links">
              <a href="https://github.com/Great-GrayT/jobCron" target="_blank" rel="noopener noreferrer" className="footer-link-with-icon">
                <Github size={16} />
                <span>GitHub</span>
              </a>
              <span className="separator">•</span>
              <a href="/scrape">LinkedIn Scraper</a>
              <span className="separator">•</span>
              <a href="/rss">RSS Monitor</a>
            </div>
          </div>
          <div className="easter-egg-hint">
            <Zap size={16} />
            <span>Try clicking the briefcase logo 7 times</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
