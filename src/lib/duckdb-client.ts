'use client';

/**
 * Browser-side DuckDB-WASM client.
 *
 * Used by the stats dashboard to query Parquet files served from R2 directly,
 * skipping the per-query Vercel function invocation that the legacy
 * /api/stats/jobs endpoint performs. Phase 3 of STORAGE_REDESIGN_PROPOSAL.md.
 *
 * Lifecycle:
 *   - DuckDB-WASM is dynamically imported on first call so the ~5 MB bundle
 *     never lands in the initial dashboard payload.
 *   - The instance is a module-level singleton; the same DB serves every
 *     hook + every chart in the session.
 *   - Parquet files are registered as virtual httpfs URLs ("jobs.parquet")
 *     so SQL can read directly with HTTP range requests against R2.
 */

import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import type { ParquetManifest } from './r2-storage';

let dbPromise: Promise<AsyncDuckDB> | null = null;
let registeredManifestKey: string | null = null;

/**
 * Initialize (or reuse) the singleton DuckDB-WASM instance.
 *
 * Uses jsDelivr-hosted bundles so we don't have to ship WASM/Worker assets
 * via Next.js's static file pipeline — the proposal's "no extra build
 * machinery" goal.
 */
async function getDuckDB(): Promise<AsyncDuckDB> {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const duckdb = await import('@duckdb/duckdb-wasm');
    const bundles = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(bundles);

    // Construct a Worker from the selected MVP/EH bundle. The Blob shim is the
    // recommended pattern so the worker URL is same-origin and doesn't trip
    // Next.js' worker-module restrictions.
    const workerUrl = URL.createObjectURL(
      new Blob([`importScripts("${bundle.mainWorker!}");`], {
        type: 'text/javascript',
      }),
    );

    const worker = new Worker(workerUrl);
    const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    URL.revokeObjectURL(workerUrl);
    return db;
  })();

  return dbPromise;
}

/**
 * Build a stable cache key from a manifest so we know whether to re-register
 * files when aggregate.json refreshes. Concatenates every file's content
 * hash — any change → different key → re-register.
 */
function manifestKey(parquet: ParquetManifest | null): string {
  if (!parquet) return 'empty';
  const parts: string[] = [];
  for (const [date, ref] of Object.entries(parquet.daily).sort()) {
    parts.push(`d:${date}:${ref.contentHash.slice(0, 8)}`);
  }
  for (const [month, ref] of Object.entries(parquet.monthly).sort()) {
    parts.push(`m:${month}:${ref.contentHash.slice(0, 8)}`);
  }
  return parts.join('|');
}

/**
 * (Re)create the `jobs` view over every Parquet URL in the manifest.
 *
 * Idempotent: if the manifest fingerprint hasn't changed since the last
 * call we skip the view recreation entirely.
 *
 * Implementation detail: we used to call `db.registerFileURL(name, url, HTTP)`
 * and then `read_parquet('<name>')`, but the virtual-name lookup wasn't being
 * resolved by DuckDB-WASM's worker (it tried to open the name as a literal
 * file path and 404'd). Passing the URL directly to `read_parquet` bypasses
 * the registration layer entirely — the bundled httpfs extension handles
 * range fetches natively. Same behavior, fewer moving parts.
 */
async function registerParquetFiles(
  db: AsyncDuckDB,
  parquet: ParquetManifest | null,
): Promise<string[]> {
  const key = manifestKey(parquet);
  if (key === registeredManifestKey) {
    return collectUrls(parquet);
  }

  if (!parquet) {
    registeredManifestKey = key;
    return [];
  }

  const allRefs = [
    ...Object.values(parquet.monthly),
    ...Object.values(parquet.daily),
  ];

  const conn = await db.connect();
  try {
    if (allRefs.length === 0) {
      await conn.query(`DROP VIEW IF EXISTS jobs`);
    } else {
      // UNION ALL stitches per-file scans into one logical table. DuckDB
      // pushes WHERE clauses through UNION ALL into each scan, so predicate
      // pushdown still works.
      const reads = allRefs
        .map(ref => `SELECT * FROM read_parquet('${escapeForSql(ref.url)}')`)
        .join(' UNION ALL ');
      await conn.query(`CREATE OR REPLACE VIEW jobs AS ${reads}`);
    }
  } finally {
    await conn.close();
  }

  registeredManifestKey = key;
  return collectUrls(parquet);
}

/**
 * Escape a string for safe inclusion inside a SQL single-quoted literal.
 * Our R2 URLs only ever contain `[a-zA-Z0-9./:_-]`, but escape defensively
 * in case a custom domain or query string sneaks in later.
 */
function escapeForSql(value: string): string {
  return value.replace(/'/g, "''");
}

function collectUrls(parquet: ParquetManifest | null): string[] {
  if (!parquet) return [];
  const urls: string[] = [];
  for (const ref of Object.values(parquet.monthly)) urls.push(ref.url);
  for (const ref of Object.values(parquet.daily)) urls.push(ref.url);
  return urls;
}

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
  columns: string[];
}

/**
 * Initialize DuckDB-WASM if needed, ensure the manifest's Parquet files are
 * registered, then run the given SQL and return rows as plain JS objects.
 *
 * SQL has access to a `jobs` view that unions every registered Parquet file.
 * Example: `SELECT industry, COUNT(*) FROM jobs GROUP BY industry`.
 */
export async function queryParquet<T = Record<string, unknown>>(
  parquet: ParquetManifest | null,
  sql: string,
): Promise<QueryResult<T>> {
  const db = await getDuckDB();
  await registerParquetFiles(db, parquet);

  const conn: AsyncDuckDBConnection = await db.connect();
  try {
    const result = await conn.query(sql);
    const columns = result.schema.fields.map(f => f.name);
    // toArray() on an arrow Table returns Row proxy objects; spreading
    // materializes them as plain JS objects (cheaper than .toObject() per row).
    const rows = (result.toArray() as Array<Record<string, unknown>>).map(r => ({ ...r })) as T[];
    return { rows, rowCount: rows.length, columns };
  } finally {
    await conn.close();
  }
}

/**
 * Returns true once DuckDB-WASM has been initialized in this session.
 * Useful for the dashboard to show a "engine loaded" badge.
 */
export function isDuckDBReady(): boolean {
  return registeredManifestKey !== null;
}
