import { CronJobResult } from "@/types/job";
import { parseRSSFeeds, filterRecentJobs } from "./rss-parser";
import { formatJobMessage } from "./job-formatter";
import { sendMessagesWithRateLimit } from "./telegram";
import { logger } from "./logger";
import { RSS_FEED_URLS, CHECK_INTERVAL_MINUTES, RATE_LIMIT_DELAY_MS } from "@/config/constants";

/**
 * Main service for checking RSS feeds and sending job notifications
 */
export async function checkAndSendJobs(): Promise<CronJobResult> {
  logger.info("Starting job check...");

  try {
    // Parse all RSS feeds
    const allJobs = await parseRSSFeeds(RSS_FEED_URLS);
    logger.info(`Fetched ${allJobs.length} total jobs from ${RSS_FEED_URLS.length} feeds`);

    // Filter for recent jobs
    const recentJobs = filterRecentJobs(allJobs, CHECK_INTERVAL_MINUTES);
    logger.info(`Found ${recentJobs.length} recent jobs (within ${CHECK_INTERVAL_MINUTES} minutes)`);

    // If no recent jobs, return early
    if (recentJobs.length === 0) {
      return { total: allJobs.length, sent: 0, failed: 0 };
    }

    // Format all messages
    const messages = recentJobs.map(job => formatJobMessage(job));

    // Send messages with rate limiting
    const { sent, failed } = await sendMessagesWithRateLimit(
      messages,
      RATE_LIMIT_DELAY_MS
    );

    logger.info(`Job check completed: ${sent} sent, ${failed} failed`);

    return {
      total: allJobs.length,
      sent,
      failed,
    };
  } catch (error) {
    logger.error("Error in checkAndSendJobs:", error);
    throw error;
  }
}
