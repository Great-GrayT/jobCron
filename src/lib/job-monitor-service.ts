import { CronJobResult } from "@/types/job";
import { parseRSSFeeds, filterRecentJobs } from "./rss-parser";
import { formatJobMessage } from "./job-formatter";
import { sendMessagesWithRateLimit } from "./telegram";
import { logger } from "./logger";
import { dailyJobCache } from "./daily-cache";
import { RSS_FEED_URLS, CHECK_INTERVAL_MINUTES, RATE_LIMIT_DELAY_MS } from "@/config/constants";

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

    // Filter for recent jobs
    const recentJobs = filterRecentJobs(allJobs, CHECK_INTERVAL_MINUTES);
    logger.info(`Found ${recentJobs.length} recent jobs (within ${CHECK_INTERVAL_MINUTES} minutes)`);

    // Filter out jobs that have already been sent today (using job title as unique identifier)
    const newJobs = recentJobs.filter(job => !dailyJobCache.hasBeenSent(job.title));
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

    // Mark successfully sent jobs in the cache
    if (sent > 0) {
      const sentJobTitles = newJobs.slice(0, sent).map(job => job.title);
      dailyJobCache.markMultipleAsSent(sentJobTitles);
      logger.info(`Marked ${sent} jobs as sent in daily cache`);
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
