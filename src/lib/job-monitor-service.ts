import { CronJobResult, JobItem } from "@/types/job";
import { parseRSSFeeds, filterRecentJobs } from "./rss-parser";
import { formatJobMessage } from "./job-formatter";
import { sendMessagesWithRateLimit } from "./telegram";
import { logger } from "./logger";
import { dailyJobCache } from "./daily-cache";
import { RSS_FEED_URLS, CHECK_INTERVAL_MINUTES, RATE_LIMIT_DELAY_MS } from "@/config/constants";

/**
 * Deduplicate jobs based on URL
 * A job is considered duplicate if its URL matches an already seen job
 */
function deduplicateJobs(jobs: JobItem[]): JobItem[] {
  const seenUrls = new Set<string>();
  const uniqueJobs: JobItem[] = [];

  for (const job of jobs) {
    const normalizedUrl = job.link.toLowerCase().trim();

    // Skip if URL has been seen before
    if (!seenUrls.has(normalizedUrl)) {
      seenUrls.add(normalizedUrl);
      uniqueJobs.push(job);
    }
  }

  return uniqueJobs;
}

/**
 * Main service for checking RSS feeds and sending job notifications
 */
export async function checkAndSendJobs(): Promise<CronJobResult> {
  logger.info("Starting job check...");

  try {
    // Log cache stats at the start
    const cacheStats = dailyJobCache.getStats();
    logger.info(`Daily cache stats: ${cacheStats.sentCount} jobs sent today (${cacheStats.date})`);

    // Parse all RSS feeds
    const allJobs = await parseRSSFeeds(RSS_FEED_URLS);
    logger.info(`Fetched ${allJobs.length} total jobs from ${RSS_FEED_URLS.length} feeds`);

    // Extract all publication dates from found jobs
    const pubDates = allJobs.map(job => job.pubDate);

    // Deduplicate jobs based on title
    const uniqueJobs = deduplicateJobs(allJobs);
    logger.info(`After deduplication: ${uniqueJobs.length} unique jobs (removed ${allJobs.length - uniqueJobs.length} duplicates)`);

    // Filter for recent jobs
    const recentJobs = filterRecentJobs(uniqueJobs, CHECK_INTERVAL_MINUTES);
    logger.info(`Found ${recentJobs.length} recent jobs (within ${CHECK_INTERVAL_MINUTES} minutes)`);

    // Filter out jobs that have already been sent today (using URL as unique identifier)
    const newJobs = recentJobs.filter(job => !dailyJobCache.hasBeenSent(job.link));
    logger.info(`${newJobs.length} new jobs to send (${recentJobs.length - newJobs.length} already sent today)`);

    // If no new jobs, return early
    if (newJobs.length === 0) {
      return { total: allJobs.length, sent: 0, failed: 0, pubDates };
    }

    // Format all messages
    const messages = newJobs.map(job => formatJobMessage(job));

    // Send messages with rate limiting
    const { sent, failed } = await sendMessagesWithRateLimit(
      messages,
      RATE_LIMIT_DELAY_MS
    );

    // CRITICAL: Only mark SUCCESSFULLY sent jobs in the cache
    // Failed jobs should NOT be cached so they can be retried
    if (sent > 0) {
      const sentJobUrls = newJobs.slice(0, sent).map(job => job.link);
      dailyJobCache.markMultipleAsSent(sentJobUrls);
      logger.info(`Marked ${sent} successfully sent jobs in daily cache`);
    }

    // Log failed jobs for debugging
    if (failed > 0) {
      logger.warn(`${failed} jobs failed to send and will be retried in next run`);
    }

    logger.info(`Job check completed: ${sent} sent, ${failed} failed`);

    return {
      total: allJobs.length,
      sent,
      failed,
      pubDates,
    };
  } catch (error) {
    logger.error("Error in checkAndSendJobs:", error);
    throw error;
  }
}
