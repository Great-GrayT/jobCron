import { NextRequest } from "next/server";
import { scrapeLinkedInJobs, createExcelFile } from "@/lib/linkedin-scraper";
import { sendTelegramFile, sendTelegramMessage } from "@/lib/telegram";
import { logger } from "@/lib/logger";
import { validateEnvironmentVariables } from "@/lib/validation";
import { ProgressEmitter } from "@/lib/progress-emitter";

export const maxDuration = 300; // 5 minutes timeout for Vercel
export const dynamic = "force-dynamic";

/**
 * GET endpoint for streaming LinkedIn job scraping progress via Server-Sent Events
 * Example: /api/scrape-jobs-stream?search=CFA&countries=United+States,Canada&timeFilter=604800
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Create a TransformStream for SSE
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Helper function to send SSE messages
  const sendEvent = async (event: string, data: any) => {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    await writer.write(encoder.encode(message));
  };

  // Start the async process
  (async () => {
    try {
      await sendEvent("log", { message: "LinkedIn job scraping started", timestamp: new Date().toISOString() });

      // Validate environment variables
      validateEnvironmentVariables();

      // Parse URL parameters
      const searchParams = request.nextUrl.searchParams;
      const searchText = searchParams.get("search") || searchParams.get("searchText") || "";
      const locationText = searchParams.get("countries") || searchParams.get("locationText") || "";
      const timeFilter = parseInt(searchParams.get("timeFilter") || "604800");

      if (!searchText || !locationText) {
        await sendEvent("error", { message: "search and countries parameters are required" });
        await writer.close();
        return;
      }

      await sendEvent("log", { message: `Scraping jobs for: "${searchText}" in "${locationText}"`, timestamp: new Date().toISOString() });

      // Create progress emitter for real-time updates
      const progressEmitter = new ProgressEmitter();

      // Subscribe to progress updates and stream them to the client
      progressEmitter.subscribe((update) => {
        sendEvent("log", {
          message: update.message,
          timestamp: new Date().toISOString(),
          stage: update.stage,
          percentage: update.percentage,
        });
      });

      // Scrape jobs from LinkedIn
      const jobs = await scrapeLinkedInJobs({
        searchText,
        locationText,
        timeFilter,
      }, progressEmitter);

      if (jobs.length === 0) {
        await sendEvent("log", { message: "No jobs found", timestamp: new Date().toISOString() });
        await sendTelegramMessage(
          `🔍 LinkedIn Job Scrape Complete\n\nSearch: "${searchText}"\nLocations: ${locationText}\n\nℹ️ No jobs found matching the criteria.`
        );

        await sendEvent("complete", {
          success: true,
          message: "No jobs found",
          jobCount: 0,
        });
        await writer.close();
        return;
      }

      // Create Excel file
      const excelMessage = `Creating Excel file with ${jobs.length} jobs`;
      await sendEvent("log", { message: excelMessage, timestamp: new Date().toISOString() });
      const excelBuffer = await createExcelFile(jobs);

      // Generate filename
      const timestamp = new Date().toISOString().split("T")[0];
      const countries = [...new Set(jobs.map((job) => job.searchCountry))];
      const keywords = [...new Set(jobs.map((job) => job.inputKeyword))];
      const filename = `linkedin_jobs_${jobs.length}_${keywords.length}keywords_${countries.length}countries_${timestamp}.xlsx`;

      // Send to Telegram
      const telegramMessage = "Sending Excel file to Telegram";
      await sendEvent("log", { message: telegramMessage, timestamp: new Date().toISOString() });
      const caption = `📊 LinkedIn Job Scrape Complete\n\nKeywords: ${keywords.join(", ")}\nLocations: ${locationText}\n\n✅ Found ${jobs.length} unique jobs across ${countries.length} countries:\n${countries.map((c) => `  • ${c}: ${jobs.filter((j) => j.searchCountry === c).length} jobs`).join("\n")}`;

      await sendTelegramFile(excelBuffer, filename, caption);

      const completedMessage = "LinkedIn job scraping completed successfully";
      await sendEvent("log", { message: completedMessage, timestamp: new Date().toISOString() });

      // Send final completion event
      await sendEvent("complete", {
        success: true,
        message: "Jobs scraped and sent to Telegram",
        jobCount: jobs.length,
        keywords: keywords,
        countries: countries,
        filename,
      });

      await writer.close();
    } catch (error) {
      logger.error("Error during LinkedIn scraping:", error);

      await sendEvent("error", {
        message: error instanceof Error ? error.message : String(error),
      });

      // Try to send error notification to Telegram
      try {
        await sendTelegramMessage(
          `❌ LinkedIn Job Scrape Failed\n\nError: ${error instanceof Error ? error.message : String(error)}`
        );
      } catch (telegramError) {
        logger.error("Failed to send error notification to Telegram:", telegramError);
      }

      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
