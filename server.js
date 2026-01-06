import express from "express";
import nodemailer from "nodemailer";
import puppeteer from "puppeteer";
import { defer, from } from "rxjs";
import { switchMap } from "rxjs/operators";
import { config } from "../config.js";
import ExcelJS from "exceljs";
import dotenv from "dotenv";

dotenv.config();

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log(
  "EMAIL_PASS:",
  process.env.EMAIL_PASS ? "***loaded***" : "undefined"
);

// Country configurations for different LinkedIn domains and settings
const COUNTRY_CONFIGS = {
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

function urlQueryPage(searchParams, countryConfig = null) {
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

function navigateToJobsPage(page, searchParams, countryConfig = null) {
  console.log("Navigating to jobs page...");
  const url = urlQueryPage(searchParams, countryConfig);
  console.log(url);
  return page.goto(url, { waitUntil: "networkidle0" });
}

let reqSearchText = "";
let reqLocationText = "";
let reqStacks = "";
// Global storage for scraped jobs.
global.lastScrapedJobs = [];

// Excel writer function
async function excelWriter(jobs) {
  if (!jobs || jobs.length === 0) {
    console.log("No jobs to write");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Job Listings");

  // Collect all unique keys from all job objects
  const allKeys = new Set();
  jobs.forEach((job) => {
    if (job && typeof job === "object") {
      Object.keys(job).forEach((key) => allKeys.add(key));
    }
  });

  // Ensure all important fields are included
  const requiredKeys = [
    "title",
    "company",
    "location",
    "searchCountry",
    "currency",
    "domain",
    "postedDate",
    "description",
    "compensation",
    "recruiterName",
    "recruiterRole",
    "url",
    "companyUrl",
    "img",
    "referral",
    "detailedDescription",
  ];

  requiredKeys.forEach((key) => allKeys.add(key));

  // Define column order
  const priorityColumns = [
    "title",
    "company",
    "location",
    "searchCountry",
    "currency",
    "postedDate",
    "description",
    "compensation",
    "recruiterName",
    "recruiterRole",
    "url",
    "companyUrl",
    "img",
    "referral",
    "detailedDescription",
  ];

  // Add any remaining columns not in priority list
  const otherColumns = Array.from(allKeys)
    .filter((key) => !priorityColumns.includes(key))
    .sort();
  const columnKeys = [
    ...priorityColumns.filter((key) => allKeys.has(key)),
    ...otherColumns,
  ];

  // Define columns with proper headers and widths
  const columns = columnKeys.map((key) => {
    let header =
      key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1");
    let width = 15;

    // Custom headers and widths
    switch (key) {
      case "searchCountry":
      case "description":
      case "detailedDescription":
        width = 25;
        break;
      case "compensation":
        header = "Compensation";
        width = 25;
        break;
    }

    return { header, key, width };
  });

  worksheet.columns = columns;

  // Add data rows
  jobs.forEach((job, index) => {
    const rowData = {};
    columnKeys.forEach((key) => {
      let value = job[key] || "";

      // Format specific fields
      if (key === "postedDate" && value) {
        try {
          value = new Date(value).toLocaleDateString("en-GB");
        } catch (e) {
          value = value;
        }
      }

      rowData[key] = value;
    });
    worksheet.addRow(rowData);
  });

  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4A90E2" },
  };
  headerRow.font = { ...headerRow.font, color: { argb: "FFFFFFFF" } };

  // Auto-filter and freeze panes
  worksheet.autoFilter = `A1:${String.fromCharCode(
    65 + columnKeys.length - 1
  )}1`;
  worksheet.views = [{ state: "frozen", ySplit: 1, xSplit: 2 }];

  // Generate filename
  const timestamp = new Date().toISOString().split("T")[0];
  const countries = [...new Set(jobs.map((job) => job.searchCountry))];
  const filename = `jobs_${jobs.length}_${countries.length}countries_${timestamp}.xlsx`;

  await workbook.xlsx.writeFile(filename);
  console.log(`\n📊 Excel file created: ${filename}`);

  console.log(`\n📈 SUMMARY`);
  console.log(`=========================================`);
  console.log(`📊 Total Jobs: ${jobs.length}`);
  console.log(`🌍 Countries: ${countries.join(", ")}`);
}

// Scrape job descriptions
async function scrapeJobDescriptions(allJobs) {
  const BATCH_SIZE = 4;
  const BATCH_DELAY = 2000;
  const REQUEST_TIMEOUT = 45000;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const pages = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      const page = await browser.newPage();

      const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ];

      await page.setUserAgent(userAgents[i % userAgents.length]);
      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
      });

      await page.setViewport({ width: 1920, height: 1080 });
      pages.push(page);
    }

    const scrapeJob = async (job, index, page, retryCount = 0) => {
      const MAX_RETRIES = 2;

      if (!job.url) {
        console.log(`Job ${index + 1} has no URL, skipping...`);
        return {
          ...job,
          compensation: "No URL available",
          description: "No URL available",
          referral: "No URL available",
          recruiterName: "No URL available",
          recruiterRole: "No URL available",
          recruiterImageUrl: "No URL available",
          recruiterLinkedInUrl: "No URL available",
          detailedDescription: "No URL available",
        };
      }

      try {
        console.log(
          `Scraping job ${index + 1}/${allJobs.length}: ${job.url}${
            retryCount > 0 ? ` (retry ${retryCount})` : ""
          }`
        );

        const randomDelay = Math.random() * 1023 + 1712;
        await new Promise((resolve) => setTimeout(resolve, randomDelay));

        await page.goto(job.url, {
          waitUntil: "domcontentloaded",
          timeout: REQUEST_TIMEOUT,
        });

        const currentUrl = page.url();
        if (
          !currentUrl.includes("linkedin.com/jobs/view") &&
          !currentUrl.includes("linkedin.com/jobs/collections")
        ) {
          throw new Error(`Redirected to unexpected URL: ${currentUrl}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));

        const selectors = [
          ".decorated-job-posting__details",
          ".jobs-description",
          ".jobs-box__html-content",
          ".job-view-layout",
          "[data-job-id]",
          ".jobs-details",
        ];

        let selectedContainer = null;
        for (const selector of selectors) {
          try {
            await page.waitForSelector(selector, { timeout: 5000 });
            selectedContainer = selector;
            console.log(`  Found content with selector: ${selector}`);
            break;
          } catch (e) {
            console.log(`  Selector ${selector} not found, trying next...`);
          }
        }

        if (!selectedContainer) {
          const pageContent = await page.content();
          if (
            pageContent.includes("sign-in") ||
            pageContent.includes("login") ||
            pageContent.includes("challenge")
          ) {
            throw new Error("Hit login wall or challenge page");
          }
          throw new Error("No valid content selectors found");
        }

        const jobData = await page.evaluate((containerSelector) => {
          let container = document.querySelector(containerSelector);
          if (!container) {
            container = document;
          }

          const compensationSelectors = [
            ".core-section-container.compensation",
            ".job-details-compensation",
            ".jobs-details__compensation",
            "[data-test-id*='compensation']",
            ".salary-insights",
          ];

          const descriptionSelectors = [
            ".core-section-container.description",
            ".jobs-description",
            ".jobs-box__html-content",
            ".job-details-job-description",
            ".jobs-description-content",
            ".jobs-details__job-description",
          ];

          const referralSelectors = [
            ".core-section-container.find-a-referral",
            ".jobs-details__referral",
            ".job-details-referral",
          ];

          const getTextFromSelectors = (selectors, fallback = "Not found") => {
            for (const selector of selectors) {
              const element = container.querySelector(selector);
              if (element && element.innerText.trim()) {
                return element.innerText.trim();
              }
            }
            return fallback;
          };

          const getHtmlFromSelectors = (selectors, fallback = "Not found") => {
            for (const selector of selectors) {
              const element = container.querySelector(selector);
              if (element) {
                return element.outerHTML;
              }
            }
            return fallback;
          };

          const compensation = getTextFromSelectors(
            compensationSelectors,
            "No compensation information"
          );
          const description = getTextFromSelectors(
            descriptionSelectors,
            "No description available"
          );
          const referral = getTextFromSelectors(
            referralSelectors,
            "No referral information"
          );
          const descriptionHtml = getHtmlFromSelectors(
            descriptionSelectors,
            "No description HTML available"
          );

          return {
            compensation,
            description,
            referral,
            descriptionHtml,
          };
        }, selectedContainer);

        const detailedData = await parseDetailedDescription(
          page,
          jobData.descriptionHtml
        );

        const scrapedResult = {
          ...job,
          compensation: jobData.compensation,
          description: jobData.description,
          referral: jobData.referral,
          ...detailedData,
        };

        console.log(`Successfully scraped job ${index + 1}`);
        console.log(
          `  - Compensation: ${
            jobData.compensation.length > 50
              ? jobData.compensation.substring(0, 50) + "..."
              : jobData.compensation
          }`
        );
        console.log(
          `  - Description: ${
            jobData.description.length > 50
              ? jobData.description.substring(0, 50) + "..."
              : jobData.description
          }`
        );
        console.log(
          `  - Recruiter: ${detailedData.recruiterName || "Not found"}`
        );

        return scrapedResult;
      } catch (error) {
        console.error(`Error scraping job ${index + 1}: ${error.message}`);

        if (retryCount < MAX_RETRIES) {
          const retryableErrors = [
            "Waiting for selector",
            "Navigation timeout",
            "net::ERR_",
            "Target closed",
            "Protocol error",
          ];

          const isRetryable = retryableErrors.some((errorType) =>
            error.message.includes(errorType)
          );

          if (isRetryable) {
            console.log(
              `  Retrying job ${index + 1} (attempt ${
                retryCount + 1
              }/${MAX_RETRIES})`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, 5000 + retryCount * 3000)
            );
            return scrapeJob(job, index, page, retryCount + 1);
          }
        }

        return {
          ...job,
          compensation: `Error: ${error.message}`,
          description: `Error: ${error.message}`,
          referral: `Error: ${error.message}`,
          recruiterName: `Error: ${error.message}`,
          recruiterRole: `Error: ${error.message}`,
          recruiterImageUrl: `Error: ${error.message}`,
          recruiterLinkedInUrl: `Error: ${error.message}`,
          detailedDescription: `Error: ${error.message}`,
        };
      }
    };

    const results = [];
    for (let i = 0; i < allJobs.length; i += BATCH_SIZE) {
      const batch = allJobs.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(allJobs.length / BATCH_SIZE);

      console.log(
        `Processing batch ${batchNumber}/${totalBatches} (${batch.length} jobs)`
      );

      const batchPromises = batch.map((job, batchIndex) => {
        const globalIndex = i + batchIndex;
        const pageIndex = batchIndex % pages.length;
        return scrapeJob(job, globalIndex, pages[pageIndex]);
      });

      const batchResults = await Promise.allSettled(batchPromises);

      let batchSuccesses = 0;
      let batchErrors = 0;

      batchResults.forEach((result, batchIndex) => {
        const globalIndex = i + batchIndex;
        if (result.status === "fulfilled") {
          results[globalIndex] = result.value;
          if (!result.value.compensation.startsWith("Error:")) {
            batchSuccesses++;
          } else {
            batchErrors++;
          }
        } else {
          batchErrors++;
          console.error(
            `Batch promise rejected for job ${globalIndex + 1}:`,
            result.reason
          );

          const errorJob = {
            ...batch[batchIndex],
            compensation: `Promise rejected: ${
              result.reason?.message || "Unknown error"
            }`,
            description: `Promise rejected: ${
              result.reason?.message || "Unknown error"
            }`,
            referral: `Promise rejected: ${
              result.reason?.message || "Unknown error"
            }`,
            recruiterName: `Promise rejected: ${
              result.reason?.message || "Unknown error"
            }`,
            recruiterRole: `Promise rejected: ${
              result.reason?.message || "Unknown error"
            }`,
            recruiterImageUrl: `Promise rejected: ${
              result.reason?.message || "Unknown error"
            }`,
            recruiterLinkedInUrl: `Promise rejected: ${
              result.reason?.message || "Unknown error"
            }`,
            detailedDescription: `Promise rejected: ${
              result.reason?.message || "Unknown error"
            }`,
          };

          results[globalIndex] = errorJob;
        }
      });

      console.log(
        `Batch ${batchNumber} completed - Success: ${batchSuccesses}/${batch.length}, Errors: ${batchErrors}/${batch.length}`
      );

      let nextDelay = BATCH_DELAY;
      if (batchErrors > batchSuccesses) {
        nextDelay = BATCH_DELAY * 2;
        console.log(
          `High error rate detected, doubling delay to ${nextDelay / 1000}s`
        );
      }

      if (i + BATCH_SIZE < allJobs.length) {
        console.log(`Waiting ${nextDelay / 1000}s before next batch...`);
        await new Promise((resolve) => setTimeout(resolve, nextDelay));
      }
    }

    await Promise.all(pages.map((page) => page.close()));

    const successCount = results.filter(
      (job) => !job.compensation.startsWith("Error:")
    ).length;
    const errorCount = results.length - successCount;

    console.log(`Final Results:`);
    console.log(`Successfully scraped: ${successCount}/${results.length} jobs`);
    console.log(`Failed to scrape: ${errorCount}/${results.length} jobs`);

    return results;
  } catch (error) {
    console.error("Browser error:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Parse detailed description
async function parseDetailedDescription(page, descriptionHtml) {
  try {
    const detailedData = await page.evaluate((html) => {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;

      const result = {};

      // Extract recruiter information
      const recruiterSection = tempDiv.querySelector(".message-the-recruiter");
      if (recruiterSection) {
        const recruiterCard = recruiterSection.querySelector(".base-main-card");
        if (recruiterCard) {
          const nameElement = recruiterCard.querySelector(
            ".base-main-card__title"
          );
          result.recruiterName = nameElement
            ? nameElement.innerText.trim()
            : "No name found";

          const roleElement = recruiterCard.querySelector(
            ".base-main-card__subtitle"
          );
          result.recruiterRole = roleElement
            ? roleElement.innerText.trim()
            : "No role found";

          const imageElement = recruiterCard.querySelector("img");
          result.recruiterImageUrl = imageElement
            ? imageElement.src
            : "No image found";

          const linkElement = recruiterCard.querySelector(
            "a.base-card__full-link"
          );
          result.recruiterLinkedInUrl = linkElement
            ? linkElement.href
            : "No LinkedIn URL found";
        }
      } else {
        result.recruiterName = "No recruiter section found";
        result.recruiterRole = "No recruiter section found";
        result.recruiterImageUrl = "No recruiter section found";
        result.recruiterLinkedInUrl = "No recruiter section found";
      }

      // Extract detailed description
      const descriptionSelectors = [
        ".description__text--rich .show-more-less-html__markup",
        ".jobs-description__content .show-more-less-html__markup",
        ".description__text--rich",
        ".jobs-description__content",
        ".jobs-description-content__text",
        ".jobs-box__html-content",
        ".job-details-job-description",
        ".decorated-job-posting__details .jobs-description",
        "[data-job-details-description]",
        ".artdeco-card .jobs-description",
      ];

      let detailedDescription = "";

      for (const selector of descriptionSelectors) {
        const element = tempDiv.querySelector(selector);
        if (
          element &&
          element.innerText &&
          element.innerText.trim().length > 100
        ) {
          detailedDescription = element.innerText.trim();
          console.log(
            `Found detailed description with selector: ${selector} (${detailedDescription.length} chars)`
          );
          break;
        }
      }

      if (!detailedDescription || detailedDescription.length < 100) {
        const fallbackSelectors = [
          ".jobs-description",
          ".job-description",
          ".description",
          "[class*='description']",
          "[class*='job-details']",
        ];

        for (const selector of fallbackSelectors) {
          const element = tempDiv.querySelector(selector);
          if (
            element &&
            element.innerText &&
            element.innerText.trim().length > 50
          ) {
            detailedDescription = element.innerText.trim();
            console.log(
              `Found fallback description with selector: ${selector} (${detailedDescription.length} chars)`
            );
            break;
          }
        }
      }

      result.detailedDescription =
        detailedDescription || "No detailed description found";

      return result;
    }, descriptionHtml);

    return detailedData;
  } catch (error) {
    console.error("Error parsing detailed description:", error.message);
    return {
      recruiterName: `Error: ${error.message}`,
      recruiterRole: `Error: ${error.message}`,
      recruiterImageUrl: `Error: ${error.message}`,
      recruiterLinkedInUrl: `Error: ${error.message}`,
      detailedDescription: `Error: ${error.message}`,
    };
  }
}

function getJobsFromLinkedinPage(page) {
  return defer(() =>
    from(
      page.evaluate((pageEvalData) => {
        const collection = document.body.children;
        const results = [];
        for (let i = 0; i < collection.length; i++) {
          try {
            console.log(`i: ${i}`);
            const item = collection.item(i);
            const title = item
              .getElementsByClassName("base-search-card__title")[0]
              .textContent.trim();
            const imgSrc =
              item
                .getElementsByTagName("img")[0]
                ?.getAttribute("data-delayed-url") || "";
            const url = (
              item.getElementsByClassName("base-card__full-link")[0] ||
              item.getElementsByClassName("base-search-card--link")[0]
            ).href;
            const companyNameAndLinkContainer = item.getElementsByClassName(
              "base-search-card__subtitle"
            )[0];
            const companyUrl =
              companyNameAndLinkContainer?.getElementsByTagName("a")[0]?.href;
            const companyName = companyNameAndLinkContainer.textContent.trim();
            const companyLocation = item
              .getElementsByClassName("job-search-card__location")[0]
              .textContent.trim();
            const toDate = (dateString) => {
              const [year, month, day] = dateString.split("-");
              return new Date(
                parseFloat(year),
                parseFloat(month) - 1,
                parseFloat(day)
              );
            };
            const dateTime = (
              item.getElementsByClassName("job-search-card__listdate")[0] ||
              item.getElementsByClassName("job-search-card__listdate--new")[0]
            ).getAttribute("datetime");
            const postedDate = toDate(dateTime).toISOString();
            const descriptionElem = item.getElementsByClassName(
              "job-search-card__snippet"
            )[0];
            const description = descriptionElem
              ? descriptionElem.textContent.trim()
              : "";

            const result = {
              id: item.children[0].getAttribute("data-entity-urn"),
              city: companyLocation,
              url: url,
              companyUrl: companyUrl || "",
              img: imgSrc,
              date: new Date().toISOString(),
              postedDate: postedDate,
              title: title,
              company: companyName,
              location: companyLocation,
              description: description,
            };
            console.log(item);
            results.push(result);
          } catch (e) {
            console.error(
              `Error retrieving linkedin page item: ${i} on url: ${window.location}`,
              e
            );
          }
        }
        return results;
      })
    )
  );
}

function goToLinkedinJobsPageAndExtractJobs(
  page,
  searchParams,
  countryConfig = null
) {
  return defer(() =>
    from(navigateToJobsPage(page, searchParams, countryConfig))
  ).pipe(switchMap(() => getJobsFromLinkedinPage(page)));
}

async function scrapeJobs(searchParams, stacksInput) {
  const MAX_PAGES = 50;
  let allJobs = [];
  const countries = searchParams.locationText
    .split(",")
    .map((country) => country.trim())
    .filter((country) => country.length > 0);

  console.log(
    `Starting job search across ${countries.length} countries: ${countries.join(
      ", "
    )}`
  );

  for (let countryIndex = 0; countryIndex < countries.length; countryIndex++) {
    const currentCountry = countries[countryIndex];
    const countryConfig = COUNTRY_CONFIGS[currentCountry];

    if (!countryConfig) {
      console.log(
        `Warning: No configuration found for country "${currentCountry}". Using default settings.`
      );
    }

    console.log(
      `Searching country ${countryIndex + 1}/${
        countries.length
      }: ${currentCountry}`
    );

    const countryJobs = [];
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-setuid-sandbox",
        "--no-sandbox",
      ],
    });

    try {
      const page = await browser.newPage();

      if (countryConfig) {
        await page.setExtraHTTPHeaders({
          "Accept-Language": countryConfig.language,
          "Accept-Encoding": "gzip, deflate, br",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        });
      }

      for (let currentPage = 0; currentPage < MAX_PAGES; currentPage++) {
        console.log(
          `  Extracting jobs from page ${currentPage} for ${currentCountry}...`
        );

        const countrySearchParams = {
          ...searchParams,
          locationText: countryConfig
            ? countryConfig.locationParam
            : currentCountry,
          pageNumber: currentPage,
        };

        try {
          const jobs = await goToLinkedinJobsPageAndExtractJobs(
            page,
            countrySearchParams,
            countryConfig
          ).toPromise();

          if (!jobs || jobs.length === 0) {
            console.log(
              `  No jobs found on page ${currentPage} for ${currentCountry}. Moving to next country.`
            );
            break;
          }

          // Add country metadata to each job
          const jobsWithCountry = jobs.map((job) => ({
            ...job,
            searchCountry: currentCountry,
            currency: countryConfig ? countryConfig.currency : "USD",
            domain: countryConfig ? countryConfig.domain : "linkedin.com",
          }));

          countryJobs.push(...jobsWithCountry);
        } catch (err) {
          console.error(
            `  Error on page ${currentPage} for ${currentCountry}:`,
            err
          );
          break;
        }
      }

      console.log(`  Found ${countryJobs.length} jobs for ${currentCountry}`);
      allJobs.push(...countryJobs);
    } finally {
      await browser.close();
    }

    if (countryIndex < countries.length - 1) {
      console.log(`Waiting 5 seconds before next country...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  // Remove duplicates based on job URL
  const uniqueJobs = allJobs.filter(
    (job, index, self) => index === self.findIndex((j) => j.url === job.url)
  );

  console.log(
    `Total unique jobs found across all countries: ${uniqueJobs.length}`
  );
  console.log(`Jobs by country:`);
  countries.forEach((country) => {
    const countryCount = uniqueJobs.filter(
      (job) => job.searchCountry === country
    ).length;
    console.log(`  - ${country}: ${countryCount} jobs`);
  });

  const jobsWithDescriptions = await scrapeJobDescriptions(uniqueJobs);
  await excelWriter(jobsWithDescriptions);

  return uniqueJobs;
}

// Express server
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>LinkedIn Career Hunter - Multi-Country</title>
        <style>
          body { font-family: Arial, sans-serif; background: #eef2f7; padding: 20px; }
          .container { max-width: 600px; margin: auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          h1 { text-align: center; color: #0073b1; }
          label { font-weight: bold; }
          input[type="text"], input[type="password"], input[type="email"], select { width: 100%; padding: 8px; margin: 5px 0 15px; border: 1px solid #ccc; border-radius: 4px; }
          button { padding: 10px 15px; background: #0073b1; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
          button:hover { background: #005a87; }
          .hidden { display: none; }
          .country-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 15px 0; }
          .country-chip { padding: 8px 12px; background: #f0f2f5; border: 2px solid #ddd; border-radius: 20px; text-align: center; cursor: pointer; transition: all 0.2s; }
          .country-chip:hover { background: #e3f2fd; }
          .country-chip.selected { background: #0073b1; color: white; border-color: #0073b1; }
        </style>
        <script>
          let selectedCountries = [];
          
          window.onload = function() {
            const userConfig = localStorage.getItem('userConfig');
            if (userConfig) {
              document.getElementById('configForm').classList.add('hidden');
              document.getElementById('filterForm').classList.remove('hidden');
              initializeCountrySelection();
            } else {
              document.getElementById('configForm').classList.remove('hidden');
              document.getElementById('filterForm').classList.add('hidden');
            }
          };
          
          function initializeCountrySelection() {
            const countryChips = document.querySelectorAll('.country-chip');
            countryChips.forEach(chip => {
              chip.addEventListener('click', function() {
                this.classList.toggle('selected');
                updateSelectedCountries();
              });
            });
          }
          
          function updateSelectedCountries() {
            selectedCountries = [];
            document.querySelectorAll('.country-chip.selected').forEach(chip => {
              selectedCountries.push(chip.textContent);
            });
            document.getElementById('locationText').value = selectedCountries.join(', ');
          }

          function saveConfig() {
            const recipientEmail = document.getElementById('recipientEmail').value;
            if (!recipientEmail) {
              alert('Please enter your email address where you want to receive job notifications');
              return;
            }
            
            let userConfig = {
              recipientEmail
            };
            
            localStorage.setItem('userConfig', JSON.stringify(userConfig));
            alert('Configuration saved! Reloading page...');
            window.location.reload();
          }

          function onSearchSubmit() {
            if (selectedCountries.length === 0) {
              alert('Please select at least one country to search');
              return false;
            }
            
            document.getElementById('searchButton').disabled = true;
            document.getElementById('searchButton').innerText = 'Searching...';
            
            const userConfig = localStorage.getItem('userConfig');
            if (userConfig) {
              const hiddenInput = document.createElement('input');
              hiddenInput.type = 'hidden';
              hiddenInput.name = 'userConfig';
              hiddenInput.value = userConfig;
              document.getElementById('searchForm').appendChild(hiddenInput);
            }
            return true;
          }
        </script>
      </head>
      <body>
        <div class="container">
          <h1>LinkedIn Career Hunter - Multi-Country</h1>
          <!-- Configuration Form -->
          <div id="configForm">
            <h2>Initial Configuration</h2>
            <p>Please provide your configuration details. These will be stored locally.</p>
            
            <label for="recipientEmail">Your Email Address (to receive job listings):</label>
            <input type="email" id="recipientEmail" placeholder="youremail@example.com" required />
            
            <button onclick="saveConfig();">Save Configuration</button>
            <br/><br/>
          </div>
          <!-- Filter Form (displayed when config exists) -->
          <div id="filterForm" class="hidden">
            <p>Use the filters below to search for job listings across multiple countries on LinkedIn.</p>
            <form id="searchForm" action="/search" method="post" onsubmit="return onSearchSubmit();">
              <label for="searchText">Search Text:</label><br />
              <input type="text" name="searchText" id="searchText" value="cfa" /><br />
              
              <label for="timeFilter">Time Filter (seconds):</label><br />
              <select name="timeFilter" id="timeFilter">
                <option value="86400">Last 24 hours (86400 seconds)</option>
                <option value="172800">Last 2 days (172800 seconds)</option>
                <option value="259200">Last 3 days (259200 seconds)</option>
                <option value="604800" selected>Last 7 days (604800 seconds)</option>
                <option value="1209600">Last 14 days (1209600 seconds)</option>
                <option value="2592000">Last 30 days (2592000 seconds)</option>
              </select><br />
              
              <label>Select Countries:</label><br />
              <div class="country-grid">
                <div class="country-chip">United States</div>
                <div class="country-chip">United Kingdom</div>
                <div class="country-chip">Ireland</div>
                <div class="country-chip">Canada</div>
                <div class="country-chip">Germany</div>
                <div class="country-chip">France</div>
                <div class="country-chip">Australia</div>
                <div class="country-chip">Netherlands</div>
                <div class="country-chip">Luxembourg</div>
                <div class="country-chip">Belgium</div>
                <div class="country-chip">Switzerland</div>
                <div class="country-chip">Spain</div>
                <div class="country-chip">Italy</div>
              </div>
              <input type="hidden" name="locationText" id="locationText" />
              
              <label for="stacks">Other Filters (comma-separated, optional):</label><br />
              <input type="text" name="stacks" id="stacks" placeholder="e.g. reactjs, nodejs, nextjs" /><br />
              
              <button type="submit" id="searchButton">Search Jobs</button>
            </form>
          </div>
        </div>
        <!-- Info Cards and Footer -->
        <div style="width: 60%; margin: auto; margin-top: 40px;">
          <div style="display: flex; flex-wrap: wrap; justify-content: center; margin-bottom: 40px;">
            <div style="background: #fff; border-radius: 8px; padding: 20px; margin: 10px; flex: 1 1 300px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #0073b1;">Global Opportunities</h2>
              <p>Expand your job search internationally with support for 13+ countries. Each job listing includes country-specific information and currency details for strategic job hunting.</p>
            </div>
            <div style="background: #fff; border-radius: 8px; padding: 20px; margin: 10px; flex: 1 1 300px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #0073b1;">Comprehensive Data</h2>
              <p>Get detailed job information including compensation data, recruiter details, and full job descriptions exported to Excel for easy analysis and tracking.</p>
            </div>
          </div>
          <footer style="text-align: center; padding: 20px; background: #eee; border-radius: 8px;">
            <p style="font-size: 13px;">Designed and Developed by <a href="https://nicanor.me" target="_blank" style="color: #0073b1;">Nicanor Korir</a> and developed by <a href="https://rezafh.com" target="_blank" style="color: #0073b1;">Reza FH</a></p>
            <p style="font-size: 12px; color: darkorange;">Hunt your Dream Job Globally</p>
          </footer>
        </div>
      </body>
    </html>
  `);
});

async function sendJobsEmail(jobs, userConfig) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Job Listings");

  worksheet.columns = [
    { header: "Title", key: "title" },
    { header: "Company", key: "company" },
    { header: "Location", key: "location" },
    { header: "Search Country", key: "searchCountry" },
    { header: "Currency", key: "currency" },
    { header: "Posted Date", key: "postedDate" },
    { header: "Description", key: "description" },
    { header: "Url", key: "url" },
  ];

  jobs.forEach((job, index) => {
    worksheet.addRow({
      title: job.title,
      company: job.company,
      location: job.location,
      searchCountry: job.searchCountry,
      currency: job.currency,
      postedDate: job.postedDate,
      description: job.description,
      url: job.url,
    });
  });

  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `job_listings_${timestamp}.xlsx`;
  await workbook.xlsx.writeFile(filename);

  const recipientEmail = userConfig.recipientEmail || "user@example.com";
  const countries = [...new Set(jobs.map((job) => job.searchCountry))];

  const htmlBody = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #f2f2f2; padding: 20px; }
          .container { max-width: 40%; margin: auto; background: #f2f2f2; }
          .card { background: #fff; border-radius: 8px; padding: 15px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .card h2 { margin: 0 0 10px 0; font-size: 18px; }
          .card p { margin: 5px 0; font-size: 14px; }
          .card img { max-width: 100px; border-radius: 4px; }
          .card .header { display: flex; align-items: center; }
          .card .header div { margin-left: 10px; }
          .button { display: inline-block; padding: 8px 12px; margin-top: 10px; background: #0073b1; border-radius: 4px; font-size: 14px; font-weight: bolder; }
          .button a { color: #ffffff; text-decoration: none; }
          .country-stats { background: #fff; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .country-chip { display: inline-block; padding: 5px 10px; margin: 2px; background: #0073b1; color: white; border-radius: 12px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 style="text-align: center; color: #0073b1;">LinkedIn Career Hunter - Results</h1>
          
          <div class="country-stats">
            <h3>Search Summary</h3>
            <p>Found <strong>${jobs.length}</strong> jobs across <strong>${
    countries.length
  }</strong> countries for: <strong>${encodeURIComponent(
    reqSearchText
  )}</strong></p>
            <p><strong>Countries searched:</strong></p>
            ${countries
              .map((country) => {
                const countryCount = jobs.filter(
                  (job) => job.searchCountry === country
                ).length;
                return `<span class="country-chip">${country}: ${countryCount} jobs</span>`;
              })
              .join("")}
          </div>
          
          <div class="cards">
            ${jobs
              .map((job) => {
                const postedDate = new Date(job.postedDate).toLocaleDateString(
                  "en-US",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                );
                const description = job.description
                  ? job.description.length > 150
                    ? job.description.substring(0, 150) + "..."
                    : job.description
                  : "N/A";
                return `
                <div class="card">
                  <div class="header">
                    ${
                      job.img
                        ? `<img src="${job.img}" alt="Company Logo" />`
                        : ""
                    }
                    <div>
                      <h2><a target="_blank" href="${
                        job.url
                      }" style="color: #0073b1; text-decoration: none;">${
                  job.title
                }</a></h2>
                      <p>Company: <a target="_blank" href="${
                        job.companyUrl || "#"
                      }" style="color: #0073b1; text-decoration: none;">${
                  job.company
                }</a></p>
                    </div>
                  </div>
                  <p><strong>Location:</strong> ${job.location}</p>
                  <p><strong>Country:</strong> ${job.searchCountry} (${
                  job.currency
                })</p>
                  <p><strong>Posted Date:</strong> ${postedDate}</p>
                  <p><strong>Description:</strong> ${description}</p>
                  <a class="button" target="_blank" href="${
                    job.url
                  }" style="color: #ffffff; text-decoration: none;">View Job</a>
                </div>
              `;
              })
              .join("")}
          </div>
        </div>
      </body>
    </html>
  `;

  const emailSubject = `LinkedIn Jobs - ${jobs.length} Listings Found across ${countries.length} Countries`;

  try {
    const transporter = nodemailer.createTransporter({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.auth.user,
        pass: config.email.auth.pass,
      },
    });

    const mailOptions = {
      from: config.email.from,
      to: recipientEmail,
      subject: emailSubject,
      html: htmlBody,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Jobs email sent: ${info.response}`);
  } catch (error) {
    console.error("Error sending jobs email:", error);
    throw error;
  }
}

app.post("/search", async (req, res) => {
  const searchText = req.body.searchText || "Investment Analyst";
  const locationText = req.body.locationText || "";
  const stacksInput = req.body.stacks || "";
  const timeFilter = parseInt(req.body.timeFilter) || 604800; // Default to 7 days
  const action = req.body.action || "";
  const sendEmail = req.body.sendEmail === "on";
  const stacksArray = stacksInput
    ? stacksInput
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : [];
  const userConfig = req.body.userConfig ? JSON.parse(req.body.userConfig) : {};

  if (!locationText.trim()) {
    return res.send(`
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #eef2f7; padding: 20px; }
            .container { max-width: 600px; margin: auto; text-align: center; }
            .button { padding: 10px 15px; background: #0073b1; color: #fff; border: none; border-radius: 4px; text-decoration: none; }
            .error { color: red; background: #fff0f0; padding: 15px; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>No Countries Selected</h1>
            <div class="error">
              <p>Please select at least one country to search for jobs.</p>
            </div>
            <p><a class="button" href="/">Back to Search</a></p>
          </div>
        </body>
      </html>
    `);
  }

  reqSearchText = searchText;
  reqLocationText = locationText;
  reqStacks = stacksInput;

  const searchParams = { searchText, locationText, timeFilter, pageNumber: 0 };

  try {
    let jobs;
    if (
      global.lastScrapedJobs &&
      global.lastScrapedJobs.length > 0 &&
      (action === "sendEmail" || sendEmail)
    ) {
      jobs = global.lastScrapedJobs;
    } else {
      jobs = await scrapeJobs(searchParams, stacksArray);
      global.lastScrapedJobs = jobs;
    }

    if (action === "sendEmail" || sendEmail) {
      try {
        await sendJobsEmail(jobs, userConfig);
        res.send(`
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; background: #eef2f7; padding: 20px; }
                .container { max-width: 600px; margin: auto; text-align: center; }
                .button { padding: 10px 15px; background: #0073b1; color: #fff; border: none; border-radius: 4px; text-decoration: none; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Email sent with ${jobs.length} job listings from ${
          [...new Set(jobs.map((job) => job.searchCountry))].length
        } countries.</h1>
                <p>Email was sent to: ${userConfig.recipientEmail}</p>
                <p><a class="button" href="/">Back to Search</a></p>
              </div>
            </body>
          </html>
        `);
      } catch (emailError) {
        res.send(`
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; background: #eef2f7; padding: 20px; }
                .container { max-width: 600px; margin: auto; text-align: center; }
                .button { padding: 10px 15px; background: #0073b1; color: #fff; border: none; border-radius: 4px; text-decoration: none; }
                .error { color: red; background: #fff0f0; padding: 15px; border-radius: 4px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Email sending failed</h1>
                <div class="error">
                  <p>There was an error sending the email: ${emailError.message}</p>
                  <p>Please check your email configuration and try again.</p>
                </div>
                <p><a class="button" href="/">Back to Search</a></p>
              </div>
            </body>
          </html>
        `);
      }
    } else {
      // Display jobs on the website
      const countries = [...new Set(jobs.map((job) => job.searchCountry))];

      let html = `
        <html>
          <head>
            <title>Job Results - LinkedIn Career Hunter</title>
            <style>
              body { font-family: Arial, sans-serif; background: #eef2f7; padding: 20px; }
              .container { max-width: 90%; margin: auto; }
              .header { text-align: center; color: #0073b1; }
              .nav { text-align: center; margin-bottom: 20px; }
              .nav a, .nav button { padding: 10px 15px; background: #555; color: #fff; text-decoration: none; border-radius: 4px; margin: 5px; border: none; cursor: pointer; }
              .nav a:hover, .nav button:hover { background: #333; }
              .country-stats { background: #fff; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
              .country-chip { display: inline-block; padding: 8px 15px; margin: 5px; background: #0073b1; color: white; border-radius: 15px; font-weight: bold; }
              .cards { display: flex; flex-wrap: wrap; justify-content: space-around; }
              .card { background: #fff; border-radius: 8px; padding: 15px; margin: 10px; flex: 1 1 300px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); position: relative; }
              .card h2 { margin: 0 0 10px 0; font-size: 18px; }
              .card p { margin: 5px 0; font-size: 14px; }
              .card a { color: #0073b1; text-decoration: none; }
              .button { display: inline-block; padding: 8px 12px; margin-top: 10px; background: #0073b1; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: bolder; }
              .country-flag { font-weight: bold; color: #0073b1; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="nav">
                <a href="/">Back to Search</a>
                <form action="/search" method="post" style="display:inline;" onsubmit="document.getElementById('emailButton').disabled=true; document.getElementById('emailButton').innerText='Loading...';">
                  <input type="hidden" name="searchText" value="${encodeURIComponent(
                    searchText
                  )}" />
                  <input type="hidden" name="locationText" value="${encodeURIComponent(
                    locationText
                  )}" />
                  <input type="hidden" name="stacks" value="${stacksInput}" />
                  <input type="hidden" name="timeFilter" value="${timeFilter}" />
                  <input type="hidden" name="action" value="sendEmail" />
                  <input type="hidden" name="userConfig" value='${JSON.stringify(
                    userConfig
                  )}' />
                  <button type="submit" id="emailButton">Send Email</button>
                </form>
              </div>
              <a href="/" style="text-decoration: none">
                <h1 class="header">LinkedIn Career Hunter - Results</h1>
              </a>
              
              <div class="country-stats">
                <h2>Search Summary</h2>
                <p>Found <strong>${
                  jobs.length
                }</strong> job listings across <strong>${
        countries.length
      }</strong> countries matching: <strong>${searchText}</strong></p>
                <div>
                  ${countries
                    .map((country) => {
                      const countryCount = jobs.filter(
                        (job) => job.searchCountry === country
                      ).length;
                      return `<span class="country-chip">${country}: ${countryCount} jobs</span>`;
                    })
                    .join("")}
                </div>
              </div>
              
              <div class="cards">
      `;

      jobs.forEach((job) => {
        html += `
          <div class="card">
            <h2><a target="_blank" href="${job.url}">${job.title}</a></h2>
            <p>Company: <a target="_blank" href="${job.companyUrl || "#"}">${
          job.company
        }</a></p>
            <p>Location: ${job.location}</p>
            <p class="country-flag">Country: ${job.searchCountry} (${
          job.currency
        })</p>
            <p>Posted: ${new Date(job.postedDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</p>
            <p>Description: ${
              job.description
                ? job.description.length > 150
                  ? job.description.substring(0, 150) + "..."
                  : job.description
                : ""
            }</p>
            <a class="button" target="_blank" href="${
              job.url
            }" style="color: #ffffff; text-decoration: none;">View Job</a>
          </div>
        `;
      });

      html += `
              </div>
              <div class="nav">
                <a href="/">Back to Search</a>
                <form action="/search" method="post" style="display:inline;" onsubmit="document.getElementById('emailButton2').disabled=true; document.getElementById('emailButton2').innerText='Loading...';">
                  <input type="hidden" name="searchText" value="${encodeURIComponent(
                    searchText
                  )}" />
                  <input type="hidden" name="locationText" value="${encodeURIComponent(
                    locationText
                  )}" />
                  <input type="hidden" name="stacks" value="${stacksInput}" />
                  <input type="hidden" name="timeFilter" value="${timeFilter}" />
                  <input type="hidden" name="action" value="sendEmail" />
                  <input type="hidden" name="userConfig" value='${JSON.stringify(
                    userConfig
                  )}' />
                  <button type="submit" id="emailButton2">Send Email</button>
                </form>
              </div>
            </div>
          </body>
        </html>
      `;
      res.send(html);
    }
  } catch (err) {
    console.error("Error during job scraping:", err);
    res.status(500).send(`
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #eef2f7; padding: 20px; }
            .container { max-width: 600px; margin: auto; text-align: center; }
            .button { padding: 10px 15px; background: #0073b1; color: #fff; border: none; border-radius: 4px; text-decoration: none; }
            .error { color: red; background: #fff0f0; padding: 15px; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Error</h1>
            <div class="error">
              <p>An error occurred while scraping jobs.</p>
              <p>${err.message}</p>
            </div>
            <p><a class="button" href="/">Back to Search</a></p>
          </div>
        </body>
      </html>
    `);
  }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Multi-Country Job Scraper running on port ${port}`);
});
