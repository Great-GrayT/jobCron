import { NextRequest, NextResponse } from "next/server";
import { parseRSSFeeds } from "@/lib/rss-parser";
import { JobStatisticsCache, JobStatistic } from "@/lib/job-statistics-cache";
import { JobMetadataExtractor } from "@/lib/job-metadata-extractor";
import { validateEnvironmentVariables } from "@/lib/validation";
import { logger } from "@/lib/logger";

// Get RSS Stats Feed URLs from environment (separate from RSS monitor)
const RSS_STATS_FEED_URLS = process.env.RSS_STATS_FEED_URLS
  ? process.env.RSS_STATS_FEED_URLS.split(',').map((url) => url.trim())
  : [];

export const maxDuration = 300; // 5 minutes timeout
export const dynamic = "force-dynamic";

/**
 * GET /api/stats/extract-and-save
 *
 * Extracts job data from RSS feeds, analyzes metadata, and saves to GitHub Gist
 * This endpoint can be called manually or via cron
 */
export async function GET(request: NextRequest) {
  logger.info("Statistics extraction started");

  try {
    // Validate environment variables
    validateEnvironmentVariables();

    // Initialize statistics cache
    const statsCache = new JobStatisticsCache();
    await statsCache.load();

    logger.info(`Loaded statistics cache: ${statsCache.getStats().currentMonthJobs} jobs in current month`);

    // Parse all RSS feeds
    logger.info(`Parsing ${RSS_STATS_FEED_URLS.length} RSS feeds...`);
    const allJobs = await parseRSSFeeds(RSS_STATS_FEED_URLS);
    logger.info(`Fetched ${allJobs.length} total jobs from RSS feeds`);

    if (allJobs.length === 0) {
      logger.info("No jobs found in RSS feeds");
      return NextResponse.json({
        success: true,
        message: "No jobs found in RSS feeds",
        processed: 0,
        newJobs: 0,
      });
    }

    // Process each job and extract metadata
    let processedCount = 0;
    let newJobsCount = 0;

    for (const rssJob of allJobs) {
      try {
        // Skip if URL is invalid
        if (!rssJob.link || !rssJob.link.includes('http')) {
          logger.warn(`Skipping job with invalid URL: ${rssJob.title}`);
          continue;
        }

        // Extract metadata
        const metadata = JobMetadataExtractor.extractAllMetadata({
          title: rssJob.title,
          company: rssJob.company || 'Unknown Company',
          description: rssJob.description || '',
          url: rssJob.link,
        });

        // Create job statistic object
        const jobStat: JobStatistic = {
          id: metadata.id,
          title: rssJob.title,
          company: rssJob.company || 'Unknown Company',
          location: rssJob.location || 'Unknown Location',
          url: rssJob.link,
          postedDate: rssJob.pubDate,
          extractedDate: new Date().toISOString(),
          keywords: metadata.keywords,
          certificates: metadata.certificates,
          industry: metadata.industry,
          seniority: metadata.seniority,
          description: rssJob.description || '',
        };

        // Add to cache (will skip if already exists)
        const beforeCount = statsCache.getCurrentStatistics().totalJobs;
        statsCache.addJob(jobStat);
        const afterCount = statsCache.getCurrentStatistics().totalJobs;

        if (afterCount > beforeCount) {
          newJobsCount++;
        }

        processedCount++;
      } catch (error) {
        logger.error(`Error processing job: ${rssJob.title}`, error);
        // Continue with next job
      }
    }

    // Save to GitHub Gist
    if (newJobsCount > 0) {
      logger.info(`Saving ${newJobsCount} new jobs to GitHub Gist...`);
      await statsCache.save();
      logger.info(`✓ Successfully saved statistics to GitHub Gist`);
    } else {
      logger.info(`No new jobs to save (all ${processedCount} jobs already exist in current month)`);
    }

    // Get final statistics
    const finalStats = statsCache.getStats();
    const currentStats = statsCache.getCurrentStatistics();

    logger.info("Statistics extraction completed successfully");

    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} jobs, added ${newJobsCount} new jobs`,
      processed: processedCount,
      newJobs: newJobsCount,
      currentMonth: finalStats.currentMonth,
      currentMonthTotal: finalStats.currentMonthJobs,
      totalAllTime: finalStats.totalJobsAllTime,
      statistics: {
        byIndustry: currentStats.byIndustry,
        byCertificate: currentStats.byCertificate,
        bySeniority: currentStats.bySeniority,
        topKeywords: Object.entries(currentStats.byKeyword)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    logger.error("Error during statistics extraction:", error);

    return NextResponse.json(
      {
        error: "Failed to extract and save statistics",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for manual triggering (same as GET)
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
