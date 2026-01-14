import { NextRequest, NextResponse } from "next/server";
import { JobStatisticsCache } from "@/lib/job-statistics-cache";
import { validateEnvironmentVariables } from "@/lib/validation";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/stats/load
 *
 * Loads statistics from GitHub Gist without updating
 * Returns current month data with full job details and aggregated statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Validate environment variables
    validateEnvironmentVariables();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const archive = searchParams.get("archive"); // Optional: specific month (YYYY-MM)

    // Initialize statistics cache
    const statsCache = new JobStatisticsCache();
    await statsCache.load();

    // If requesting archived month
    if (archive) {
      logger.info(`Fetching archived month: ${archive}`);
      const archivedData = await statsCache.getArchivedMonth(archive);

      if (!archivedData) {
        return NextResponse.json(
          {
            error: "Archive not found",
            message: `No archived data found for ${archive}`,
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        type: "archive",
        month: archive,
        data: archivedData,
      });
    }

    // Return current month data, summary, AND aggregated historical data
    const currentMonthData = statsCache.getCurrentMonthData();
    const summary = statsCache.getSummary();
    const stats = statsCache.getStats();

    // Get aggregated data from ALL archived months + current month
    logger.info('Loading and aggregating all archived months...');
    const { archives, aggregated, totalJobs } = await statsCache.getAllArchivesAggregated();

    return NextResponse.json({
      success: true,
      type: "current",
      currentMonth: {
        month: currentMonthData.month,
        lastUpdated: currentMonthData.lastUpdated,
        jobCount: currentMonthData.jobs.length,
        statistics: currentMonthData.statistics,
        jobs: currentMonthData.jobs, // Include full job data for current month
      },
      summary: {
        totalJobsAllTime: totalJobs, // Use aggregated total
        currentMonth: summary.currentMonth,
        availableArchives: summary.availableArchives,
        overallStatistics: summary.overallStatistics,
      },
      // Aggregated statistics from ALL months (historical + current)
      aggregated: {
        totalJobs: totalJobs,
        statistics: aggregated,
        monthsIncluded: archives.length + 1, // +1 for current month
        archives: archives.map(a => ({
          month: a.month,
          jobCount: a.jobCount,
        })),
      },
      stats: stats,
    });
  } catch (error) {
    logger.error("Error fetching statistics:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch statistics",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
