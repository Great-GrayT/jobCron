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
  timeFilter?: number; // seconds
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

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function buildJobSearchUrl(
  searchParams: ScrapeParams & { pageNumber: number },
  countryConfig?: CountryConfig
): string {
  const domain = countryConfig ? countryConfig.domain : "linkedin.com";
  const timeFilter = searchParams.timeFilter ?? 86400; // 24h default

  return `https://${domain}/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(
    searchParams.searchText
  )}&start=${searchParams.pageNumber * 25}${
    searchParams.locationText
      ? "&location=" + encodeURIComponent(searchParams.locationText)
      : ""
  }&f_TPR=r${timeFilter}`;
}

async function scrapeJobsFromPage(page: Page): Promise<LinkedInJob[]> {
  const raw = await page.evaluate(() => {
    const collection = document.body?.children ?? [];
    const results: LinkedInJob[] = [];

    for (let i = 0; i < collection.length; i++) {
      try {
        const item = collection.item(i) as HTMLElement | null;
        if (!item) continue;

        const titleElem = item.getElementsByClassName("base-search-card__title")[0];
        if (!titleElem) continue;

        const title = titleElem.textContent?.trim() || "";

        const imgSrc =
          item.getElementsByTagName("img")[0]?.getAttribute("data-delayed-url") ||
          item.getElementsByTagName("img")[0]?.getAttribute("src") ||
          "";

        const linkElem = (item.getElementsByClassName("base-card__full-link")[0] ||
          item.getElementsByClassName("base-search-card--link")[0]) as HTMLAnchorElement | undefined;

        const url = linkElem?.href || "";

        const companyContainer = item.getElementsByClassName("base-search-card__subtitle")[0];

        const companyUrl = companyContainer?.getElementsByTagName("a")[0]?.href || "";
        const companyName = companyContainer?.textContent?.trim() || "";

        const companyLocation =
          item.getElementsByClassName("job-search-card__location")[0]?.textContent?.trim() ||
          "";

        const dateTimeElem = (item.getElementsByClassName("job-search-card__listdate")[0] ||
          item.getElementsByClassName("job-search-card__listdate--new")[0]) as HTMLElement | undefined;

        const dateTime = dateTimeElem?.getAttribute("datetime") || "";
        const postedTimeAgo = dateTimeElem?.textContent?.trim() || "";

        const toDateIso = (dateString: string) => {
          const parts = dateString.split("-");
          if (parts.length !== 3) return "";
          const [year, month, day] = parts;
          const d = new Date(Number(year), Number(month) - 1, Number(day));
          return isNaN(d.getTime()) ? "" : d.toISOString();
        };

        const postedDate = dateTime ? toDateIso(dateTime) : "";

        const descriptionElem = item.getElementsByClassName("job-search-card__snippet")[0];
        const description = descriptionElem?.textContent?.trim() || "";

        const earlyApplicantElem = item.getElementsByClassName("job-posting-benefits__text")[0];
        const earlyApplicant =
          earlyApplicantElem?.textContent?.toLowerCase().includes("early applicant") || false;

        results.push({
          id: item.children[0]?.getAttribute("data-entity-urn") || `job-${i}`,
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
        });
      } catch (e) {
        // keep going
      }
    }

    return results;
  });

  return raw as LinkedInJob[];
}

function isServerlessProd(): boolean {
  const onVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true" || !!process.env.VERCEL_ENV;
  const onLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  const nodeEnvProd = process.env.NODE_ENV === "production";
  return onVercel || onLambda || nodeEnvProd;
}

export async function scrapeLinkedInJobs(params: ScrapeParams): Promise<LinkedInJob[]> {
  const MAX_PAGES = 10;
  const allJobs: LinkedInJob[] = [];

  const searchKeywords = params.searchText
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const countries = params.locationText
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  logger.info(
    `Starting LinkedIn scrape for ${searchKeywords.length} keywords across ${countries.length} countries`
  );

  let browser: Browser | null = null;

  try {
    const production = isServerlessProd();

    if (production) {
      logger.info("Launching browser for serverless/production");
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      logger.info("Launching browser for local development");

      const fs = await import("fs");
      const chromePaths = [
        process.env.CHROME_PATH,
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium",
      ].filter(Boolean) as string[];

      let executablePath: string | undefined;
      for (const p of chromePaths) {
        if (fs.existsSync(p)) {
          executablePath = p;
          logger.info(`Found Chrome at: ${p}`);
          break;
        }
      }

      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        executablePath,
      });
    }

    for (let keywordIndex = 0; keywordIndex < searchKeywords.length; keywordIndex++) {
      const currentKeyword = searchKeywords[keywordIndex];
      logger.info(`Keyword ${keywordIndex + 1}/${searchKeywords.length}: "${currentKeyword}"`);

      for (let countryIndex = 0; countryIndex < countries.length; countryIndex++) {
        const currentCountry = countries[countryIndex];
        const countryConfig = COUNTRY_CONFIGS[currentCountry];

        logger.info(`  Country ${countryIndex + 1}/${countries.length}: ${currentCountry}`);

        const page = await browser.newPage();
        try {
          await page.setUserAgent(DEFAULT_UA);

          // Set language header if we have a config
          if (countryConfig?.language) {
            await page.setExtraHTTPHeaders({
              "Accept-Language": countryConfig.language,
            });
          }

          for (let currentPage = 0; currentPage < MAX_PAGES; currentPage++) {
            const url = buildJobSearchUrl(
              {
                searchText: currentKeyword,
                locationText: countryConfig?.locationParam || currentCountry,
                timeFilter: params.timeFilter,
                pageNumber: currentPage,
              },
              countryConfig
            );

            logger.info(`    Page ${currentPage + 1}/${MAX_PAGES}`);

            try {
              await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
              await new Promise((r) => setTimeout(r, 1500));

              const jobs = await scrapeJobsFromPage(page);

              if (!jobs.length) {
                logger.info(`    No jobs found, moving on`);
                break;
              }

              allJobs.push(
                ...jobs.map((job) => ({
                  ...job,
                  searchCountry: currentCountry,
                  currency: countryConfig?.currency || "USD",
                  domain: countryConfig?.domain || "linkedin.com",
                  inputKeyword: currentKeyword,
                }))
              );

              logger.info(`    Found ${jobs.length} jobs (running total: ${allJobs.length})`);
            } catch (err) {
              logger.error(`    Error on page ${currentPage + 1}:`, err);
              break;
            }
          }
        } finally {
          await page.close();
        }

        if (countryIndex < countries.length - 1) {
          await new Promise((r) => setTimeout(r, 2500));
        }
      }

      if (keywordIndex < searchKeywords.length - 1) {
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
  } catch (error) {
    logger.error("Browser error during scraping:", error);
    throw error;
  } finally {
    if (browser) await browser.close();
  }

  // De-dupe by URL
  const seen = new Set<string>();
  const unique: LinkedInJob[] = [];

  for (const job of allJobs) {
    const normalized = (job.url || "").toLowerCase().trim();
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(job);
  }

  logger.info(`Total jobs found: ${allJobs.length}`);
  logger.info(`Unique jobs: ${unique.length}`);

  return unique;
}

export async function createExcelFile(jobs: LinkedInJob[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Job Listings");

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

  for (const job of jobs) {
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
  }

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4A90E2" } };

  worksheet.autoFilter = "A1:L1";

  const out = await workbook.xlsx.writeBuffer();

  // ExcelJS can return ArrayBuffer in many runtimes
  if (out instanceof ArrayBuffer) return Buffer.from(new Uint8Array(out));
  return Buffer.from(out as any);
}
