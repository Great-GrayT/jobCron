'use client';

import { useEffect, useState } from 'react';
import { queryParquet } from '../duckdb-client';
import type { ParquetManifest } from '../r2-storage';
import type { QueryResult } from '../duckdb-client';

export interface UseDuckDBQueryResult<T> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Lazy-runs a SQL query against the registered Parquet files. Holds back the
 * fetch until `parquet` is non-null AND `sql` is non-empty, so chart
 * components can mount before the engine is ready without thrashing.
 *
 * Re-runs whenever `sql` changes or the manifest fingerprint changes —
 * use `useMemo` to stabilize the inputs at the call site if the chart
 * filter state mutates frequently.
 */
export function useDuckDBQuery<T = Record<string, unknown>>(
  parquet: ParquetManifest | null,
  sql: string | null,
): UseDuckDBQueryResult<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Stable string fingerprint of the manifest so the effect dep array works.
  const manifestFingerprint = parquet
    ? Object.values(parquet.daily)
        .concat(Object.values(parquet.monthly))
        .map(r => r.contentHash.slice(0, 8))
        .sort()
        .join(',')
    : '';

  useEffect(() => {
    if (!sql || !parquet) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    queryParquet<T>(parquet, sql)
      .then((result: QueryResult<T>) => {
        if (!cancelled) setData(result.rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sql, manifestFingerprint, parquet]);

  return { data, loading, error };
}
