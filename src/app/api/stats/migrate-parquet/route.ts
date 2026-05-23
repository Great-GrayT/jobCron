import { NextRequest, NextResponse } from "next/server";
import { getR2Storage } from "@/lib/r2-storage";
import {
  getJobStatisticsCacheR2,
  JobMetadata,
  JobDescription,
  JobStatistic,
} from "@/lib/job-statistics-r2";
import {
  writeDailyParquet,
  compactMonthlyParquet,
  writeAggregateJson,
} from "@/lib/job-statistics-parquet";
import { validateEnvironmentVariables, verifyCronRequest } from "@/lib/validation";
import { logger } from "@/lib/logger";

export const maxDuration = 300; // 5 minutes
export const dynamic = "force-dynamic";

/**
 * GET /api/stats/migrate-parquet
 *
 * One-off migration referenced in STORAGE_REDESIGN_PROPOSAL.md §6.
 * Walks every NDJSON day in the manifest, writes it as a Parquet file,
 * and updates manifest.parquet. Optionally compacts finished months into
 * a single monthly Parquet in the same pass.
 *
 * Query params:
 *   - month=YYYY-MM   restrict to a single month (default: all months)
 *   - compact=1       also collapse finished months into monthly files
 *   - dryRun=1        print plan without writing
 *
 * Safe to re-run: idempotent — overwriting daily files just produces a new
 * content-hash and orphans the old key (which is deleted in the same step).
 *
 * Authorization: CRON_SECRET (same as the cron route).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!verifyCronRequest(authHeader)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    validateEnvironmentVariables();

    const searchParams = request.nextUrl.searchParams;
    const monthArg = searchParams.get("month");
    const doCompact = searchParams.get("compact") === "1";
    const dryRun = searchParams.get("dryRun") === "1";

    const r2 = getR2Storage();
    if (!r2.isAvailable()) {
      return NextResponse.json({ error: "R2 not configured" }, { status: 500 });
    }

    const cache = getJobStatisticsCacheR2();
    await cache.load();
    const manifest = cache.getManifest();
    if (!manifest) {
      return NextResponse.json({ error: "Manifest unavailable" }, { status: 500 });
    }

    const monthsToProcess = monthArg
      ? [monthArg]
      : [...manifest.availableMonths];
    // Always include the current month in case it isn't in availableMonths yet.
    if (!monthsToProcess.includes(manifest.currentMonth)) {
      monthsToProcess.push(manifest.currentMonth);
    }

    const dailyResults: Array<{ date: string; rows: number; key: string }> = [];
    const monthlyResults: Array<{ month: string; rows: number; key: string }> = [];

    for (const month of monthsToProcess) {
      const monthData = manifest.months[month];
      if (!monthData || monthData.days.length === 0) {
        logger.info(`Migrate: skipping ${month}, no manifest entries`);
        continue;
      }

      const monthAllJobs: JobStatistic[] = [];

      for (const day of monthData.days) {
        const [metadata, descriptions] = await Promise.all([
          r2.getNDJSONGzipped<JobMetadata>(day.metadata),
          r2.getNDJSONGzipped<JobDescription>(day.descriptions),
        ]);
        const descById = new Map(descriptions.map(d => [d.id, d.description]));
        const fullJobs = metadata.map(m => ({
          ...m,
          description: descById.get(m.id) ?? '',
        } as JobStatistic));

        monthAllJobs.push(...fullJobs);

        if (dryRun) {
          dailyResults.push({ date: day.date, rows: fullJobs.length, key: '(dry run)' });
          continue;
        }

        const { ref, replacedKey } = await writeDailyParquet(day.date, fullJobs, manifest);
        if (replacedKey) {
          try {
            await r2.delete(replacedKey);
          } catch (err) {
            logger.warn(`Failed to delete prior Parquet file ${replacedKey}:`, err);
          }
        }
        dailyResults.push({ date: day.date, rows: ref.rowCount, key: ref.key });
      }

      // Optional: collapse a finished month into one monthly Parquet.
      const isFinishedMonth = month !== manifest.currentMonth;
      if (doCompact && isFinishedMonth && monthAllJobs.length > 0) {
        if (dryRun) {
          monthlyResults.push({ month, rows: monthAllJobs.length, key: '(dry run)' });
        } else {
          const { ref } = await compactMonthlyParquet(month, monthAllJobs, manifest);
          monthlyResults.push({ month, rows: ref.rowCount, key: ref.key });
        }
      }
    }

    if (!dryRun) {
      await r2.saveManifest(manifest);

      // Also refresh the aggregate.json so the client can start consuming
      // the new Parquet refs immediately.
      try {
        const cacheForAggregate = getJobStatisticsCacheR2();
        await cacheForAggregate.load();
        const refreshedManifest = cacheForAggregate.getManifest();
        if (refreshedManifest) {
          const aggResult = await cacheForAggregate.getAllArchivesAggregated();
          await writeAggregateJson({
            manifest: refreshedManifest,
            currentMonthStats: cacheForAggregate.getCurrentStatistics(),
            archives: aggResult.archives,
            aggregatedStats: aggResult.aggregated,
            totalJobs: aggResult.totalJobs,
          });
        }
      } catch (err) {
        logger.error("Post-migration aggregate.json refresh failed:", err);
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      compactRequested: doCompact,
      months: monthsToProcess,
      daily: dailyResults,
      monthly: monthlyResults,
    });
  } catch (error) {
    logger.error("Migration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
