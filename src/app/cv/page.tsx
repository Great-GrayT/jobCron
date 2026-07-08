"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Loader2, Upload, FileText, X, Sparkles, CheckCircle2, AlertCircle, Lightbulb } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { AdminShell } from "@/components/AdminShell";
import { featuresMenu } from "@/components/navMenu";
import { useAuth } from "@/context/AuthContext";
import { PageGuide } from "@/components/PageGuide";
import { CvGuide } from "@/components/guides";
import { fetchOptions, fetchStatistics, type ActiveFilters, type FilterOptions } from "@/lib/api/stats";
import { extractCvText } from "@/lib/cv/extract";
import { analyzeCv, type CvAnalysis } from "@/lib/cv/analyze";
import "./cv.css";

const EMPTY_FILTERS: ActiveFilters = {
  industry: [], certificate: [], seniority: [], location: [], company: [], keyword: [],
  country: [], city: [], software: [], programmingSkill: [], yearsExperience: [],
  academicDegree: [], region: [], roleType: [], roleCategory: [],
};

function CvInner() {
  const { user } = useAuth();

  // ---- CV file / text ----
  const [fileName, setFileName] = useState<string | null>(null);
  const [cvText, setCvText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ---- filters ----
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [industry, setIndustry] = useState("");
  const [roleCategory, setRoleCategory] = useState("");
  const [seniority, setSeniority] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [company, setCompany] = useState("");
  const [roleType, setRoleType] = useState("");

  // ---- analysis ----
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CvAnalysis | null>(null);
  const [marketTotal, setMarketTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOptions("public").then(setOptions).catch(() => {});
  }, []);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setFileError(null);
    setAnalysis(null);
    setExtracting(true);
    setFileName(file.name);
    try {
      const text = await extractCvText(file);
      if (text.trim().length < 40) {
        throw new Error("Couldn't read enough text — is this a scanned/image PDF? Try the .docx version.");
      }
      setCvText(text);
    } catch (e) {
      setCvText("");
      setFileName(null);
      setFileError(e instanceof Error ? e.message : "Failed to read the file.");
    } finally {
      setExtracting(false);
    }
  };

  const clearFile = () => {
    setFileName(null);
    setCvText("");
    setAnalysis(null);
    setFileError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const canAnalyze = cvText.trim().length > 0 && !extracting && !analyzing;

  const analyze = async () => {
    if (!canAnalyze) return;
    setAnalyzing(true);
    setError(null);
    try {
      const filters: ActiveFilters = {
        ...EMPTY_FILTERS,
        industry: industry ? [industry] : [],
        roleCategory: roleCategory ? [roleCategory] : [],
        seniority: seniority ? [seniority] : [],
        country: country ? [country] : [],
        city: city.trim() ? [city.trim()] : [],
        company: company.trim() ? [company.trim()] : [],
        roleType: roleType.trim() ? [roleType.trim()] : [],
      };
      const stats = await fetchStatistics({ filters, viewMode: "all", scope: "public" });
      setMarketTotal(stats.totalJobs);
      setAnalysis(
        analyzeCv(cvText, {
          keywords: stats.byKeyword ?? {},
          programming: stats.byProgrammingSkill ?? {},
          software: stats.bySoftware ?? {},
          certificates: stats.byCertificate ?? {},
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  const scoreColor = useMemo(() => {
    const s = analysis?.overall ?? 0;
    return s >= 70 ? "var(--color-success)" : s >= 40 ? "var(--color-warning)" : "var(--color-error)";
  }, [analysis]);

  return (
    <AdminShell
      menu={featuresMenu(user?.role)}
      breadcrumb={["Features", "CV Analysis"]}
      title="CV Analysis"
      titleGuide={<PageGuide>{CvGuide}</PageGuide>}
    >
      <section className="panel cv-setup">
        {/* ---- upload ---- */}
        <div className="cv-block">
          <label className="cv-label">1 · Your CV</label>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            className="cv-file-input"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          {!fileName ? (
            <button type="button" className="cv-drop" onClick={() => inputRef.current?.click()}>
              <Upload size={22} />
              <span>Upload your CV</span>
              <small>PDF or Word (.docx) — parsed in your browser, never uploaded.</small>
            </button>
          ) : (
            <div className="cv-file">
              {extracting ? <Loader2 size={16} className="spin" /> : <FileText size={16} />}
              <span className="cv-file-name">{fileName}</span>
              {!extracting && <span className="cv-file-ok">{cvText.length.toLocaleString()} chars</span>}
              <button type="button" className="cv-file-x" onClick={clearFile} aria-label="Remove file"><X size={14} /></button>
            </div>
          )}
          {fileError && <div className="cv-file-err"><AlertCircle size={14} /> {fileError}</div>}
        </div>

        {/* ---- filters ---- */}
        <div className="cv-block">
          <label className="cv-label">2 · Target market</label>
          <div className="cv-filter-grid">
            <Field label="Industry">
              <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
                <option value="">Any</option>
                {options?.industry.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Category">
              <select value={roleCategory} onChange={(e) => setRoleCategory(e.target.value)}>
                <option value="">Any</option>
                {options?.roleCategory.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Seniority">
              <select value={seniority} onChange={(e) => setSeniority(e.target.value)}>
                <option value="">Any</option>
                {options?.seniority.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Country">
              <select value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="">Any</option>
                {options?.country.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="City (optional)">
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. New York" />
            </Field>
            <Field label="Employer (optional)">
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Google" />
            </Field>
            <Field label="Role type (optional)">
              <input value={roleType} onChange={(e) => setRoleType(e.target.value)} placeholder="e.g. Full-time" />
            </Field>
          </div>
        </div>

        <div className="cv-actions">
          <button type="button" className="btn" disabled={!canAnalyze} onClick={analyze}>
            {analyzing ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />} Analyze CV
          </button>
          {error && <span className="cv-inline-err"><AlertCircle size={14} /> {error}</span>}
        </div>
      </section>

      {analysis && (
        <>
          {/* ---- score + suggestions ---- */}
          <section className="panel cv-score-panel">
            <div className="cv-score-gauge">
              <CircularProgressbar
                value={analysis.overall}
                text={`${analysis.overall}`}
                styles={buildStyles({
                  pathColor: scoreColor,
                  textColor: scoreColor,
                  trailColor: "var(--terminal-border)",
                  textSize: "26px",
                })}
              />
              <span className="cv-score-caption">Market alignment</span>
            </div>
            <div className="cv-score-side">
              <p className="cv-score-lead">
                Alignment score <b>{analysis.overall}/100</b> — 100 means your CV covers the highest-demand
                ~80% of this market ({marketTotal.toLocaleString()} postings). Section scores:
              </p>
              <div className="cv-cat-scores">
                {analysis.categories.map((c) => (
                  <div key={c.key} className="cv-cat-score">
                    <span className="cv-cat-score-label">{c.label}</span>
                    <div className="cv-cat-bar"><span style={{ width: `${c.score}%` }} /></div>
                    <span className="cv-cat-score-num" title={`${c.coverage}% of this section's total demand`}>{c.score}% · {c.matchedCount} hit</span>
                  </div>
                ))}
              </div>
              {analysis.suggestions.length > 0 && (
                <div className="cv-suggest">
                  <span className="cv-suggest-head"><Lightbulb size={14} /> Add these — highest demand you&apos;re missing</span>
                  <div className="cv-suggest-chips">
                    {analysis.suggestions.map((s) => (
                      <span key={`${s.category}-${s.name}`} className="cv-chip missing" title={`${s.category} · ${s.demand} postings`}>
                        {s.name} <b>{s.demand}</b>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ---- per-category breakdown ---- */}
          <div className="cv-cat-grid">
            {analysis.categories.map((c) => (
              <section key={c.key} className="panel cv-cat-panel">
                <div className="cv-cat-panel-head">
                  <span>{c.label.toUpperCase()}</span>
                  <span className="cv-cat-panel-meta">{c.matchedCount}/{c.total} matched</span>
                </div>
                {c.total === 0 ? (
                  <p className="muted">No market data for this filter.</p>
                ) : (
                  <ul className="cv-item-list">
                    {c.items.map((it) => (
                      <li key={it.name} className={it.matched ? "hit" : "miss"}>
                        {it.matched ? <CheckCircle2 size={13} /> : <X size={13} />}
                        <span className="cv-item-name">{it.name}</span>
                        {it.matched && it.count > 1 && <span className="cv-item-count">×{it.count}</span>}
                        <span className="cv-item-demand" title="postings in this market that mention it">{it.demand}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </AdminShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="cv-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function CvPage() {
  return (
    <AuthGuard>
      <CvInner />
    </AuthGuard>
  );
}
