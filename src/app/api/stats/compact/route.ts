import { NextRequest, NextResponse } from "next/server";
import { getR2Storage } from "@/lib/r2-storage";
import { getJobStatisticsCacheR2, JobMetadata, JobDescription, JobStatistic } from "@/lib/job-statistics-r2";
import { compactMonthlyParquet } from "@/lib/job-statistics-parquet";
import { validateEnvironmentVariables, verifyCronRequest } from "@/lib/validation";
import { logger } from "@/lib/logger";

export const maxDuration = 300; // 5 minutes
export const dynamic = "force-dynamic";

/**
 * GET /api/stats/compact
 *
 * Phase 4 of STORAGE_REDESIGN_PROPOSAL.md.
 * Compacts every finished month's per-day Parquet files into one monthly
 * Parquet file. Intended to be triggered weekly by Vercel Cron.
 *
 * Authorization: same as /api/cron/check-jobs (CRON_SECRET).
 * Query params:
 *   - month=YYYY-MM   compact a specific month (defaults to "all finished months")
 *   - dryRun=1        report what would be compacted without writing
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
    const dryRun = searchParams.get("dryRun") === "1";

    const r2 = getR2Storage();
    if (!r2.isAvailable()) {
      return NextResponse.json({ error: "R2 not configured" }, { status: 500 });
    }

    const cache = getJobStatisticsCacheR2();
    await cache.load();
    const manifest = cache.getManifest();
    if (!manifest) {
      return NextResponse.json({ error: "Manifest not available" }, { status: 500 });
    }

    // Compact only finished months by default — never touch the live current month.
    const candidateMonths = monthArg
      ? [monthArg]
      : manifest.availableMonths.filter(m => m !== manifest.currentMonth);

    const results: Array<{ month: string; rows: number; key: string; deleted: number }> = [];

    for (const month of candidateMonths) {
      const monthData = manifest.months[month];
      if (!monthData || monthData.days.length === 0) {
        logger.info(`Skipping ${month}: no data in manifest`);
        continue;
      }

      // Read every day's full job set (metadata + descriptions) back from NDJSON.
      // NDJSON is still the source of truth during the dual-write phase.
      const allJobs: JobStatistic[] = [];
      for (const day of monthData.days) {
        const [metadata, descriptions] = await Promise.all([
          r2.getNDJSONGzipped<JobMetadata>(day.metadata),
          r2.getNDJSONGzipped<JobDescription>(day.descriptions),
        ]);
        const descById = new Map(descriptions.map(d => [d.id, d.description]));
        for (const m of metadata) {
          allJobs.push({
            ...m,
            description: descById.get(m.id) ?? '',
          } as JobStatistic);
        }
      }

      if (dryRun) {
        results.push({ month, rows: allJobs.length, key: '(dry run)', deleted: 0 });
        continue;
      }

      const { ref, deletedKeys } = await compactMonthlyParquet(month, allJobs, manifest);
      results.push({ month, rows: ref.rowCount, key: ref.key, deleted: deletedKeys.length });
    }

    if (!dryRun && results.length > 0) {
      await r2.saveManifest(manifest);
    }

    return NextResponse.json({
      success: true,
      dryRun,
      compacted: results,
    });
  } catch (error) {
    logger.error("Compaction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
