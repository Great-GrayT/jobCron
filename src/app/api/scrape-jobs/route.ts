import { NextRequest, NextResponse } from "next/server";
import { scrapeLinkedInJobs, createExcelFile } from "@/lib/linkedin-scraper";
import { sendTelegramFile, sendTelegramMessage } from "@/lib/telegram";
import { logger } from "@/lib/logger";
import { validateEnvironmentVariables } from "@/lib/validation";

export const maxDuration = 300; // 5 minutes timeout for Vercel
export const dynamic = "force-dynamic";

interface ScrapeRequest {
  searchText: string;
  locationText: string;
  timeFilter?: number;
}

/**
 * GET endpoint for triggering LinkedIn job scraping via URL
 * Example: /api/scrape-jobs?search=CFA,Financial+Analyst&countries=United+States,Canada&timeFilter=604800
 */
export async function GET(request: NextRequest) {
  logger.info("LinkedIn job scraping started (GET)");

  try {
    // Validate environment variables
    validateEnvironmentVariables();

    // Parse URL parameters
    const searchParams = request.nextUrl.searchParams;
    const searchText = searchParams.get("search") || searchParams.get("searchText") || "";
    const locationText = searchParams.get("countries") || searchParams.get("locationText") || "";
    const timeFilter = parseInt(searchParams.get("timeFilter") || "604800");

    if (!searchText || !locationText) {
      return NextResponse.json(
        { error: "search and countries parameters are required" },
        { status: 400 }
      );
    }

    logger.info(`Scraping jobs for: "${searchText}" in "${locationText}"`);

    // Scrape jobs from LinkedIn
    const jobs = await scrapeLinkedInJobs({
      searchText,
      locationText,
      timeFilter,
    });

    if (jobs.length === 0) {
      logger.info("No jobs found");
      await sendTelegramMessage(
        `🔍 LinkedIn Job Scrape Complete\n\nSearch: "${searchText}"\nLocations: ${locationText}\n\nℹ️ No jobs found matching the criteria.`
      );

      return NextResponse.json({
        success: true,
        message: "No jobs found",
        jobCount: 0,
      });
    }

    // Create Excel file
    logger.info(`Creating Excel file with ${jobs.length} jobs`);
    const excelBuffer = await createExcelFile(jobs);

    // Generate filename
    const timestamp = new Date().toISOString().split("T")[0];
    const countries = [...new Set(jobs.map((job) => job.searchCountry))];
    const keywords = [...new Set(jobs.map((job) => job.inputKeyword))];
    const filename = `linkedin_jobs_${jobs.length}_${keywords.length}keywords_${countries.length}countries_${timestamp}.xlsx`;

    // Send to Telegram
    logger.info("Sending Excel file to Telegram");
    const caption = `📊 LinkedIn Job Scrape Complete\n\nKeywords: ${keywords.join(", ")}\nLocations: ${locationText}\n\n✅ Found ${jobs.length} unique jobs across ${countries.length} countries:\n${countries.map((c) => `  • ${c}: ${jobs.filter((j) => j.searchCountry === c).length} jobs`).join("\n")}`;

    await sendTelegramFile(excelBuffer, filename, caption);

    logger.info("LinkedIn job scraping completed successfully");

    return NextResponse.json({
      success: true,
      message: "Jobs scraped and sent to Telegram",
      jobCount: jobs.length,
      keywords: keywords,
      countries: countries,
      filename,
    });
  } catch (error) {
    logger.error("Error during LinkedIn scraping:", error);

    // Try to send error notification to Telegram
    try {
      await sendTelegramMessage(
        `❌ LinkedIn Job Scrape Failed\n\nError: ${error instanceof Error ? error.message : String(error)}`
      );
    } catch (telegramError) {
      logger.error("Failed to send error notification to Telegram:", telegramError);
    }

    return NextResponse.json(
      {
        error: "Failed to scrape jobs",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for triggering LinkedIn job scraping (backward compatibility)
 */
export async function POST(request: NextRequest) {
  logger.info("LinkedIn job scraping started (POST)");

  try {
    // Validate environment variables
    validateEnvironmentVariables();

    // Parse request body
    const body: ScrapeRequest = await request.json();

    const { searchText, locationText, timeFilter = 604800 } = body;

    if (!searchText || !locationText) {
      return NextResponse.json(
        { error: "searchText and locationText are required" },
        { status: 400 }
      );
    }

    logger.info(`Scraping jobs for: "${searchText}" in "${locationText}"`);

    // Scrape jobs from LinkedIn
    const jobs = await scrapeLinkedInJobs({
      searchText,
      locationText,
      timeFilter,
    });

    if (jobs.length === 0) {
      logger.info("No jobs found");
      await sendTelegramMessage(
        `🔍 LinkedIn Job Scrape Complete\n\nSearch: "${searchText}"\nLocations: ${locationText}\n\nℹ️ No jobs found matching the criteria.`
      );

      return NextResponse.json({
        success: true,
        message: "No jobs found",
        jobCount: 0,
      });
    }

    // Create Excel file
    logger.info(`Creating Excel file with ${jobs.length} jobs`);
    const excelBuffer = await createExcelFile(jobs);

    // Generate filename
    const timestamp = new Date().toISOString().split("T")[0];
    const countries = [...new Set(jobs.map((job) => job.searchCountry))];
    const keywords = [...new Set(jobs.map((job) => job.inputKeyword))];
    const filename = `linkedin_jobs_${jobs.length}_${keywords.length}keywords_${countries.length}countries_${timestamp}.xlsx`;

    // Send to Telegram
    logger.info("Sending Excel file to Telegram");
    const caption = `📊 LinkedIn Job Scrape Complete\n\nKeywords: ${keywords.join(", ")}\nLocations: ${locationText}\n\n✅ Found ${jobs.length} unique jobs across ${countries.length} countries:\n${countries.map((c) => `  • ${c}: ${jobs.filter((j) => j.searchCountry === c).length} jobs`).join("\n")}`;

    await sendTelegramFile(excelBuffer, filename, caption);

    logger.info("LinkedIn job scraping completed successfully");

    return NextResponse.json({
      success: true,
      message: "Jobs scraped and sent to Telegram",
      jobCount: jobs.length,
      keywords: keywords,
      countries: countries,
      filename,
    });
  } catch (error) {
    logger.error("Error during LinkedIn scraping:", error);

    // Try to send error notification to Telegram
    try {
      await sendTelegramMessage(
        `❌ LinkedIn Job Scrape Failed\n\nError: ${error instanceof Error ? error.message : String(error)}`
      );
    } catch (telegramError) {
      logger.error("Failed to send error notification to Telegram:", telegramError);
    }

    return NextResponse.json(
      {
        error: "Failed to scrape jobs",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
