import { JobItem } from "@/types/job";

export class RSSParseError extends Error {
  constructor(message: string, public readonly feedUrl: string) {
    super(message);
    this.name = "RSSParseError";
  }
}

/**
 * Parses a single RSS feed and extracts job items
 */
async function parseSingleFeed(url: string): Promise<JobItem[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobMonitor/1.0)',
      },
    });

    if (!response.ok) {
      throw new RSSParseError(
        `Failed to fetch feed: ${response.status} ${response.statusText}`,
        url
      );
    }

    const xmlText = await response.text();
    return extractJobsFromXML(xmlText);
  } catch (error) {
    if (error instanceof RSSParseError) {
      throw error;
    }
    throw new RSSParseError(
      `Error parsing feed: ${error instanceof Error ? error.message : String(error)}`,
      url
    );
  }
}

/**
 * Extracts job items from RSS XML text
 */
function extractJobsFromXML(xmlText: string): JobItem[] {
  const items: JobItem[] = [];
  const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/g) || [];

  for (const itemXml of itemMatches) {
    const title = extractXMLTag(itemXml, 'title');
    const link = extractXMLTag(itemXml, 'link');
    const pubDate = extractXMLTag(itemXml, 'pubDate');
    const description = extractXMLTag(itemXml, 'description');

    if (title && link && pubDate) {
      items.push({
        title: cleanCDATA(title),
        link: link.trim(),
        pubDate: pubDate.trim(),
        description: cleanCDATA(description),
      });
    }
  }

  return items;
}

/**
 * Extracts content from an XML tag
 */
function extractXMLTag(xml: string, tagName: string): string {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? match[1] : "";
}

/**
 * Removes CDATA tags and trims content
 */
function cleanCDATA(text: string): string {
  return text.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
}

/**
 * Parses multiple RSS feeds and returns deduplicated job items
 */
export async function parseRSSFeeds(feedUrls: string[]): Promise<JobItem[]> {
  const feedPromises = feedUrls.map(url =>
    parseSingleFeed(url).catch(error => {
      console.error(`Error fetching feed ${url}:`, error);
      return [] as JobItem[];
    })
  );

  const feedResults = await Promise.all(feedPromises);

  // Deduplicate jobs by link (in-memory only)
  // Only consider URLs that contain "http" as valid
  const seenLinks = new Set<string>();
  const allJobs: JobItem[] = [];

  for (const jobs of feedResults) {
    for (const job of jobs) {
      const normalizedLink = job.link.toLowerCase().trim();

      // Skip jobs with invalid URLs (must contain http)
      if (!normalizedLink.includes('http')) {
        console.warn(`Skipping job with invalid URL: "${job.link}" - ${job.title}`);
        continue;
      }

      if (!seenLinks.has(normalizedLink)) {
        seenLinks.add(normalizedLink);
        allJobs.push(job);
      }
    }
  }

  return allJobs;
}

/**
 * Filters jobs posted within the specified time interval
 */
export function filterRecentJobs(
  jobs: JobItem[],
  intervalMinutes: number
): JobItem[] {
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - (intervalMinutes + 1) * 60 * 1000);

  return jobs.filter(job => {
    try {
      const jobDate = new Date(job.pubDate);
      return jobDate >= cutoffTime && jobDate <= now;
    } catch {
      // Invalid date format, skip this job
      return false;
    }
  });
}
