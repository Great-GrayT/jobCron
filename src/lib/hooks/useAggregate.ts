'use client';

import { useEffect, useState } from 'react';
import type { AggregateJson } from '../job-statistics-parquet';

/**
 * Fetch `stats/aggregate.json` directly from R2's public URL — no Vercel
 * function involved. This is the Phase-2 instant-paint payload from
 * STORAGE_REDESIGN_PROPOSAL.md.
 *
 * The base URL comes from `NEXT_PUBLIC_R2_PUBLIC_URL` (set in Vercel env).
 * If the env var isn't set we fall back to a `/r2/` proxy path so the
 * caller can still resolve during local dev — set up rewrites in
 * next.config.js if you want that fallback to work, otherwise this just
 * resolves to a 404 and the legacy load path takes over.
 */
const PUBLIC_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_R2_PUBLIC_URL) || '';

export interface UseAggregateResult {
  data: AggregateJson | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAggregate(): UseAggregateResult {
  const [data, setData] = useState<AggregateJson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const url = PUBLIC_BASE
      ? `${PUBLIC_BASE.replace(/\/$/, '')}/stats/aggregate.json`
      : '/r2/stats/aggregate.json';

    fetch(url, { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error(`aggregate.json fetch failed: ${r.status}`);
        return r.json();
      })
      .then((json: AggregateJson) => {
        if (!cancelled) setData(json);
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
  }, [nonce]);

  return {
    data,
    loading,
    error,
    refetch: () => setNonce(n => n + 1),
  };
}
