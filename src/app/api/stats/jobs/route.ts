import { NextRequest, NextResponse } from "next/server";
import { getStatsCache } from "@/lib/stats-storage";
import { validateEnvironmentVariables } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET /api/stats/jobs?month=YYYY-MM[&date=YYYY-MM-DD][&days=N][&all=true]
 *
 * Returns metadata-only job records (no descriptions) for a given month.
 * Default (no limit param): load all days.
 */
export async function GET(request: NextRequest) {
  try {
    validateEnvironmentVariables();

    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get("month");
    const date = searchParams.get("date") ?? undefined;
    const daysParam = searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : undefined;

    if (!month) {
      return NextResponse.json({ error: "month parameter required" }, { status: 400 });
    }

    const statsCache = await getStatsCache();
    await statsCache.load();

    if (typeof statsCache.loadJobsForMonth !== "function") {
      return NextResponse.json({ success: true, month, jobs: [], count: 0 });
    }

    const options: { days?: number; date?: string } = {};
    if (date) options.date = date;
    else if (days) options.days = days;

    const jobs = await statsCache.loadJobsForMonth(month, options);

    return NextResponse.json({
      success: true,
      month,
      jobs,
      count: jobs.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch jobs",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
