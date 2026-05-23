'use client';

import { useMemo } from 'react';
import { useAggregate } from '@/lib/hooks/useAggregate';
import { useDuckDBQuery } from '@/lib/hooks/useDuckDBQuery';

/**
 * Phase-3 verification widget for STORAGE_REDESIGN_PROPOSAL.md.
 *
 * Fetches the Phase-2 `stats/aggregate.json` and runs `SELECT COUNT(*) FROM jobs`
 * through DuckDB-WASM against the registered Parquet files. The two counts
 * should always agree once both pipelines are converged.
 *
 * This is intentionally tiny and side-effect-free so it can be removed
 * once the full DuckDB read path lands — its job is to prove the round
 * trip works against real data, nothing more.
 */
export function DuckDBEngineStatus() {
  const { data: aggregate, loading: aggregateLoading, error: aggregateError } = useAggregate();

  // Only run the SQL query once the manifest is in hand. Memoize the SQL +
  // manifest references so we don't re-run on every parent re-render.
  const parquet = useMemo(() => aggregate?.parquet ?? null, [aggregate]);
  const sql = parquet && Object.keys(parquet.daily).length + Object.keys(parquet.monthly).length > 0
    ? 'SELECT COUNT(*)::BIGINT AS n FROM jobs'
    : null;

  const { data: rows, loading: queryLoading, error: queryError } = useDuckDBQuery<{ n: bigint | number }>(
    parquet,
    sql,
  );

  // Aggregate-side total — the legacy aggregation pipeline's answer.
  const aggregateTotal = aggregate?.totalJobs ?? null;
  // DuckDB-side total — Parquet's answer. BigInt arrives from DuckDB's INT64.
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

  return (
    <div
      className={`duckdb-status ${variant}`.trim()}
      title={
        aggregateError ? `aggregate.json: ${aggregateError.message}` :
        queryError ? `DuckDB: ${queryError.message}` :
        undefined
      }
    >
      <span>DuckDB-WASM</span>
      <span>·</span>
      <span>
        {status === 'loading-aggregate' && 'loading aggregate…'}
        {status === 'no-parquet' && 'no parquet files yet'}
        {status === 'querying' && `querying ${aggregateTotal ?? '?'} rows…`}
        {status === 'ok' && `${duckdbTotal?.toLocaleString()} rows ✓`}
        {status === 'mismatch' &&
          `mismatch: parquet=${duckdbTotal?.toLocaleString()} vs aggregate=${aggregateTotal?.toLocaleString()}`}
        {status === 'error' && 'error (hover for detail)'}
        {status === 'idle' && '—'}
      </span>
    </div>
  );
}
