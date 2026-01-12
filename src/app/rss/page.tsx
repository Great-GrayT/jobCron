"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Radio, Zap, Target, Database, ArrowLeft, ArrowRight, Loader2, RefreshCw, Clock, CheckCircle2, XCircle, Info, Sparkles } from "lucide-react";
import "./rss.css";

interface RSSResult {
  total: number;
  sent: number;
  failed: number;
  pubDates?: string[];
}

export default function RSSPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RSSResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Easter egg states
  const [rssClicks, setRssClicks] = useState(0);
  const [secretMode, setSecretMode] = useState(false);
  const [particlesVisible, setParticlesVisible] = useState(false);

  // Easter egg: Triple click on RSS icon
  const handleRSSIconClick = () => {
    const newClicks = rssClicks + 1;
    setRssClicks(newClicks);

    if (newClicks === 3) {
      setSecretMode(true);
      setParticlesVisible(true);
      setTimeout(() => {
        setSecretMode(false);
        setParticlesVisible(false);
        setRssClicks(0);
      }, 3000);
    }

    setTimeout(() => setRssClicks(0), 1000);
  };

  // Easter egg: Keyboard shortcut (Ctrl+Shift+R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        setParticlesVisible(true);
        setTimeout(() => setParticlesVisible(false), 2000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCheckJobs = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/cron/check-jobs');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rss-page">
      {/* Animated particles for easter egg */}
      {particlesVisible && (
        <div className="particles-container">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="particle" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }} />
          ))}
        </div>
      )}

      <div className="container container-narrow">
        <div className="header">
          <div
            className={`rss-icon ${secretMode ? 'secret-mode' : ''}`}
            onClick={handleRSSIconClick}
          >
            <Radio size={64} strokeWidth={1.5} />
          </div>
          <h1 className="title">RSS Job Monitor</h1>
          <p className="subtitle">
            Automated RSS feed monitoring with Telegram notifications
          </p>
        </div>

        <div className="card-container">
          <div className="card-content">
            {/* Info Section */}
            <div className="info-section">
              <div className="info-item">
                <span className="info-label">Schedule:</span>
                <span className="info-value">Every 5 minutes</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status:</span>
                <span className="info-value status-active">
                  <span className="pulse-dot"></span>
                  Active
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Mode:</span>
                <span className="info-value">Automatic</span>
              </div>
            </div>

            {/* Description */}
            <div className="description">
              <p>
                The RSS job monitor automatically checks configured RSS feeds for new job postings
                and sends notifications to your Telegram channel. It runs automatically via cron,
                but you can also trigger a manual check below.
              </p>
            </div>

            {/* Manual Trigger Button */}
            <button
              onClick={handleCheckJobs}
              disabled={loading}
              className={`btn btn-primary check-btn ${loading ? 'disabled' : ''}`}
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="spinner-icon" />
                  <span>Checking RSS Feeds...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={20} />
                  <span>Check RSS Feeds Now</span>
                </>
              )}
            </button>

            {/* Error Display */}
            {error && (
              <div className="alert alert-error">
                <strong>Error:</strong> {error}
              </div>
            )}

            {/* Results Display */}
            {result && (
              <div className="results-section animate-slideUp">
                <h3 className="results-title">Check Results</h3>

                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{result.total}</div>
                    <div className="stat-label">Total Jobs Found</div>
                  </div>
                  <div className="stat-card stat-success">
                    <div className="stat-value">{result.sent}</div>
                    <div className="stat-label">Sent to Telegram</div>
                  </div>
                  <div className="stat-card stat-error">
                    <div className="stat-value">{result.failed}</div>
                    <div className="stat-label">Failed</div>
                  </div>
                </div>

                {result.sent > 0 && (
                  <div className="success-message">
                    <CheckCircle2 size={20} />
                    <span>Successfully sent {result.sent} new job{result.sent !== 1 ? 's' : ''} to Telegram!</span>
                  </div>
                )}

                {result.sent === 0 && result.total > 0 && (
                  <div className="info-message">
                    <Info size={20} />
                    <span>All {result.total} jobs were already processed or not recent enough.</span>
                  </div>
                )}

                {result.total === 0 && (
                  <div className="info-message">
                    <Info size={20} />
                    <span>No jobs found in the RSS feeds.</span>
                  </div>
                )}
              </div>
            )}

            {/* Features List */}
            <div className="features-section">
              <h3>Features</h3>
              <ul className="features-list">
                <li>
                  <Zap size={24} className="feature-icon" />
                  <span>Real-time RSS feed monitoring</span>
                </li>
                <li>
                  <Target size={24} className="feature-icon" />
                  <span>Smart deduplication by URL</span>
                </li>
                <li>
                  <Database size={24} className="feature-icon" />
                  <span>Persistent cache with GitHub Gist</span>
                </li>
                <li>
                  <Radio size={24} className="feature-icon" />
                  <span>Rate-limited Telegram notifications</span>
                </li>
                <li>
                  <RefreshCw size={24} className="feature-icon" />
                  <span>Automatic retry for failed jobs</span>
                </li>
                <li>
                  <Clock size={24} className="feature-icon" />
                  <span>Configurable check interval</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="nav-links">
          <Link href="/" className="nav-link">
            <ArrowLeft size={16} />
            <span>Home</span>
          </Link>
          <Link href="/scrape" className="nav-link nav-link-primary">
            <span>LinkedIn Scraper</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Easter egg hint */}
        <div className="hint-text">
          <Sparkles size={16} />
          <span>Tip: Try triple-clicking the RSS icon or pressing Ctrl+Shift+R</span>
        </div>
      </div>
    </div>
  );
}
