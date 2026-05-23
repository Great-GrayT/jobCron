import { NextRequest, NextResponse } from "next/server";
import { getR2Storage, type Manifest } from "@/lib/r2-storage";
import type { MonthlyStatistics } from "@/lib/job-statistics-r2";
import type { AggregateJson } from "@/lib/job-statistics-parquet";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/stats/diagnostics
 *
 * Self-diagnoses the storage layer by cross-checking four independent
 * row-count sources and surfacing any divergence as a structured finding.
 *
 * Sources compared:
 *   - manifestDaysSum: SUM(manifest.months[*].days[*].jobCount). Ground truth —
 *     these are actual NDJSON file row counts written by the cron.
 *   - statsFilesSum: SUM(stats/YYYY-MM.json[*].totalJobs). What the per-month
 *     counter says. Drifts when fix-/rebuild routes mutate counters without
 *     verifying file row counts.
 *   - parquetRowsSum: SUM(manifest.parquet.daily[*].rowCount + .monthly[*].rowCount).
 *     What the new Parquet layer holds.
 *   - aggregateTotal: aggregate.json's totalJobs field (a re-roll of statsFilesSum).
 *
 * No auth — this is read-only and useful from the dashboard. Add CRON_SECRET
 * gating if you decide it's too revealing.
 */
export async function GET(_request: NextRequest) {
  try {
    const r2 = getR2Storage();
    if (!r2.isAvailable()) {
      return NextResponse.json({ error: "R2 not configured" }, { status: 500 });
    }

    const findings: Finding[] = [];

    const manifest = await r2.getJSON<Manifest>("manifest.json");
    if (!manifest) {
      return NextResponse.json({
        ok: false,
        findings: [{
          severity: "error",
          category: "manifest",
          message: "manifest.json is missing or empty on R2",
          remedy: "Run the cron (/api/stats/get) once to bootstrap, or run /api/stats/rebuild",
        }],
      });
    }

    // ---------- Source 1: manifest day jobCounts (ground truth) ----------
    const manifestPerMonth: PerMonth[] = [];
    let manifestDaysSum = 0;
    for (const [month, data] of Object.entries(manifest.months)) {
      const dayJobCountSum = data.days.reduce((s, d) => s + (d.jobCount || 0), 0);
      manifestDaysSum += dayJobCountSum;
      manifestPerMonth.push({
        month,
        manifestTotalJobs: data.totalJobs,
        daysSum: dayJobCountSum,
        daysCount: data.days.length,
      });

      if (data.totalJobs !== dayJobCountSum) {
        findings.push({
          severity: "warn",
          category: "manifest-internal-drift",
          month,
          message:
            `manifest.months[${month}].totalJobs (${data.totalJobs}) != ` +
            `SUM(days[*].jobCount) (${dayJobCountSum}).`,
          remedy:
            "The manifest's own per-month totalJobs is inconsistent with its day entries. " +
            "Run /api/stats/rebuild to recompute from the actual files.",
        });
      }
    }

    // ---------- Source 2: per-month stats files ----------
    const statsPerMonth: Array<{ month: string; statsTotalJobs: number | null }> = [];
    let statsFilesSum = 0;
    for (const month of manifest.availableMonths) {
      const stats = await r2.getJSON<MonthlyStatistics>(`stats/${month}.json`);
      const value = stats?.totalJobs ?? null;
      statsPerMonth.push({ month, statsTotalJobs: value });
      if (value !== null) statsFilesSum += value;

      const manifestRow = manifestPerMonth.find(r => r.month === month);
      if (manifestRow && value !== null && value !== manifestRow.daysSum) {
        const drift = value - manifestRow.daysSum;
        findings.push({
          severity: Math.abs(drift) > manifestRow.daysSum * 0.5 ? "error" : "warn",
          category: "stats-counter-drift",
          month,
          message:
            `stats/${month}.json totalJobs (${value}) does not match actual NDJSON file rows (${manifestRow.daysSum}). ` +
            `Counter is ${drift > 0 ? "inflated" : "deflated"} by ${Math.abs(drift)}.`,
          remedy:
            "The per-month stats counter has drifted from the underlying NDJSON. " +
            "Run /api/stats/rebuild to recompute. This is the most common cause of " +
            "the DuckDB-vs-aggregate mismatch you're seeing.",
        });
      }
    }

    // ---------- Source 3: Parquet file row counts ----------
    let parquetRowsSum = 0;
    const parquetDailyMonths = new Set<string>();
    const parquetMonthlyMonths = new Set<string>();
    if (manifest.parquet) {
      for (const [date, ref] of Object.entries(manifest.parquet.daily)) {
        parquetRowsSum += ref.rowCount;
        parquetDailyMonths.add(date.slice(0, 7));
      }
      for (const [month, ref] of Object.entries(manifest.parquet.monthly)) {
        parquetRowsSum += ref.rowCount;
        parquetMonthlyMonths.add(month);
      }
    }

    const monthsWithParquet = new Set([...parquetDailyMonths, ...parquetMonthlyMonths]);
    const monthsMissingParquet = manifest.availableMonths.filter(m => !monthsWithParquet.has(m));
    if (monthsMissingParquet.length > 0) {
      findings.push({
        severity: "error",
        category: "parquet-coverage",
        message:
          `${monthsMissingParquet.length} month(s) have NDJSON data but no Parquet files: ` +
          monthsMissingParquet.join(", "),
        remedy:
          "Run /api/stats/migrate-parquet?compact=1 with your CRON_SECRET to backfill the missing months. " +
          "Until then, DuckDB-WASM only sees a partial dataset.",
      });
    }

    if (parquetRowsSum > 0 && parquetRowsSum !== manifestDaysSum) {
      const drift = manifestDaysSum - parquetRowsSum;
      findings.push({
        severity: "warn",
        category: "parquet-row-drift",
        message:
          `Parquet row count (${parquetRowsSum}) does not match NDJSON ground truth (${manifestDaysSum}). ` +
          `Difference: ${drift} rows.`,
        remedy:
          drift > 0
            ? "Parquet is behind NDJSON. Re-run /api/stats/migrate-parquet to refresh."
            : "Parquet has more rows than NDJSON — suggests duplicate rows in Parquet. Investigate manifest.parquet entries.",
      });
    }

    // ---------- Source 4: aggregate.json ----------
    const aggregate = await r2.getJSON<AggregateJson>("stats/aggregate.json");
    const aggregateTotal = aggregate?.totalJobs ?? null;
    if (aggregateTotal === null) {
      findings.push({
        severity: "warn",
        category: "aggregate-missing",
        message: "stats/aggregate.json is missing.",
        remedy: "It's written on each cron save. Trigger /api/stats/get or /api/stats/migrate-parquet to create it.",
      });
    } else if (aggregateTotal !== statsFilesSum) {
      findings.push({
        severity: "warn",
        category: "aggregate-drift",
        message:
          `aggregate.json totalJobs (${aggregateTotal}) != SUM(stats/YYYY-MM.json.totalJobs) (${statsFilesSum}). ` +
          "Aggregate is stale relative to the per-month stats files.",
        remedy: "Trigger any cron write (or /api/stats/migrate-parquet) to refresh aggregate.json.",
      });
    }

    // ---------- Cross-source headline ----------
    if (aggregateTotal !== null && parquetRowsSum > 0 && aggregateTotal !== parquetRowsSum) {
      const drift = aggregateTotal - parquetRowsSum;
      findings.unshift({
        severity: "error",
        category: "headline",
        message:
          `aggregate.json reports ${aggregateTotal.toLocaleString()} jobs but Parquet files only contain ` +
          `${parquetRowsSum.toLocaleString()} (delta ${drift.toLocaleString()}). ` +
          `NDJSON ground truth is ${manifestDaysSum.toLocaleString()}.`,
        remedy:
          // Pick the dominant cause based on what else we found.
          monthsMissingParquet.length > 0
            ? "Cause: incomplete Parquet migration. Fix: re-run /api/stats/migrate-parquet?compact=1."
            : statsFilesSum > manifestDaysSum * 1.5
              ? "Cause: per-month stats counters are inflated (counter drift). Fix: run /api/stats/rebuild, then /api/stats/migrate-parquet."
              : "Investigate the per-source findings below — at least one source is wrong.",
      });
    }

    const headlineSeverity = findings.some(f => f.severity === "error")
      ? "error"
      : findings.some(f => f.severity === "warn")
        ? "warn"
        : "ok";

    return NextResponse.json({
      ok: headlineSeverity === "ok",
      severity: headlineSeverity,
      sources: {
        manifestDaysSum,    // ground truth: rows in NDJSON files
        statsFilesSum,      // counter claim: sum of per-month stats.totalJobs
        parquetRowsSum,     // Parquet row count
        aggregateTotal,     // aggregate.json's totalJobs
      },
      breakdown: {
        monthsTotal: Object.keys(manifest.months).length,
        monthsAvailable: manifest.availableMonths.length,
        monthsWithParquet: monthsWithParquet.size,
        monthsMissingParquet,
        currentMonth: manifest.currentMonth,
      },
      perMonth: manifestPerMonth.map(m => {
        const stats = statsPerMonth.find(s => s.month === m.month);
        return {
          month: m.month,
          manifestTotalJobs: m.manifestTotalJobs,
          ndjsonDaysSum: m.daysSum,
          daysCount: m.daysCount,
          statsFileTotalJobs: stats?.statsTotalJobs ?? null,
          hasDailyParquet: parquetDailyMonths.has(m.month),
          hasMonthlyParquet: parquetMonthlyMonths.has(m.month),
        };
      }),
      findings,
    });
  } catch (error) {
    logger.error("Diagnostics error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

interface Finding {
  severity: "ok" | "warn" | "error";
  category: string;
  month?: string;
  message: string;
  remedy: string;
}

interface PerMonth {
  month: string;
  manifestTotalJobs: number;
  daysSum: number;
  daysCount: number;
}
