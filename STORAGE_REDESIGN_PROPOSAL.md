# Storage & Loading Redesign Proposal

**Status:** Proposal
**Date:** 2026-05-21
**Scope:** Replace the current NDJSON-on-R2 + heavy-payload-from-Next.js architecture with a Parquet-on-R2 + DuckDB-WASM-in-browser architecture.

---

## 1. Goals & constraints

### Goals

1. Keep the existing dashboard UI, components, and feature set unchanged.
2. Make first paint of `/stats` fast regardless of dataset size.
3. Make filter / search / drill-down operations cheap and bounded — they must not get slower as the dataset grows.
4. Stay close to free at projected scale.

### Hard constraints

- **No backend server.** Only R2 object storage + a cron service that calls a Next.js API route to perform writes.
- **R2 is the only durable store.** No Postgres, no Turso, no managed search service.
- **Vercel functions are write-path-only.** Reads must not require a function invocation per query.
- **Projected scale:** ~1,000,000 jobs in 6 months (~5,500/day, ~170,000/month).
- **Search requirements:** keyword tag matching + title/company substring. No full-text search on descriptions.

### Workload shape

- **OLAP, not OLTP.** Almost every query is a faceted count, group-by, or filter intersection. No row-level reads or updates outside writes.
- **Append-mostly, immutable-once-written.** Cron adds jobs; existing rows never change.
- **Single writer, many readers.** No write contention to design around.
- **Most sessions are read-only browsing** with no filters applied; a minority apply filters or search.

---

## 2. Why the current design breaks at projected scale

Today every page mount fetches the full month's job metadata as one JSON payload (`/api/stats/jobs?month=...`), through a Next.js route that gunzips R2-stored NDJSON and re-serializes it. That payload is then held in client memory and used for all filtering.

At 170,000 jobs/month this becomes 30–80 MB of decompressed JSON per session. Independent of bandwidth, that is fatal for:

- **First paint** — nothing renders until the whole payload arrives and parses.
- **Memory** — mobile browsers struggle with multi-tens-of-MB JS heaps.
- **Filter responsiveness** — every filter change recomputes statistics across the full in-memory set.
- **Egress cost** if we were on S3 (R2's free egress masks this, but the work is still wasted).
- **Function execution** — Vercel functions doing gunzip + JSON.stringify on hundreds of MB hit cold-start and memory ceilings.

Pre-aggregating more views in R2 helps the no-filter case but cannot help the filtered case: the combinatorial space of (industry × seniority × country × keyword × ...) cannot be pre-rolled. The application needs a _query engine_ over per-record data; it does not need a database server.

---

## 3. Proposed architecture: Parquet on R2 + DuckDB-WASM in the browser

### One-line summary

Store jobs as Parquet files on R2. Query them with DuckDB-WASM running in the user's browser, fetching only the columns and row groups each query needs via HTTP range requests. Serve a tiny pre-aggregated JSON for instant first paint so the engine spins up lazily only on interaction.

### Why this fits

| Property                         | Why it matters here                                                                                                                                                   |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Columnar storage**             | `COUNT(*) GROUP BY industry` reads only the `industry` column. ~200 bytes/row of hot columns vs ~3 KB/row of full record.                                             |
| **Predicate pushdown**           | `WHERE country='Germany'` reads only row groups whose `country` min/max statistics overlap. Typical filter fetches 100–500 KB, not the whole dataset.                 |
| **Column projection**            | The heavy `description` column never gets fetched unless explicitly selected. Replaces the current metadata/descriptions file split with native lazy materialization. |
| **R2 egress is free**            | Every query is an HTTP range request to R2. Cost per query ≈ $0.                                                                                                      |
| **No per-query Vercel function** | The browser does the work. Function invocations stay limited to cron writes.                                                                                          |
| **Dictionary encoding**          | Low-cardinality fields (industry, country, seniority) compress to ~1 byte/row. Critical at 1M rows.                                                                   |
| **Immutable files**              | Parquet files are written once; HTTP cache headers make repeat visits ~free.                                                                                          |

### Why client-side DuckDB and not server-side

R2 egress is free; Vercel function invocations are not. Client-side DuckDB pushes all per-query compute to the user's device and pays only the (free) R2 egress. Server-side DuckDB on Vercel would pay for every query in function time + memory and would re-initialize from cold on every invocation since there is no persistent process. Given the constraint _"cost is the priority,"_ client-side is an order of magnitude cheaper.

---

## 4. Data layout in R2

```
manifest.json                           Index: file keys, content hashes, row counts, date ranges
url-index.json                          Existing dedup set (kept as-is, it's small and effective)
stats/aggregate.json                    Pre-rolled totals + top-N for instant first paint
jobs/YYYY/MM/DD.parquet                 Daily files for the current month (~1-2 MB each)
jobs/YYYY-MM.parquet                    Compacted historical months (~30-50 MB each)
```

### Schema (one Parquet table, one set of columns)

```
id                  STRING
title               STRING
company             STRING
url                 STRING
postedDate          TIMESTAMP
extractedDate       TIMESTAMP
country             STRING        -- dictionary-encoded, ~1 byte/row
city                STRING
region              STRING
location            STRING
industry            STRING
seniority           STRING
roleType            STRING
roleCategory        STRING
yearsExperience     STRING
keywords            LIST<STRING>
certificates        LIST<STRING>
software            LIST<STRING>
programmingSkills   LIST<STRING>
academicDegrees     LIST<STRING>
salary              STRUCT<min:INT, max:INT, currency:STRING, period:STRING>
description         STRING        -- heavy, only fetched when SELECTed
```

The current metadata/descriptions file split is eliminated. Parquet's native column projection delivers the same benefit — `SELECT id, title FROM jobs` simply does not fetch description bytes — without maintaining two parallel file trees.

### Sizing at 1M jobs

| Component                                     | Approximate size  |
| --------------------------------------------- | ----------------- |
| Hot columns (everything except `description`) | ~150–200 MB total |
| `description` column                          | ~1.5–2 GB total   |
| `stats/aggregate.json`                        | ~50 KB            |
| `manifest.json`                               | ~10 KB            |
| **R2 storage cost**                           | **~$0.05/month**  |

### File partitioning policy

- **Current month:** one Parquet file per day, rewritten on each cron write that adds new rows for that day.
- **Finished months:** compacted into one Parquet file per month by a separate compaction route, run nightly or weekly. Smaller daily files are deleted after successful compaction.
- **Row groups:** default DuckDB-Parquet row group size is appropriate (~122K rows or ~100 MB). At our scale this typically yields 1–2 row groups per month file, which is good — fewer file-level reads, finer predicate pushdown via row group statistics.

---

## 5. Write path (cron → Next.js → R2)

The cron-triggered route keeps its existing structure (scrape → analyze → dedupe). Only the persistence layer changes:

1. Fetch new jobs from sources, run extractors (current behavior).
2. Normalize URLs, check against `url-index.json` for dedup (current behavior).
3. Read today's `jobs/YYYY/MM/DD.parquet` from R2 (if it exists).
4. Merge new rows in memory.
5. Write `jobs/YYYY/MM/DD.parquet` back to R2 using a JS Parquet writer (`parquet-wasm` or `hyparquet`, ~200 KB bundle, no native deps).
6. Recompute `stats/aggregate.json` from the new state. This is cheap because it operates on counts and top-N, not raw rows.
7. Update `manifest.json` with the new file's hash and row count.

A separate `/api/stats/compact` route, triggered weekly or after a month closes, merges that month's daily files into `jobs/YYYY-MM.parquet` and deletes the source files.

### Why not DuckDB-WASM on the server too

`parquet-wasm` is ~200 KB and initializes in tens of milliseconds. DuckDB-WASM is ~5 MB and takes 1–2 s to initialize. For a write path that runs every few minutes on a serverless function, that cold-start cost is unjustified. Reads happen many times per session in the browser, where a one-time 5 MB cache amortizes well; writes happen once per cron run on a fresh function instance, where it does not.

---

## 6. Read path (client)

```
T+0     Page mount
        ├─ fetch stats/aggregate.json   (~50 KB)   → instant chart paint
        ├─ fetch manifest.json          (~10 KB)
        └─ <link rel=preload> duckdb-wasm bundle (background, non-blocking)

T+200   Dashboard fully rendered from aggregate.json
        ~80% of sessions never leave this state

T+? (user types in search or clicks a filter chip)
        ├─ DuckDB-WASM finishes init    (1-2 s first time, cached forever after)
        ├─ Register Parquet files from manifest as remote httpfs sources
        └─ Run SQL → range-fetch relevant row groups → result
           (typical: 100-500 ms, 100-500 KB fetched)
```

### What changes in the React layer

The components do not change. Only the data layer underneath changes:

- `filteredJobs` (a `useMemo` that filters in-memory) becomes a `useQuery(sql)` that returns the matching rows as a Promise.
- `filteredStatistics` (a `useMemo` that rebuilds aggregates from `filteredJobs`) becomes either a parallel SQL query or a client-side reduction over the smaller filtered set, depending on which is cheaper for each chart.
- Per-chart helpers (`getIndustryChartData`, `getCountryData`, etc.) become SQL strings, often a single `GROUP BY` line each.

The chart components themselves consume the same shapes.

### Search

- **Keyword search:** `WHERE array_contains(keywords, 'python')` — fast, uses Parquet's list encoding.
- **Title / company substring:** `WHERE title ILIKE '%python%' OR company ILIKE '%python%'` — fast at our scale because most queries combine it with a more selective filter, so DuckDB pushes down the cheaper predicate first.
- **Description search:** explicitly out of scope per requirements.

---

## 7. Cost model

Projected monthly bill at 1M jobs and 10,000 page views:

| Item                                             | Cost             |
| ------------------------------------------------ | ---------------- |
| R2 storage (~3 GB)                               | ~$0.05           |
| R2 Class A operations (writes from cron)         | <$0.10           |
| R2 Class B operations (range reads from clients) | ~$0.05           |
| R2 egress                                        | $0.00            |
| Vercel function invocations (cron writes only)   | within free tier |
| **Total**                                        | **~$0.20/month** |

The structural point: **cost scales with bytes stored, not queries served.** Doubling the user base doubles R2 Class B operations (a few cents) and nothing else.

---

## 8. Risks and what must be verified before committing

1. **Parquet write cold-start inside a Vercel function.**
   `parquet-wasm` is small but needs benchmarking on Vercel's runtime. Target: <1 s added cold-start. Fallback plan: keep writing NDJSON.gz on the hot path and run a separate compaction route that converts to Parquet daily. This bifurcates the read path slightly but keeps writes cheap.

2. **DuckDB-WASM bundle on first interactive load.**
   ~5 MB on first visit, cached forever after. Acceptable for a desktop analytics tool. Not acceptable for a mobile-first or first-impression-critical page. Mitigations: preload via `<link rel=preload>` during initial render; default view never touches DuckDB.

3. **`SELECT *` is a footgun.**
   The current code shape assumes the full record is always present. With Parquet, the `description` column is ~80% of the bytes. Every query must explicitly list the columns it needs. This is a discipline change, not a structural risk, but worth being deliberate about during the rewrite.

4. **CORS on the R2 bucket.**
   Client-side fetch requires CORS on the bucket and an exposed `R2_PUBLIC_URL`. Anyone can download the raw Parquet files. Functionally this is already true today via the existing API, but it becomes more directly visible.

5. **Single-writer assumption for `manifest.json`.**
   The cron is the only writer, so last-write-wins is safe. If a second writer is ever added, manifest updates must become CAS-based (e.g., via `If-Match` on R2 ETag).

6. **Migration of existing data.**
   A one-off script converts the existing NDJSON.gz files to Parquet and rebuilds the manifest. Runs once.

---

## 9. Implementation phases

Each phase ships independently and leaves the system in a working state.

### Phase 1 — Parquet write path (de-risks the foundation)

- Add `parquet-wasm` (or equivalent) to the cron-route bundle.
- New `JobStatisticsCacheParquet` storage class implementing the same interface as `JobStatisticsCacheR2`.
- Cron writes to _both_ old NDJSON layout and new Parquet layout (dual-write) for one week to validate correctness.
- After validation, drop the NDJSON write.

### Phase 2 — Pre-aggregated JSON for instant first paint

- New `/api/stats/aggregate` endpoint (or static `stats/aggregate.json` on R2) returning totals + top-N + recent-days timeline.
- Page mount fetches `aggregate.json` and renders the dashboard immediately, without loading any job records.
- All existing charts work; filter UI is rendered but interactions still go through the old code path.

### Phase 3 — DuckDB-WASM read path

- Add `@duckdb/duckdb-wasm` to the client bundle, code-split so it loads only when the user interacts.
- Replace `filteredJobs` / `filteredStatistics` / per-chart data helpers with SQL queries against the Parquet files via DuckDB's `httpfs` extension.
- Remove the old `/api/stats/jobs` and `/api/stats/description` proxy endpoints once nothing references them.

### Phase 4 — Compaction & cleanup

- New `/api/stats/compact` cron entry, weekly: merges finished months' daily files into one Parquet per month.
- One-off migration script: convert all existing NDJSON.gz data to Parquet, rebuild manifest.
- Decommission old R2 prefixes (`metadata/`, `descriptions/`) after successful migration.

---

## 10. What becomes dead code

A core motivation for this redesign is _less code_, not more. Most of the storage / loading / one-off-maintenance plumbing exists only because today's design needs it. Once Parquet + DuckDB-WASM is in place, the following can be deleted outright.

### Files to delete entirely

| Path                                                                                    | Why it goes                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [src/lib/job-statistics-cache.ts](src/lib/job-statistics-cache.ts)                      | The legacy Gist backend. The new design is R2-only; Gist is no longer a supported storage target.                                                                                                                                                                                                                                    |
| [src/lib/job-statistics-r2.ts](src/lib/job-statistics-r2.ts)                            | The NDJSON-metadata/descriptions cache class. Replaced by a much smaller `JobStatisticsCacheParquet` whose only job is "merge new rows into today's Parquet file." The split-job / combine-job / pending-batch / per-field-counter logic disappears because aggregation lives in the pre-rolled `aggregate.json` and in SQL queries. |
| [src/lib/stats-storage.ts](src/lib/stats-storage.ts)                                    | The R2-vs-Gist adapter. With one backend, there's nothing to adapt. Callers import the Parquet cache directly.                                                                                                                                                                                                                       |
| [src/app/api/migrate-to-r2/route.ts](src/app/api/migrate-to-r2/route.ts)                | One-shot Gist → R2 migration. Already-run, target backend removed.                                                                                                                                                                                                                                                                   |
| [src/app/api/stats/jobs/route.ts](src/app/api/stats/jobs/route.ts)                      | The "send the whole month's metadata to the client" endpoint. The client now reads Parquet directly via DuckDB-WASM.                                                                                                                                                                                                                 |
| [src/app/api/stats/description/route.ts](src/app/api/stats/description/route.ts)        | "Send descriptions for a date" endpoint. Replaced by `SELECT description FROM jobs WHERE id = ?` on the client.                                                                                                                                                                                                                      |
| [src/app/api/stats/cleanup/route.ts](src/app/api/stats/cleanup/route.ts)                | One-off deduplication of the NDJSON layout. The new layout is Parquet, so the routine doesn't apply.                                                                                                                                                                                                                                 |
| [src/app/api/stats/rebuild/route.ts](src/app/api/stats/rebuild/route.ts)                | Rebuilds the URL index and per-field counters from NDJSON metadata. The Parquet-era equivalent is a 5-line SQL `COPY` — not worth a route.                                                                                                                                                                                           |
| [src/app/api/stats/clear-index/route.ts](src/app/api/stats/clear-index/route.ts)        | NDJSON-era URL-index reset. Becomes trivial against Parquet (`DELETE FROM url-index`-equivalent).                                                                                                                                                                                                                                    |
| [src/app/api/stats/fix-locations/route.ts](src/app/api/stats/fix-locations/route.ts)    | One-shot backfill against the old NDJSON metadata layout. Either run once during migration, or rewrite as a SQL `UPDATE` and discard the route.                                                                                                                                                                                      |
| [src/app/api/stats/fix-company-names/route.ts](src/app/api/stats/fix-company-names/route.ts) | Same — one-shot NDJSON backfill.                                                                                                                                                                                                                                                                                                  |
| [src/app/api/stats/fix-seniority/route.ts](src/app/api/stats/fix-seniority/route.ts)    | Same.                                                                                                                                                                                                                                                                                                                                |
| [src/app/api/stats/fix-indeed-urls/route.ts](src/app/api/stats/fix-indeed-urls/route.ts) | Same.                                                                                                                                                                                                                                                                                                                                |
| [src/app/api/stats/fix-data/route.ts](src/app/api/stats/fix-data/route.ts)              | Same — bulk re-extraction routine against the old layout.                                                                                                                                                                                                                                                                            |
| [src/app/api/stats/extract-and-save/route.ts](src/app/api/stats/extract-and-save/route.ts) | Duplicate of the cron-triggered scrape path that uses the old cache. Redundant once the cron writes Parquet.                                                                                                                                                                                                                       |
| [src/app/api/stats/get/route.ts](src/app/api/stats/get/route.ts)                        | Another duplicate ingest path tied to the old cache. Redundant; the canonical ingest is the cron route.                                                                                                                                                                                                                              |

That is **3 lib modules + 13 API routes** removed outright.

### Code paths inside surviving files that go away

- **`r2-storage.ts`** — keep the class shell, but the NDJSON-specific helpers (`putNDJSONGzipped`, `getNDJSONGzipped`, the gzip imports, and the metadata/descriptions key conventions) are dead. The file shrinks to: `putJSON`, `getJSON`, `putParquet`, `getParquetUrl` (returns the public CDN URL DuckDB-WASM will fetch from), `list`, `delete`, `exists`, plus the manifest helpers.
- **`r2-storage.ts:115`** — the pretty-print (`JSON.stringify(data, null, 2)`) goes; ~20% smaller manifests/aggregates for free.
- **`r2-storage.ts` `Manifest` / `ManifestDay` / `ManifestMonth` types** — the day-level `metadata` + `descriptions` + `metadataBytes` + `descriptionsBytes` fields disappear in favor of a single Parquet file reference per day with a content hash.
- **`load/route.ts`** — shrinks from "build a multi-MB aggregated payload server-side" to "return `stats/aggregate.json`." Loses the `getAllArchivesAggregated` path, the per-archive statistics inlining, the merge-statistics machinery.
- **The entire `MonthlyStatistics` merge/aggregation layer** in `job-statistics-r2.ts` (`computeAggregatedStats`, `mergeStatistics`, `saveAggregatedStats`, `getAllArchivesAggregated`, the salary-merge helpers) becomes one SQL query that runs once per write.
- **`stats/page.tsx`** — the `filteredJobs` `useMemo`, the `filteredStatistics` rebuild (~90 lines), every `getXxxChartData` helper (~150 lines combined), the `loadedJobsById` Map, `loadedDates` Set, `descriptionCache` Map, `loadDateMetadata`, `loadDescriptionsForDate`, the multi-step `loadStatistics` progress dance — all replaced by a thin `useQuery(sql)` hook over DuckDB. **Net deletion: ~400 lines from this file alone.**

### Storage prefixes in R2 to retire (after migration)

- `metadata/YYYY/MM/day-DD.ndjson.gz`
- `descriptions/YYYY/MM/day-DD.ndjson.gz`
- `stats/YYYY-MM.json` (per-month rolled stats — replaced by ad-hoc DuckDB queries + the global `aggregate.json`)
- `aggregated-stats.json` (the pre-merged-across-months snapshot — same reason)

### What stays untouched

These are orthogonal to the storage redesign and should not be modified:

- The cron scraping path: `job-monitor-service.ts`, `rss-parser.ts`, `linkedin-scraper.ts`, `job-analyzer.ts`, `job-metadata-extractor.ts`, `salary-extractor.ts`, `location-extractor.ts`, `role-type-extractor.ts`, all dictionaries.
- The Telegram-notification flow: `telegram.ts`, `daily-cache.ts`, `tracking-url.ts`, `url-cache.ts`.
- The applied-jobs feature: `applied-jobs-r2.ts` and the `/api/applied/*` routes (already a separate concern with its own storage shape).
- All chart components, the theme system, and the search/filter panel.
- The `/api/cron/check-jobs` route shape — it keeps calling `checkAndSendJobs()`, just with a Parquet-backed cache underneath.

### Net effect on the codebase

| | Before | After |
|---|---|---|
| `src/lib` storage modules | 3 (`job-statistics-cache`, `job-statistics-r2`, `stats-storage`) plus `r2-storage` | 1 (`job-statistics-parquet`) plus a slimmed `r2-storage` |
| `/api/stats/*` routes | 13 | 2 (`load` — slimmed; `compact` — new, weekly) |
| Lines in `stats/page.tsx` data layer | ~700 | ~300 |
| Storage formats in R2 | NDJSON.gz × 2 trees + 4 JSON snapshots | Parquet + 2 small JSON files |

The redesign deletes more code than it adds.

---

## 11. Open questions for review

1. Are we comfortable enabling public read access to the R2 bucket via CORS, given the data is already effectively public through the current API?
2. Is the 1–2 s DuckDB-WASM cold-start on first interaction acceptable, or do we want a server-side query fallback for very simple filter cases?
3. Should `stats/aggregate.json` be recomputed on every cron write, or on a slower cadence (every Nth write, or hourly)? Tradeoff: freshness vs cron-route latency.
4. Is the projected 1M jobs / 6 months trajectory confident enough to justify the phase 3 work now, or should we ship phases 1–2 and revisit phase 3 once we cross some threshold?
