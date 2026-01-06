"use client";

import { useState } from "react";

export default function ScrapePage() {
  const [searchText, setSearchText] = useState("CFA");
  const [countries, setCountries] = useState<string[]>(["United States", "United Kingdom"]);
  const [timeFilter, setTimeFilter] = useState("604800");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

    try {
      // Construct the GET URL with parameters
      const params = new URLSearchParams({
        search: searchText,
        countries: countries.join(", "),
        timeFilter: timeFilter,
      });

      const url = `/api/scrape-jobs?${params.toString()}`;

      // Trigger the API call
      const response = await fetch(url, {
        method: "GET",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to scrape jobs");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: "800px", margin: "50px auto", padding: "20px" }}>
      <h1 style={{ textAlign: "center", color: "#0073b1" }}>LinkedIn Job Scraper</h1>
      <p style={{ textAlign: "center", color: "#666" }}>
        Scrape LinkedIn jobs and send the results to Telegram
      </p>

      <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        {/* Search Text */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: "5px" }}>
            Search Keywords (comma-separated):
          </label>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="e.g., CFA, Financial Analyst, CEO"
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "14px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
          <p style={{ margin: "5px 0 0 0", fontSize: "12px", color: "#666" }}>
            Enter multiple keywords separated by commas. Each will be searched separately and combined in the final results.
          </p>
        </div>

        {/* Time Filter */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: "5px" }}>
            Time Filter:
          </label>
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "14px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          >
            <option value="86400">Last 24 hours</option>
            <option value="172800">Last 2 days</option>
            <option value="259200">Last 3 days</option>
            <option value="604800">Last 7 days</option>
            <option value="1209600">Last 14 days</option>
            <option value="2592000">Last 30 days</option>
          </select>
        </div>

        {/* Countries */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: "10px" }}>
            Select Countries:
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            {availableCountries.map((country) => (
              <div
                key={country}
                onClick={() => toggleCountry(country)}
                style={{
                  padding: "10px",
                  background: countries.includes(country) ? "#0073b1" : "#f0f2f5",
                  color: countries.includes(country) ? "#fff" : "#333",
                  border: "2px solid",
                  borderColor: countries.includes(country) ? "#0073b1" : "#ddd",
                  borderRadius: "8px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontWeight: countries.includes(country) ? "bold" : "normal",
                  fontSize: "14px",
                }}
              >
                {country}
              </div>
            ))}
          </div>
          <p style={{ margin: "10px 0 0 0", fontSize: "12px", color: "#666" }}>
            {countries.length} {countries.length === 1 ? "country" : "countries"} selected
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: "15px",
              background: "#fff0f0",
              color: "#d32f2f",
              borderRadius: "4px",
              marginBottom: "20px",
              border: "1px solid #ffcdd2",
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Success Message */}
        {result && (
          <div
            style={{
              padding: "15px",
              background: "#e8f5e9",
              color: "#2e7d32",
              borderRadius: "4px",
              marginBottom: "20px",
              border: "1px solid #c8e6c9",
            }}
          >
            <strong>Success!</strong> {result.message}
            <br />
            <br />
            {result.jobCount > 0 && (
              <>
                <div>
                  <strong>Unique Jobs Found:</strong> {result.jobCount}
                </div>
                {result.keywords && result.keywords.length > 0 && (
                  <div>
                    <strong>Keywords:</strong> {result.keywords.join(", ")}
                  </div>
                )}
                <div>
                  <strong>Countries:</strong> {result.countries?.join(", ")}
                </div>
                <div>
                  <strong>File:</strong> {result.filename}
                </div>
                <div style={{ marginTop: "10px", fontSize: "14px" }}>
                  Excel file has been sent to your Telegram chat with the "Input Keyword" column showing which search term found each job.
                </div>
              </>
            )}
          </div>
        )}

        {/* Scrape Button */}
        <button
          onClick={handleScrape}
          disabled={loading}
          style={{
            width: "100%",
            padding: "15px",
            fontSize: "16px",
            fontWeight: "bold",
            background: loading ? "#ccc" : "#0073b1",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {loading ? "Scraping... (this may take a few minutes)" : "Scrape Jobs & Send to Telegram"}
        </button>

        <p style={{ marginTop: "15px", fontSize: "12px", color: "#666", textAlign: "center" }}>
          The scraper will fetch jobs from LinkedIn and send an Excel file to your Telegram chat.
          <br />
          This process may take 2-5 minutes depending on the number of countries selected.
        </p>
      </div>

      <div style={{ marginTop: "30px", textAlign: "center" }}>
        <a href="/" style={{ color: "#0073b1", textDecoration: "none" }}>
          ← Back to Home
        </a>
      </div>
    </div>
  );
}
