"use client";

import { useState, useEffect, useRef } from "react";
import "./scrape.css";

interface ProgressLog {
  timestamp: Date;
  message: string;
  percentage?: number;
}

export default function ScrapePage() {
  const [searchText, setSearchText] = useState("CFA");
  const [countries, setCountries] = useState<string[]>(["United States", "United Kingdom"]);
  const [timeFilter, setTimeFilter] = useState("604800");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Easter egg states
  const [badgeHovers, setBadgeHovers] = useState(0);
  const [secretVisible, setSecretVisible] = useState(false);
  const [konamiProgress, setKonamiProgress] = useState(0);
  const [titleClicks, setTitleClicks] = useState(0);
  const [matrixMode, setMatrixMode] = useState(false);
  const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [progressLogs]);

  // Konami code easter egg
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === konamiCode[konamiProgress]) {
        const newProgress = konamiProgress + 1;
        setKonamiProgress(newProgress);

        if (newProgress === konamiCode.length) {
          setSecretVisible(true);
          setTimeout(() => setSecretVisible(false), 5000);
          setKonamiProgress(0);
        }
      } else {
        setKonamiProgress(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [konamiProgress]);

  const addLog = (message: string, percentage?: number) => {
    setProgressLogs(prev => [
      ...prev,
      { timestamp: new Date(), message, percentage }
    ]);
    if (percentage !== undefined) {
      setCurrentProgress(percentage);
    }
  };

  const availableCountries = [
    "United States",
    "United Kingdom",
    "Ireland",
    "Canada",
    "Germany",
    "France",
    "Australia",
    "Netherlands",
    "Luxembourg",
    "Belgium",
    "Switzerland",
    "Spain",
    "Italy",
  ];

  const toggleCountry = (country: string) => {
    setCountries((prev) =>
      prev.includes(country)
        ? prev.filter((c) => c !== country)
        : [...prev, country]
    );
  };

  const handleBadgeClick = () => {
    const newHovers = badgeHovers + 1;
    setBadgeHovers(newHovers);
    if (newHovers === 5) {
      setTimeout(() => setBadgeHovers(0), 3000);
    }
  };

  // Easter egg: Triple click on title for Matrix mode
  const handleTitleClick = () => {
    const newClicks = titleClicks + 1;
    setTitleClicks(newClicks);

    if (newClicks === 3) {
      setMatrixMode(true);
      setTimeout(() => {
        setMatrixMode(false);
        setTitleClicks(0);
      }, 2000);
    }

    // Reset click count after 1 second of no clicks
    setTimeout(() => setTitleClicks(0), 1000);
  };

  // Easter egg: Right-click on country button
  const handleCountryRightClick = (e: React.MouseEvent, country: string) => {
    e.preventDefault();
    const btn = e.currentTarget;
    btn.classList.add('easter-egg');
    setTimeout(() => btn.classList.remove('easter-egg'), 2000);
  };

  const handleScrape = async () => {
    if (countries.length === 0) {
      setError("Please select at least one country");
      return;
    }

    if (!searchText.trim()) {
      setError("Please enter search keywords");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setProgressLogs([]);
    setCurrentProgress(0);

    const keywords = searchText.split(",").map(k => k.trim()).filter(k => k);
    const timeFilterHours = Math.round(parseInt(timeFilter) / 3600);

    addLog(`🚀 Starting LinkedIn job scraper...`, 0);
    addLog(`📋 Configuration:`);
    addLog(`   - Keywords: ${keywords.join(", ")}`);
    addLog(`   - Countries: ${countries.join(", ")}`);
    addLog(`   - Time Filter: Last ${timeFilterHours} hours`);
    addLog(`   - Total Searches: ${keywords.length} × ${countries.length} = ${keywords.length * countries.length}`);
    addLog(``);

    const params = new URLSearchParams({
      search: searchText,
      countries: countries.join(", "),
      timeFilter: timeFilter,
    });

    const url = `/api/scrape-jobs-stream?${params.toString()}`;

    addLog(`🌐 Connecting to server...`, 5);
    addLog(``);

    const startTime = Date.now();
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(url);

      eventSource.addEventListener("log", (event) => {
        const data = JSON.parse(event.data);
        addLog(data.message, data.percentage);
      });

      eventSource.addEventListener("complete", (event) => {
        const data = JSON.parse(event.data);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        addLog(``);
        addLog(`✓ Scraping complete!`, 100);
        addLog(`📈 Results Summary:`);
        addLog(`   - NEW jobs found: ${data.jobCount}`);
        if (data.totalScraped) {
          addLog(`   - Total scraped: ${data.totalScraped}`);
          addLog(`   - Already cached: ${data.alreadyCached}`);
        }
        addLog(`   - Keywords searched: ${keywords.length}`);
        addLog(`   - Countries searched: ${countries.length}`);
        addLog(`   - Total execution time: ${elapsed}s`);
        if (data.filename) {
          addLog(`   - Excel file: ${data.filename}`);
          addLog(`   - File sent to Telegram ✓`);
        }
        addLog(``);
        addLog(`🎉 All done!`);

        setResult(data);
        setLoading(false);
        eventSource?.close();
      });

      eventSource.addEventListener("error", (event: any) => {
        const errorData = event.data ? JSON.parse(event.data) : null;
        const errorMsg = errorData?.message || "Connection error occurred";

        addLog(``);
        addLog(`❌ Error occurred: ${errorMsg}`);
        addLog(`💡 Please check the error message above and try again`);
        setError(errorMsg);
        setLoading(false);
        eventSource?.close();
      });

      eventSource.onerror = (err) => {
        console.error("EventSource error:", err);
        if (eventSource?.readyState === EventSource.CLOSED) {
          setLoading(false);
        }
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred";
      addLog(``);
      addLog(`❌ Error occurred: ${errorMsg}`);
      addLog(`💡 Please check the error message above and try again`);
      setError(errorMsg);
      setLoading(false);
      eventSource?.close();
    }
  };

  return (
    <div className="scrape-page">
      <div className="container">
        <div className="header">
          <div
            className="badge"
            onClick={handleBadgeClick}
            data-hovers={badgeHovers >= 5 ? "5" : "0"}
          >
            Powered by AI
          </div>
          <h1
            className={`title ${matrixMode ? 'matrix-mode' : ''}`}
            onClick={handleTitleClick}
          >
            LinkedIn Job Scraper
          </h1>
          <p className="subtitle">
            Supercharge your job hunt with concurrent processing & smart caching 🚀
          </p>
        </div>

        <div className="card-container">
          <div className="inner-container">
            <div className="card-content">
              {/* Search Text */}
              <div className="form-group">
                <label className="label">
                  Search Keywords (comma-separated):
                </label>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="e.g., CFA, Financial Analyst, CEO"
                  className="input"
                />
                <p className="hint">
                  Enter multiple keywords separated by commas. Each will be searched separately.
                </p>
              </div>

              {/* Time Filter */}
              <div className="form-group">
                <label className="label">Time Filter:</label>
                <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="select">
                  <option value="3600">Last 1 hour</option>
                  <option value="7200">Last 2 hours</option>
                  <option value="10800">Last 3 hours</option>
                  <option value="21600">Last 6 hours</option>
                  <option value="43200">Last 12 hours</option>
                  <option value="86400">Last 24 hours</option>
                  <option value="172800">Last 2 days</option>
                  <option value="259200">Last 3 days</option>
                  <option value="604800">Last 7 days</option>
                  <option value="1209600">Last 14 days</option>
                  <option value="2592000">Last 30 days</option>
                </select>
              </div>

              {/* Countries */}
              <div className="form-group">
                <label className="label">Select Countries:</label>
                <div className="country-grid">
                  {availableCountries.map((country) => (
                    <button
                      key={country}
                      onClick={() => toggleCountry(country)}
                      onContextMenu={(e) => handleCountryRightClick(e, country)}
                      className={`country-btn ${countries.includes(country) ? 'selected' : ''}`}
                    >
                      {country}
                    </button>
                  ))}
                </div>
                <p className="hint">
                  {countries.length} {countries.length === 1 ? "country" : "countries"} selected
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="alert alert-error">
                  <div>
                    <strong>Oops!</strong> {error}
                  </div>
                </div>
              )}

              {/* Progress Display */}
              {(loading || progressLogs.length > 0) && (
                <div className="progress-container">
                  <div className="progress-header">
                    <span>Progress: {currentProgress}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar" style={{ width: `${currentProgress}%` }} />
                  </div>
                  <div className="logs-container">
                    {progressLogs.map((log, index) => (
                      <div key={index} className="log-entry">
                        <span className="log-time">{log.timestamp.toLocaleTimeString()}</span>
                        <span className="log-message">{log.message}</span>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              )}

              {/* Success Message */}
              {result && (
                <div className="alert alert-success">
                  <div>
                    <strong>Success!</strong> {result.message}
                    <br /><br />
                    {result.jobCount > 0 && (
                      <>
                        <div><strong>NEW Jobs Found:</strong> {result.jobCount}</div>
                        {result.totalScraped && (
                          <>
                            <div><strong>Total Scraped:</strong> {result.totalScraped}</div>
                            <div><strong>Already Cached:</strong> {result.alreadyCached}</div>
                          </>
                        )}
                        {result.keywords && result.keywords.length > 0 && (
                          <div><strong>Keywords:</strong> {result.keywords.join(", ")}</div>
                        )}
                        <div><strong>Countries:</strong> {result.countries?.join(", ")}</div>
                        <div><strong>File:</strong> {result.filename}</div>
                        <div style={{ marginTop: "12px", fontSize: "13px", opacity: 0.9 }}>
                          Excel file sent to your Telegram! Each job shows which keyword found it. 📊
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Scrape Button */}
              <button
                onClick={handleScrape}
                disabled={loading}
                className={`scrape-btn ${loading ? 'disabled' : ''}`}
              >
                {loading ? "🔥 Scraping in progress..." : "🚀 Start Scraping"}
              </button>

              <p className="footer-text">
                Concurrent processing (10x faster) • Smart caching • 48h auto-reset
              </p>
            </div>
          </div>
        </div>

        <div className="back-link">
          <a href="/">Back to Home</a>
          <span style={{ margin: "0 1rem", opacity: 0.5 }}>|</span>
          <a href="/stats">View Statistics</a>
          <span style={{ margin: "0 1rem", opacity: 0.5 }}>|</span>
          <a href="/rss">RSS Monitor</a>
        </div>
      </div>

      {/* Secret credit easter egg */}
      <div className={`secret-credit ${secretVisible ? 'visible' : ''}`}>
        🎨 Crafted with love by reza
      </div>
    </div>
  );
}
