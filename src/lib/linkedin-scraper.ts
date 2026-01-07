import puppeteer, { Browser, Page } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import ExcelJS from "exceljs";
import { logger } from "./logger";

export interface LinkedInJob {
  id: string;
  title: string;
  company: string;
  location: string;
  searchCountry: string;
  currency: string;
  domain: string;
  postedDate: string;
  postedTimeAgo: string;
  description: string;
  url: string;
  inputKeyword: string;
  companyUrl?: string;
  img?: string;
  earlyApplicant?: boolean;
  compensation?: string;
  recruiterName?: string;
  recruiterRole?: string;
  detailedDescription?: string;
}

export interface ScrapeParams {
  searchText: string;
  locationText: string;
  timeFilter?: number; // in seconds
}

interface CountryConfig {
  domain: string;
  locationParam: string;
  currency: string;
  language: string;
}

const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  "United States": {
    domain: "linkedin.com",
    locationParam: "United States",
    currency: "USD",
    language: "en-US,en;q=0.9",
  },
  "United Kingdom": {
    domain: "linkedin.com",
    locationParam: "United Kingdom",
    currency: "GBP",
    language: "en-GB,en;q=0.9",
  },
  Ireland: {
    domain: "linkedin.com",
    locationParam: "Ireland",
    currency: "EUR",
    language: "en-IE,en;q=0.9",
  },
  Canada: {
    domain: "linkedin.com",
    locationParam: "Canada",
    currency: "CAD",
    language: "en-CA,en;q=0.9,fr-CA,fr;q=0.8",
  },
  Germany: {
    domain: "linkedin.com",
    locationParam: "Germany",
    currency: "EUR",
    language: "de-DE,de;q=0.9,en;q=0.8",
  },
  France: {
    domain: "linkedin.com",
    locationParam: "France",
    currency: "EUR",
    language: "fr-FR,fr;q=0.9,en;q=0.8",
  },
  Australia: {
    domain: "linkedin.com",
    locationParam: "Australia",
    currency: "AUD",
    language: "en-AU,en;q=0.9",
  },
  Netherlands: {
    domain: "linkedin.com",
    locationParam: "Netherlands",
    currency: "EUR",
    language: "nl-NL,nl;q=0.9,en;q=0.8",
  },
  Luxembourg: {
    domain: "linkedin.com",
    locationParam: "Luxembourg",
    currency: "EUR",
    language: "fr-LU,fr;q=0.9,de-LU,de;q=0.8,en;q=0.7",
  },
  Belgium: {
    domain: "linkedin.com",
    locationParam: "Belgium",
    currency: "EUR",
    language: "nl-BE,nl;q=0.9,fr-BE,fr;q=0.8,en;q=0.7",
  },
  Switzerland: {
    domain: "linkedin.com",
    locationParam: "Switzerland",
    currency: "CHF",
    language: "de-CH,de;q=0.9,fr-CH,fr;q=0.8,en;q=0.7",
  },
  Spain: {
    domain: "linkedin.com",
    locationParam: "Spain",
    currency: "EUR",
    language: "es-ES,es;q=0.9,en;q=0.8",
  },
  Italy: {
    domain: "linkedin.com",
    locationParam: "Italy",
    currency: "EUR",
    language: "it-IT,it;q=0.9,en;q=0.8",
  },
};

function buildJobSearchUrl(
  searchParams: ScrapeParams & { pageNumber: number },
  countryConfig?: CountryConfig
): string {
  const domain = countryConfig ? countryConfig.domain : "linkedin.com";
  const timeFilter = searchParams.timeFilter || 86400; // Default to 24 hours

  return `https://${domain}/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(
    searchParams.searchText
  )}&start=${searchParams.pageNumber * 25}${
    searchParams.locationText
      ? "&location=" + encodeURIComponent(searchParams.locationText)
      : ""
  }&f_TPR=r${timeFilter}`;
}

async function scrapeJobsFromPage(page: Page): Promise<LinkedInJob[]> {
  return await page.evaluate(() => {
    const collection = document.body.children;
    const results: LinkedInJob[] = [];

    for (let i = 0; i < collection.length; i++) {
      try {
        const item = collection.item(i);
        if (!item) continue;

        const titleElem = item.getElementsByClassName("base-search-card__title")[0];
        if (!titleElem) continue;

        const title = titleElem.textContent?.trim() || "";
        const imgSrc =
          item.getElementsByTagName("img")[0]?.getAttribute("data-delayed-url") || "";

        const linkElem = (
          item.getElementsByClassName("base-card__full-link")[0] ||
          item.getElementsByClassName("base-search-card--link")[0]
        ) as HTMLAnchorElement;

        const url = linkElem?.href || "";

        const companyContainer = item.getElementsByClassName(
          "base-search-card__subtitle"
        )[0];

        const companyUrl =
          companyContainer?.getElementsByTagName("a")[0]?.href || "";
        const companyName = companyContainer?.textContent?.trim() || "";
        const companyLocation = item
          .getElementsByClassName("job-search-card__location")[0]
          ?.textContent?.trim() || "";

        const dateTimeElem = (
          item.getElementsByClassName("job-search-card__listdate")[0] ||
          item.getElementsByClassName("job-search-card__listdate--new")[0]
        ) as HTMLElement;

        const dateTime = dateTimeElem?.getAttribute("datetime") || "";
        const postedTimeAgo = dateTimeElem?.textContent?.trim() || "";

        const toDate = (dateString: string) => {
          const [year, month, day] = dateString.split("-");
          return new Date(
            parseFloat(year),
            parseFloat(month) - 1,
            parseFloat(day)
          );
        };

        const postedDate = dateTime ? toDate(dateTime).toISOString() : "";

        const descriptionElem = item.getElementsByClassName(
          "job-search-card__snippet"
        )[0];
        const description = descriptionElem?.textContent?.trim() || "";

        // Check for early applicant badge
        const earlyApplicantElem = item.getElementsByClassName("job-posting-benefits__text")[0];
        const earlyApplicant = earlyApplicantElem?.textContent?.toLowerCase().includes("early applicant") || false;

        const result: LinkedInJob = {
          id: item.children[0]?.getAttribute("data-entity-urn") || `job-${i}`,
          title,
          company: companyName,
          location: companyLocation,
          searchCountry: "",
          currency: "",
          domain: "",
          inputKeyword: "", // Will be set later
          postedDate,
          postedTimeAgo,
          description,
          url,
          companyUrl,
          img: imgSrc,
          earlyApplicant,
        };

        results.push(result);
      } catch (e) {
        console.error(`Error retrieving linkedin page item: ${i}`, e);
      }
    }
    return results;
  });
}

export async function scrapeLinkedInJobs(params: ScrapeParams): Promise<LinkedInJob[]> {
  const MAX_PAGES = 10; // Reduced for faster execution
  let allJobs: LinkedInJob[] = [];

  // Parse search keywords (comma-separated)
  const searchKeywords = params.searchText
    .split(",")
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);

  const countries = params.locationText
    .split(",")
    .map((country) => country.trim())
    .filter((country) => country.length > 0);

  logger.info(`Starting LinkedIn scrape for ${searchKeywords.length} keywords: "${searchKeywords.join('", "')}" across ${countries.length} countries`);

  let browser: Browser | null = null;

  try {
    // Check if running in production (Vercel) or local development
    const isProduction = process.env.VERCEL || process.env.NODE_ENV === "production";

    if (isProduction) {
      // Use @sparticuz/chromium for serverless environments (Vercel)
      logger.info("Launching browser for production (serverless)");

      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    } else {
      // Use local Chrome/Chromium for development
      logger.info("Launching browser for local development");

      const chromePaths = [
        process.env.CHROME_PATH,
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
      ].filter(Boolean) as string[];

      let executablePath: string | undefined;
      const fs = await import("fs");

      for (const path of chromePaths) {
        if (fs.existsSync(path)) {
          executablePath = path;
          logger.info(`Found Chrome at: ${path}`);
          break;
        }
      }

      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--disable-gpu",
          "--disable-dev-shm-usage",
          "--disable-setuid-sandbox",
          "--no-sandbox",
        ],
        executablePath,
      });
    }

    // Iterate through each keyword
    for (let keywordIndex = 0; keywordIndex < searchKeywords.length; keywordIndex++) {
      const currentKeyword = searchKeywords[keywordIndex];
      logger.info(`\n=== Keyword ${keywordIndex + 1}/${searchKeywords.length}: "${currentKeyword}" ===`);

      // For each keyword, search across all countries
      for (let countryIndex = 0; countryIndex < countries.length; countryIndex++) {
        const currentCountry = countries[countryIndex];
        const countryConfig = COUNTRY_CONFIGS[currentCountry];

        logger.info(`  Scraping country ${countryIndex + 1}/${countries.length}: ${currentCountry}`);

        const page = await browser.newPage();

        if (countryConfig) {
          await page.setExtraHTTPHeaders({
            "Accept-Language": countryConfig.language,
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          });
        }

        for (let currentPage = 0; currentPage < MAX_PAGES; currentPage++) {
          const url = buildJobSearchUrl(
            { searchText: currentKeyword, locationText: countryConfig?.locationParam || currentCountry, timeFilter: params.timeFilter, pageNumber: currentPage },
            countryConfig
          );

          logger.info(`    Page ${currentPage + 1}: ${url}`);

          try {
            await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for content to load

            const jobs = await scrapeJobsFromPage(page);

            if (!jobs || jobs.length === 0) {
              logger.info(`    No jobs found on page ${currentPage + 1}, moving to next country`);
              break;
            }

            // Add metadata including the input keyword
            const jobsWithMetadata = jobs.map((job) => ({
              ...job,
              searchCountry: currentCountry,
              currency: countryConfig?.currency || "USD",
              domain: countryConfig?.domain || "linkedin.com",
              inputKeyword: currentKeyword,
            }));

            allJobs.push(...jobsWithMetadata);
            logger.info(`    Found ${jobs.length} jobs on this page (total: ${allJobs.length})`);
          } catch (err) {
            logger.error(`    Error on page ${currentPage + 1}:`, err);
            break;
          }
        }

        await page.close();

        // Wait between countries
        if (countryIndex < countries.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      // Wait between keywords
      if (keywordIndex < searchKeywords.length - 1) {
        logger.info(`\nWaiting 5 seconds before next keyword...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  } catch (error) {
    logger.error("Browser error during scraping:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Remove duplicates based on job URL
  const seenUrls = new Set<string>();
  const uniqueJobs: LinkedInJob[] = [];

  for (const job of allJobs) {
    const normalizedUrl = job.url.toLowerCase().trim();
    if (!seenUrls.has(normalizedUrl)) {
      seenUrls.add(normalizedUrl);
      uniqueJobs.push(job);
    }
  }

  logger.info(`Total jobs found: ${allJobs.length}`);
  logger.info(`Unique jobs (after removing ${allJobs.length - uniqueJobs.length} duplicates by URL): ${uniqueJobs.length}`);

  return uniqueJobs;
}

export async function createExcelFile(jobs: LinkedInJob[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Job Listings");

  // Define columns
  worksheet.columns = [
    { header: "Input Keyword", key: "inputKeyword", width: 20 },
    { header: "Title", key: "title", width: 30 },
    { header: "Company", key: "company", width: 25 },
    { header: "Location", key: "location", width: 20 },
    { header: "Country", key: "searchCountry", width: 15 },
    { header: "Currency", key: "currency", width: 10 },
    { header: "Posted Date", key: "postedDate", width: 15 },
    { header: "Posted Time Ago", key: "postedTimeAgo", width: 20 },
    { header: "Early Applicant", key: "earlyApplicant", width: 15 },
    { header: "Description", key: "description", width: 40 },
    { header: "URL", key: "url", width: 50 },
    { header: "Company URL", key: "companyUrl", width: 50 },
  ];

  // Add data rows
  jobs.forEach((job) => {
    worksheet.addRow({
      inputKeyword: job.inputKeyword,
      title: job.title,
      company: job.company,
      location: job.location,
      searchCountry: job.searchCountry,
      currency: job.currency,
      postedDate: job.postedDate ? new Date(job.postedDate).toLocaleDateString("en-GB") : "",
      postedTimeAgo: job.postedTimeAgo,
      earlyApplicant: job.earlyApplicant ? "Yes" : "No",
      description: job.description,
      url: job.url,
      companyUrl: job.companyUrl || "",
    });
  });

  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4A90E2" },
  };

  // Auto-filter
  worksheet.autoFilter = "A1:L1";

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
