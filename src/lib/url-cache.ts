import { promises as fs } from 'fs';
import path from 'path';
import { logger } from './logger';

interface CacheData {
  urls: string[];
  lastUpdated: string;
  metadata: {
    totalUrlsCached: number;
    version: string;
  };
}

export class UrlCache {
  private cacheKey: string; // Unique key for this cache (e.g., 'url-scraper', 'url-rss')
  private cache: Set<string>;
  private cacheTimestamp?: string;
  private isDirty: boolean = false;
  private useGitHubGist: boolean;
  private gistId?: string;
  private readonly CACHE_EXPIRY_HOURS = 48;

  constructor(cacheKey: string = 'url-scraper') {
    this.cacheKey = cacheKey;
    this.cache = new Set<string>();

    // Use GitHub Gist if GITHUB_TOKEN and GIST_ID are available
    this.useGitHubGist = !!(process.env.GITHUB_TOKEN && process.env.GIST_ID);
    this.gistId = process.env.GIST_ID;

    const storageType = this.useGitHubGist
      ? 'GitHub Gist (persistent)'
      : 'Local file system';

    logger.info(`Cache storage: ${storageType}`);
    logger.info(`Cache key: ${this.cacheKey}`);
    logger.info(`Cache expiry: ${this.CACHE_EXPIRY_HOURS} hours`);
  }

  /**
   * Load cache from storage (GitHub Gist or local file)
   */
  async load(): Promise<void> {
    try {
      if (this.useGitHubGist) {
        await this.loadFromGitHubGist();
      } else {
        await this.loadFromLocalFile();
      }
    } catch (error) {
      logger.error(`Error loading cache:`, error);
      logger.info(`Starting with empty cache.`);
      this.cache = new Set<string>();
    }
  }

  /**
   * Check if cache is expired (older than 48 hours)
   */
  private isCacheExpired(lastUpdated: string): boolean {
    const cacheDate = new Date(lastUpdated);
    const now = new Date();
    const hoursDiff = (now.getTime() - cacheDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff > this.CACHE_EXPIRY_HOURS;
  }

  /**
   * Load cache from GitHub Gist
   */
  private async loadFromGitHubGist(): Promise<void> {
    try {
      const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const gist = await response.json();
      const file = gist.files[this.cacheKey + '.json'];

      if (!file) {
        logger.info(`No cache for key "${this.cacheKey}" in GitHub Gist. Starting with empty cache.`);
        this.cache = new Set<string>();
        return;
      }

      const data: CacheData = JSON.parse(file.content);

      // Check if cache is expired
      if (this.isCacheExpired(data.lastUpdated)) {
        logger.info(`⏰ Cache expired (older than ${this.CACHE_EXPIRY_HOURS} hours). Starting fresh.`);
        logger.info(`  - Last updated: ${data.lastUpdated}`);
        this.cache = new Set<string>();
        this.cacheTimestamp = new Date().toISOString();
        return;
      }

      this.cache = new Set(data.urls);
      this.cacheTimestamp = data.lastUpdated;

      logger.info(`✓ Cache loaded from GitHub Gist`);
      logger.info(`  - Gist URL: ${gist.html_url}`);
      logger.info(`  - Cache key: ${this.cacheKey}`);
      logger.info(`  - URLs in cache: ${this.cache.size}`);
      logger.info(`  - Last updated: ${data.lastUpdated}`);
      logger.info(`  - Cache version: ${data.metadata.version}`);
    } catch (error: any) {
      logger.info(`No existing cache for "${this.cacheKey}" in GitHub Gist. Starting with empty cache.`);
      this.cache = new Set<string>();
    }
  }

  /**
   * Load cache from local file system
   */
  private async loadFromLocalFile(): Promise<void> {
    const cacheDir = path.join(process.cwd(), 'cache');
    const cacheFilePath = path.join(cacheDir, this.cacheKey + '.json');

    try {
      // Ensure cache directory exists
      await fs.mkdir(cacheDir, { recursive: true });

      // Try to read existing cache file
      const fileContent = await fs.readFile(cacheFilePath, 'utf-8');
      const data: CacheData = JSON.parse(fileContent);

      // Check if cache is expired
      if (this.isCacheExpired(data.lastUpdated)) {
        logger.info(`⏰ Cache expired (older than ${this.CACHE_EXPIRY_HOURS} hours). Starting fresh.`);
        logger.info(`  - Last updated: ${data.lastUpdated}`);
        this.cache = new Set<string>();
        this.cacheTimestamp = new Date().toISOString();
        return;
      }

      this.cache = new Set(data.urls);
      this.cacheTimestamp = data.lastUpdated;

      logger.info(`✓ Cache loaded from local file`);
      logger.info(`  - File path: ${cacheFilePath}`);
      logger.info(`  - Cache key: ${this.cacheKey}`);
      logger.info(`  - URLs in cache: ${this.cache.size}`);
      logger.info(`  - Last updated: ${data.lastUpdated}`);
      logger.info(`  - Cache version: ${data.metadata.version}`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        logger.info(`No existing cache file for "${this.cacheKey}". Starting with empty cache.`);
        // Ensure directory exists for when we save
        await fs.mkdir(cacheDir, { recursive: true });
      } else {
        throw error;
      }
      this.cache = new Set<string>();
      this.cacheTimestamp = new Date().toISOString();
    }
  }

  /**
   * Save cache to storage (GitHub Gist or local file)
   */
  async save(): Promise<void> {
    try {
      if (this.useGitHubGist) {
        await this.saveToGitHubGist();
      } else {
        await this.saveToLocalFile();
      }
      this.isDirty = false;
    } catch (error) {
      logger.error(`Error saving cache:`, error);
      throw error;
    }
  }

  /**
   * Save cache to GitHub Gist
   */
  private async saveToGitHubGist(): Promise<void> {
    const now = new Date().toISOString();
    this.cacheTimestamp = this.cacheTimestamp || now;

    const data: CacheData = {
      urls: Array.from(this.cache),
      lastUpdated: this.cacheTimestamp,
      metadata: {
        totalUrlsCached: this.cache.size,
        version: '1.0.0',
      },
    };

    const fileName = this.cacheKey + '.json';

    const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: {
          [fileName]: {
            content: JSON.stringify(data, null, 2),
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const gist = await response.json();

    logger.info(`✓ Cache saved to GitHub Gist`);
    logger.info(`  - Gist URL: ${gist.html_url}`);
    logger.info(`  - Cache key: ${this.cacheKey}`);
    logger.info(`  - Total URLs cached: ${this.cache.size}`);
  }

  /**
   * Save cache to local file system
   */
  private async saveToLocalFile(): Promise<void> {
    const cacheDir = path.join(process.cwd(), 'cache');
    const cacheFilePath = path.join(cacheDir, this.cacheKey + '.json');

    const now = new Date().toISOString();
    this.cacheTimestamp = this.cacheTimestamp || now;

    const data: CacheData = {
      urls: Array.from(this.cache),
      lastUpdated: this.cacheTimestamp,
      metadata: {
        totalUrlsCached: this.cache.size,
        version: '1.0.0',
      },
    };

    await fs.writeFile(
      cacheFilePath,
      JSON.stringify(data, null, 2),
      'utf-8'
    );

    logger.info(`✓ Cache saved to local file`);
    logger.info(`  - File path: ${cacheFilePath}`);
    logger.info(`  - Cache key: ${this.cacheKey}`);
    logger.info(`  - Total URLs cached: ${this.cache.size}`);
  }

  /**
   * Check if URL exists in cache
   */
  has(url: string): boolean {
    const normalizedUrl = url.toLowerCase().trim();
    return this.cache.has(normalizedUrl);
  }

  /**
   * Add URL to cache
   */
  add(url: string): boolean {
    const normalizedUrl = url.toLowerCase().trim();

    if (this.cache.has(normalizedUrl)) {
      return false; // Already exists
    }

    this.cache.add(normalizedUrl);
    this.isDirty = true;
    return true; // Successfully added
  }

  /**
   * Get all URLs in cache
   */
  getAll(): string[] {
    return Array.from(this.cache);
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clear all URLs from cache
   */
  clear(): void {
    this.cache.clear();
    this.isDirty = true;
    logger.info(`Cache cleared`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      totalUrls: this.cache.size,
      storageType: this.useGitHubGist ? 'GitHub Gist' : 'Local File',
      cacheKey: this.cacheKey,
      isDirty: this.isDirty,
    };
  }

  /**
   * Log all cached URLs
   */
  logAll(): void {
    logger.info(`\n=== Cache Contents (${this.cache.size} URLs) ===`);
    const urls = Array.from(this.cache);
    urls.forEach((url, index) => {
      logger.info(`${index + 1}. ${url}`);
    });
  }
}
