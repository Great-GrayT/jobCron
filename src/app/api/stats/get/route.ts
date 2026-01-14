import { NextRequest, NextResponse } from "next/server";
import { JobStatisticsCache, JobStatistic } from "@/lib/job-statistics-cache";
import { validateEnvironmentVariables } from "@/lib/validation";
import { logger } from "@/lib/logger";
import { parseRSSFeeds } from "@/lib/rss-parser";
import { JobMetadataExtractor } from "@/lib/job-metadata-extractor";
import { SalaryExtractor } from "@/lib/salary-extractor";
import { LocationExtractor } from "@/lib/location-extractor";
import { extractJobDetails } from "@/lib/job-analyzer";

// Get RSS Stats Feed URLs from environment (separate from RSS monitor)
const RSS_STATS_FEED_URLS = process.env.RSS_STATS_FEED_URLS
  ? process.env.RSS_STATS_FEED_URLS.split(',').map((url) => url.trim())
  : [];

export const maxDuration = 300; // 5 minutes timeout
export const dynamic = "force-dynamic";

/**
 * GET /api/stats/get
 *
 * Extracts new job data from RSS feeds, updates GitHub Gist, then returns summary statistics
 * This replaces the old behavior of just fetching from gist
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

    // If requesting archived month, skip extraction and just return archived data
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

    // Extract and save new job data from RSS feeds
    logger.info(`Parsing ${RSS_STATS_FEED_URLS.length} RSS feeds...`);
    const allJobs = await parseRSSFeeds(RSS_STATS_FEED_URLS);
    logger.info(`Fetched ${allJobs.length} total jobs from RSS feeds`);

    let newJobsCount = 0;
    let processedCount = 0;

    if (allJobs.length > 0) {
      // Process each job and extract metadata
      for (const rssJob of allJobs) {
        try {
          // Skip if URL is invalid
          if (!rssJob.link || !rssJob.link.includes('http')) {
            logger.warn(`Skipping job with invalid URL: ${rssJob.title}`);
            continue;
          }

          // Extract job details
          const jobDetails = extractJobDetails(rssJob.title);

          let finalCompany = jobDetails.company !== 'N/A' ? jobDetails.company : (rssJob.company || 'Unknown Company');
          let finalPosition = jobDetails.position;
          let extractedLocation = jobDetails.location !== 'N/A' ? jobDetails.location : null;

          // Extract location
          let locationData = { country: null as string | null, city: null as string | null, region: null as 'Europe' | 'America' | 'Middle East' | null };

          if (extractedLocation) {
            locationData = LocationExtractor.extractLocation(
              extractedLocation,
              rssJob.link,
              null,
              ''
            );
          }

          if (!locationData.country && !locationData.city) {
            locationData = LocationExtractor.extractLocation(
              rssJob.title,
              rssJob.link,
              rssJob.location,
              rssJob.description || ''
            );
          }

          const formattedLocation = extractedLocation || LocationExtractor.formatLocation(locationData);

          // Extract metadata
          const metadata = JobMetadataExtractor.extractAllMetadata({
            title: finalPosition,
            company: finalCompany,
            description: rssJob.description || '',
            url: rssJob.link,
          });

          // Extract salary
          const salary = SalaryExtractor.extractSalary(
            rssJob.title,
            rssJob.description || ''
          );

          // Create job statistic object
          const jobStat: JobStatistic = {
            id: metadata.id,
            title: rssJob.title,
            company: finalCompany,
            location: rssJob.location || formattedLocation,
            country: locationData.country,
            city: locationData.city,
            region: locationData.region,
            url: rssJob.link,
            postedDate: rssJob.pubDate,
            extractedDate: new Date().toISOString(),
            keywords: metadata.keywords,
            certificates: metadata.certificates,
            industry: metadata.industry,
            seniority: metadata.seniority,
            description: rssJob.description || '',
            salary: salary,
          };

          // Add to cache
          const beforeCount = statsCache.getCurrentStatistics().totalJobs;
          statsCache.addJob(jobStat);
          const afterCount = statsCache.getCurrentStatistics().totalJobs;

          if (afterCount > beforeCount) {
            newJobsCount++;
          }

          processedCount++;
        } catch (error) {
          logger.error(`Error processing job: ${rssJob.title}`, error);
        }
      }

      // Save to GitHub Gist if there are new jobs
      if (newJobsCount > 0) {
        logger.info(`Saving ${newJobsCount} new jobs to GitHub Gist...`);
        await statsCache.save();
        logger.info(`✓ Successfully saved statistics to GitHub Gist`);
      } else {
        logger.info(`No new jobs to save (all ${processedCount} jobs already exist)`);
      }
    }

    // Return summary data only (no full job details)
    const summary = statsCache.getSummary();
    const stats = statsCache.getStats();

    // Get aggregated data from ALL archived months + current month
    logger.info('Loading and aggregating all archived months...');
    const { archives, aggregated, totalJobs } = await statsCache.getAllArchivesAggregated();

    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} jobs, added ${newJobsCount} new jobs`,
      processed: processedCount,
      newJobs: newJobsCount,
      summary: {
        totalJobsAllTime: totalJobs,
        currentMonth: summary.currentMonth,
        currentMonthJobs: stats.currentMonthJobs,
        availableArchives: summary.availableArchives,
        overallStatistics: summary.overallStatistics,
      },
      aggregated: {
        totalJobs: totalJobs,
        statistics: aggregated,
        monthsIncluded: archives.length + 1,
        archives: archives.map(a => ({
          month: a.month,
          jobCount: a.jobCount,
        })),
      },
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
