import axios from "axios";
import * as cheerio from "cheerio";
import ExcelJS from "exceljs";
import { logger } from "./logger";
import { ProgressEmitter } from "./progress-emitter";

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

async function scrapeJobsFromHtml(html: string): Promise<LinkedInJob[]> {
  const $ = cheerio.load(html);
  const results: LinkedInJob[] = [];

  // LinkedIn job cards are typically in <li> elements
  $("li").each((i, element) => {
    try {
      const $item = $(element);

      // Check if this is a job card by looking for the title
      const titleElem = $item.find(".base-search-card__title");
      if (!titleElem.length) return;

      const title = titleElem.text().trim();
      const imgSrc = $item.find("img").attr("data-delayed-url") || "";

      // Try multiple selectors to find the job URL
      let url = "";
      const linkSelectors = [
        ".base-card__full-link",
        ".base-search-card--link",
        "a[href*='/jobs/view/']",
        "a.base-card__full-link",
        "a",
      ];

      for (const selector of linkSelectors) {
        const link = $item.find(selector).first().attr("href");
        if (link && link.includes("/jobs")) {
          url = link.trim();
          break;
        }
      }

      // If still no URL, try to find any anchor tag
      if (!url) {
        $item.find("a").each((_, anchor) => {
          const href = $(anchor).attr("href");
          if (href && (href.includes("/jobs") || href.includes("linkedin.com"))) {
            url = href.trim();
            return false; // Break the loop
          }
        });
      }

      const companyContainer = $item.find(".base-search-card__subtitle");
      const companyUrl = companyContainer.find("a").attr("href") || "";
      const companyName = companyContainer.text().trim();

      const companyLocation = $item.find(".job-search-card__location").text().trim();

      const dateTimeElem = $item.find(".job-search-card__listdate, .job-search-card__listdate--new");
      const dateTime = dateTimeElem.attr("datetime") || "";
      const postedTimeAgo = dateTimeElem.text().trim();

      const toDate = (dateString: string) => {
        const [year, month, day] = dateString.split("-");
        return new Date(
          parseFloat(year),
          parseFloat(month) - 1,
          parseFloat(day)
        );
      };

      const postedDate = dateTime ? toDate(dateTime).toISOString() : "";

      const description = $item.find(".job-search-card__snippet").text().trim();

      // Check for early applicant badge
      const earlyApplicantText = $item.find(".job-posting-benefits__text").text().toLowerCase();
      const earlyApplicant = earlyApplicantText.includes("early applicant");

      const entityUrn = $item.children().first().attr("data-entity-urn") || `job-${i}`;

      const result: LinkedInJob = {
        id: entityUrn,
        title,
        company: companyName,
        location: companyLocation,
        searchCountry: "",
        currency: "",
        domain: "",
        inputKeyword: "",
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
      logger.error(`Error retrieving linkedin page item: ${i}`, e);
    }
  });

  return results;
}

export async function scrapeLinkedInJobs(
  params: ScrapeParams,
  progressEmitter?: ProgressEmitter
): Promise<LinkedInJob[]> {
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

  const logMessage = `Starting LinkedIn scrape for ${searchKeywords.length} keywords: "${searchKeywords.join('", "')}" across ${countries.length} countries`;
  logger.info(logMessage);
  progressEmitter?.progress('initialization', logMessage, 0, searchKeywords.length * countries.length);

  try {
    // Iterate through each keyword
    for (let keywordIndex = 0; keywordIndex < searchKeywords.length; keywordIndex++) {
      const currentKeyword = searchKeywords[keywordIndex];
      const keywordMessage = `\n=== Keyword ${keywordIndex + 1}/${searchKeywords.length}: "${currentKeyword}" ===`;
      logger.info(keywordMessage);
      progressEmitter?.progress('scraping', keywordMessage, keywordIndex, searchKeywords.length);

      // For each keyword, search across all countries
      for (let countryIndex = 0; countryIndex < countries.length; countryIndex++) {
        const currentCountry = countries[countryIndex];
        const countryConfig = COUNTRY_CONFIGS[currentCountry];

        const countryMessage = `  Scraping country ${countryIndex + 1}/${countries.length}: ${currentCountry}`;
        logger.info(countryMessage);

        const totalCombinations = searchKeywords.length * countries.length;
        const currentCombination = keywordIndex * countries.length + countryIndex;

        progressEmitter?.progress('scraping', countryMessage, currentCombination, totalCombinations);

        for (let currentPage = 0; currentPage < MAX_PAGES; currentPage++) {
          const url = buildJobSearchUrl(
            { searchText: currentKeyword, locationText: countryConfig?.locationParam || currentCountry, timeFilter: params.timeFilter, pageNumber: currentPage },
            countryConfig
          );

          const pageMessage = `    Page ${currentPage + 1}: ${url}`;
          logger.info(pageMessage);
          progressEmitter?.progress('scraping', pageMessage, currentCombination, totalCombinations);

          try {
            // Fetch the page HTML using axios
            const response = await axios.get(url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": countryConfig?.language || "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
              },
              timeout: 30000,
            });

            const jobs = await scrapeJobsFromHtml(response.data);

            if (!jobs || jobs.length === 0) {
              const noJobsMessage = `    No jobs found on page ${currentPage + 1}, moving to next country`;
              logger.info(noJobsMessage);
              progressEmitter?.progress('scraping', noJobsMessage, currentCombination, totalCombinations);
              break;
            }

            // Add metadata including the input keyword
            const jobsWithMetadata = jobs.map((job: LinkedInJob) => ({
              ...job,
              searchCountry: currentCountry,
              currency: countryConfig?.currency || "USD",
              domain: countryConfig?.domain || "linkedin.com",
              inputKeyword: currentKeyword,
            }));

            allJobs.push(...jobsWithMetadata);
            const foundJobsMessage = `    Found ${jobs.length} jobs on this page (total: ${allJobs.length})`;
            logger.info(foundJobsMessage);
            progressEmitter?.progress('scraping', foundJobsMessage, currentCombination, totalCombinations);

            // Small delay between page requests
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (err) {
            logger.error(`    Error on page ${currentPage + 1}:`, err);
            break;
          }
        }

        // Wait between countries
        if (countryIndex < countries.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      // Wait between keywords
      if (keywordIndex < searchKeywords.length - 1) {
        logger.info(`\nWaiting 3 seconds before next keyword...`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  } catch (error) {
    logger.error("Error during scraping:", error);
    throw error;
  }

  // Remove duplicates based on job URL
  // Only consider URLs that contain "http" as valid
  const seenUrls = new Set<string>();
  const uniqueJobs: LinkedInJob[] = [];
  let invalidUrlCount = 0;
  let duplicateCount = 0;

  for (const job of allJobs) {
    const normalizedUrl = job.url.toLowerCase().trim();

    // Skip jobs with invalid URLs (must contain http)
    if (!normalizedUrl.includes('http')) {
      invalidUrlCount++;
      logger.warn(`Skipping job with invalid URL: "${job.url}" - ${job.title}`);
      continue;
    }

    if (!seenUrls.has(normalizedUrl)) {
      seenUrls.add(normalizedUrl);
      uniqueJobs.push(job);
    } else {
      duplicateCount++;
    }
  }

  const totalMessage = `Total jobs scraped: ${allJobs.length}`;
  const invalidMessage = `Invalid URLs skipped: ${invalidUrlCount}`;
  const duplicateMessage = `Duplicate jobs removed: ${duplicateCount}`;
  const uniqueMessage = `Unique jobs remaining: ${uniqueJobs.length}`;

  logger.info(totalMessage);
  logger.info(invalidMessage);
  logger.info(duplicateMessage);
  logger.info(uniqueMessage);

  progressEmitter?.progress('deduplication', totalMessage);
  progressEmitter?.progress('deduplication', invalidMessage);
  progressEmitter?.progress('deduplication', duplicateMessage);
  progressEmitter?.progress('deduplication', uniqueMessage);

  progressEmitter?.complete(
    'complete',
    `Found ${uniqueJobs.length} unique jobs (${duplicateCount} duplicates removed, ${invalidUrlCount} invalid URLs skipped)`,
    {
      totalScraped: allJobs.length,
      uniqueJobs: uniqueJobs.length,
      duplicates: duplicateCount,
      invalidUrls: invalidUrlCount,
    }
  );

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
