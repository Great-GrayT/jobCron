'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAggregate } from '@/lib/hooks/useAggregate';
import { useDuckDBQuery } from '@/lib/hooks/useDuckDBQuery';

/**
 * Phase-3 verification widget for STORAGE_REDESIGN_PROPOSAL.md.
 *
 * Fetches the Phase-2 `stats/aggregate.json` and runs `SELECT COUNT(*) FROM jobs`
 * through DuckDB-WASM against the registered Parquet files. The two counts
 * should always agree once both pipelines are converged.
 *
 * When they don't agree, the badge becomes clickable and pulls the structured
 * diagnostic from `/api/stats/diagnostics` — no need to hand-roll curl commands
 * to find the source of the divergence.
 */

interface Finding {
  severity: "ok" | "warn" | "error";
  category: string;
  month?: string;
  message: string;
  remedy: string;
}

interface DiagnosticsResponse {
  ok: boolean;
  severity: "ok" | "warn" | "error";
  sources: {
    manifestDaysSum: number;
    statsFilesSum: number;
    parquetRowsSum: number;
    aggregateTotal: number | null;
  };
  breakdown: {
    monthsTotal: number;
    monthsAvailable: number;
    monthsWithParquet: number;
    monthsMissingParquet: string[];
    currentMonth: string;
  };
  perMonth: Array<{
    month: string;
    manifestTotalJobs: number;
    ndjsonDaysSum: number;
    daysCount: number;
    statsFileTotalJobs: number | null;
    hasDailyParquet: boolean;
    hasMonthlyParquet: boolean;
  }>;
  findings: Finding[];
}

export function DuckDBEngineStatus() {
  const { data: aggregate, loading: aggregateLoading, error: aggregateError } = useAggregate();

  const parquet = useMemo(() => aggregate?.parquet ?? null, [aggregate]);
  const sql = parquet && Object.keys(parquet.daily).length + Object.keys(parquet.monthly).length > 0
    ? 'SELECT COUNT(*)::BIGINT AS n FROM jobs'
    : null;

  const { data: rows, loading: queryLoading, error: queryError } = useDuckDBQuery<{ n: bigint | number }>(
    parquet,
    sql,
  );

  const aggregateTotal = aggregate?.totalJobs ?? null;
  const duckdbTotalRaw = rows?.[0]?.n ?? null;
  const duckdbTotal =
    typeof duckdbTotalRaw === 'bigint'
      ? Number(duckdbTotalRaw)
      : (duckdbTotalRaw as number | null);

  const matches = aggregateTotal !== null && duckdbTotal !== null && aggregateTotal === duckdbTotal;
  const mismatch = aggregateTotal !== null && duckdbTotal !== null && aggregateTotal !== duckdbTotal;

  const status =
    aggregateError || queryError ? 'error'
    : aggregateLoading ? 'loading-aggregate'
    : !parquet ? 'no-parquet'
    : queryLoading ? 'querying'
    : matches ? 'ok'
    : mismatch ? 'mismatch'
    : 'idle';

  const variant = status === 'ok' ? 'ok' :
                  status === 'mismatch' || status === 'error' ? 'bad' :
                  '';

  // Diagnostics — only fetched on demand when the user clicks an unhealthy badge.
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResponse | null>(null);
  const [diagOpen, setDiagOpen] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);

  // Auto-open diagnostics the first time we detect a non-ok terminal state.
  // This makes the failure self-explanatory instead of waiting for a click.
  const isInteractive = status === 'mismatch' || status === 'no-parquet' || status === 'error';
  useEffect(() => {
    if (!isInteractive || diagnostics || diagLoading) return;
    setDiagLoading(true);
    setDiagError(null);
    fetch('/api/stats/diagnostics', { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j: DiagnosticsResponse) => {
        setDiagnostics(j);
        setDiagOpen(true);
      })
      .catch((err: unknown) => setDiagError(err instanceof Error ? err.message : String(err)))
      .finally(() => setDiagLoading(false));
  }, [isInteractive, diagnostics, diagLoading]);

  const headlineLabel =
    status === 'loading-aggregate' ? 'loading aggregate…' :
    status === 'no-parquet' ? 'no parquet files yet' :
    status === 'querying' ? `querying ${aggregateTotal ?? '?'} rows…` :
    status === 'ok' ? `${duckdbTotal?.toLocaleString()} rows ✓` :
    status === 'mismatch' ? `mismatch: parquet=${duckdbTotal?.toLocaleString()} vs aggregate=${aggregateTotal?.toLocaleString()}` :
    status === 'error' ? 'error (hover for detail)' :
    '—';

  return (
    <div className="duckdb-status-wrap">
      <button
        type="button"
        className={`duckdb-status ${variant}`.trim()}
        onClick={() => isInteractive && setDiagOpen(o => !o)}
        title={
          aggregateError ? `aggregate.json: ${aggregateError.message}` :
          queryError ? `DuckDB: ${queryError.message}` :
          isInteractive ? 'Click for diagnostics' :
          undefined
        }
        disabled={!isInteractive}
      >
        <span>DuckDB-WASM</span>
        <span>·</span>
        <span>{headlineLabel}</span>
        {isInteractive && (
          <span className="duckdb-status-chevron">{diagOpen ? '▾' : '▸'}</span>
        )}
      </button>

      {diagOpen && (
        <div className="duckdb-diagnostics">
          {diagLoading && <div>Running diagnostics…</div>}
          {diagError && <div className="duckdb-diagnostics-error">Failed to load diagnostics: {diagError}</div>}
          {diagnostics && <DiagnosticsReport report={diagnostics} />}
        </div>
      )}
    </div>
  );
}

function DiagnosticsReport({ report }: { report: DiagnosticsResponse }) {
  const { sources, breakdown, findings, perMonth } = report;
  return (
    <div className="duckdb-diagnostics-inner">
      <div className="duckdb-diagnostics-section">
        <div className="duckdb-diagnostics-title">Row count sources</div>
        <table className="duckdb-diagnostics-table">
          <tbody>
            <tr><td>NDJSON ground truth</td><td>{sources.manifestDaysSum.toLocaleString()}</td></tr>
            <tr><td>per-month stats files</td><td>{sources.statsFilesSum.toLocaleString()}</td></tr>
            <tr><td>Parquet files</td><td>{sources.parquetRowsSum.toLocaleString()}</td></tr>
            <tr><td>aggregate.json</td><td>{sources.aggregateTotal?.toLocaleString() ?? '—'}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="duckdb-diagnostics-section">
        <div className="duckdb-diagnostics-title">Coverage</div>
        <div>
          {breakdown.monthsWithParquet}/{breakdown.monthsAvailable} months have Parquet files
          {breakdown.monthsMissingParquet.length > 0 && (
            <span> — missing: {breakdown.monthsMissingParquet.join(', ')}</span>
          )}
        </div>
      </div>

      {findings.length > 0 && (
        <div className="duckdb-diagnostics-section">
          <div className="duckdb-diagnostics-title">Findings</div>
          <ul className="duckdb-diagnostics-findings">
            {findings.map((f, i) => (
              <li key={i} className={`duckdb-finding ${f.severity}`}>
                <div className="duckdb-finding-headline">
                  <span className={`duckdb-finding-badge ${f.severity}`}>{f.severity}</span>
                  {f.month && <span className="duckdb-finding-month">{f.month}</span>}
                  <span className="duckdb-finding-category">{f.category}</span>
                </div>
                <div>{f.message}</div>
                <div className="duckdb-finding-remedy">Remedy: {f.remedy}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <details>
        <summary className="duckdb-diagnostics-details-summary">Per-month breakdown ({perMonth.length})</summary>
        <table className="duckdb-diagnostics-table">
          <thead>
            <tr>
              <th>month</th>
              <th>manifest.totalJobs</th>
              <th>NDJSON sum</th>
              <th>stats file</th>
              <th>parquet</th>
            </tr>
          </thead>
          <tbody>
            {perMonth.map(m => {
              const drift = m.statsFileTotalJobs !== null && m.statsFileTotalJobs !== m.ndjsonDaysSum;
              return (
                <tr key={m.month} className={drift ? 'duckdb-row-drift' : undefined}>
                  <td>{m.month}</td>
                  <td>{m.manifestTotalJobs.toLocaleString()}</td>
                  <td>{m.ndjsonDaysSum.toLocaleString()}</td>
                  <td>{m.statsFileTotalJobs?.toLocaleString() ?? '—'}</td>
                  <td>{m.hasMonthlyParquet ? 'monthly' : m.hasDailyParquet ? 'daily' : '✗'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </div>
  );
}
