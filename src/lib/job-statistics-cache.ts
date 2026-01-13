import { logger } from './logger';

export interface JobStatistic {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  postedDate: string;
  extractedDate: string;
  keywords: string[];
  certificates: string[];
  industry: string;
  seniority: string;
  description: string;
}

export interface MonthlyStatistics {
  totalJobs: number;
  byDate: Record<string, number>;
  byIndustry: Record<string, number>;
  byCertificate: Record<string, number>;
  byKeyword: Record<string, number>;
  bySeniority: Record<string, number>;
  byLocation: Record<string, number>;
  byCompany: Record<string, number>;
}

export interface CurrentMonthData {
  month: string; // Format: YYYY-MM
  lastUpdated: string;
  jobs: JobStatistic[];
  statistics: MonthlyStatistics;
}

export interface ArchiveMonthData {
  month: string; // Format: YYYY-MM
  statistics: MonthlyStatistics;
  jobCount: number;
  archived: boolean;
}

export interface SummaryData {
  lastUpdated: string;
  totalJobsAllTime: number;
  currentMonth: string;
  availableArchives: string[]; // List of YYYY-MM archives
  overallStatistics: {
    totalMonths: number;
    averageJobsPerMonth: number;
    topIndustries: Record<string, number>;
    topCertificates: Record<string, number>;
    topKeywords: Record<string, number>;
  };
}

/**
 * Job Statistics Cache with Monthly Archiving
 *
 * File structure in GitHub Gist:
 * - job-statistics-current.json: Current month's full data
 * - job-statistics-YYYY-MM.json: Archived months (statistics only)
 * - job-statistics-summary.json: Overall summary and metadata
 */
export class JobStatisticsCache {
  private useGitHubGist: boolean;
  private gistId?: string;
  private currentMonthData: CurrentMonthData;
  private summaryData: SummaryData;

  constructor() {
    // Use GitHub Gist if credentials are available
    this.useGitHubGist = !!(process.env.GITHUB_TOKEN && process.env.GIST_ID);
    this.gistId = process.env.GIST_ID;

    const storageType = this.useGitHubGist
      ? 'GitHub Gist (persistent)'
      : 'Local file system';

    logger.info(`Job Statistics Cache: ${storageType}`);

    // Initialize with empty data
    const currentMonth = this.getCurrentMonthString();
    this.currentMonthData = {
      month: currentMonth,
      lastUpdated: new Date().toISOString(),
      jobs: [],
      statistics: this.createEmptyStatistics(),
    };

    this.summaryData = {
      lastUpdated: new Date().toISOString(),
      totalJobsAllTime: 0,
      currentMonth: currentMonth,
      availableArchives: [],
      overallStatistics: {
        totalMonths: 0,
        averageJobsPerMonth: 0,
        topIndustries: {},
        topCertificates: {},
        topKeywords: {},
      },
    };
  }

  /**
   * Get current month in YYYY-MM format
   */
  private getCurrentMonthString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Create empty statistics object
   */
  private createEmptyStatistics(): MonthlyStatistics {
    return {
      totalJobs: 0,
      byDate: {},
      byIndustry: {},
      byCertificate: {},
      byKeyword: {},
      bySeniority: {},
      byLocation: {},
      byCompany: {},
    };
  }

  /**
   * Load current month data and summary from GitHub Gist
   */
  async load(): Promise<void> {
    try {
      if (this.useGitHubGist) {
        await this.loadFromGitHubGist();
      } else {
        logger.info('Local file system storage not implemented for statistics');
        // Could implement local file system if needed
      }
    } catch (error) {
      logger.error('Error loading job statistics cache:', error);
      logger.info('Starting with empty cache');
    }
  }

  /**
   * Load data from GitHub Gist
   */
  private async loadFromGitHubGist(): Promise<void> {
    try {
      const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
        cache: 'no-store', // Disable caching to get fresh data
        next: { revalidate: 0 }, // Next.js specific cache control
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const gist = await response.json();

      // Load summary
      const summaryFile = gist.files['job-statistics-summary.json'];
      if (summaryFile) {
        this.summaryData = JSON.parse(summaryFile.content);
        logger.info(`✓ Loaded summary: ${this.summaryData.totalJobsAllTime} total jobs`);
      }

      // Load current month data
      const currentFile = gist.files['job-statistics-current.json'];
      if (currentFile) {
        const data: CurrentMonthData = JSON.parse(currentFile.content);

        // Check if we need to archive the current data (new month started)
        const currentMonth = this.getCurrentMonthString();
        if (data.month !== currentMonth) {
          logger.info(`Month changed from ${data.month} to ${currentMonth}. Archiving...`);
          await this.archiveMonth(data);
          // Start fresh for new month
          this.currentMonthData = {
            month: currentMonth,
            lastUpdated: new Date().toISOString(),
            jobs: [],
            statistics: this.createEmptyStatistics(),
          };
        } else {
          this.currentMonthData = data;
          logger.info(`✓ Loaded current month (${currentMonth}): ${data.jobs.length} jobs`);
        }
      }
    } catch (error: any) {
      logger.error('Error loading from GitHub Gist:', error);
      logger.info('Starting fresh with empty data.');
    }
  }

  /**
   * Archive current month data (statistics only, not full job details)
   */
  private async archiveMonth(data: CurrentMonthData): Promise<void> {
    try {
      const archiveData: ArchiveMonthData = {
        month: data.month,
        statistics: data.statistics,
        jobCount: data.jobs.length,
        archived: true,
      };

      const fileName = `job-statistics-${data.month}.json`;

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
              content: JSON.stringify(archiveData, null, 2),
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to archive month: ${response.status}`);
      }

      // Update summary with new archive
      if (!this.summaryData.availableArchives.includes(data.month)) {
        this.summaryData.availableArchives.push(data.month);
        this.summaryData.availableArchives.sort().reverse(); // Most recent first
      }

      logger.info(`✓ Archived month ${data.month} with ${data.jobs.length} jobs`);
    } catch (error) {
      logger.error(`Error archiving month ${data.month}:`, error);
      throw error;
    }
  }

  /**
   * Add a new job to current month data
   */
  addJob(job: JobStatistic): void {
    // Check if job already exists (by URL)
    const exists = this.currentMonthData.jobs.some(j => j.url === job.url);
    if (exists) {
      logger.info(`Job already exists in current month: ${job.url}`);
      return;
    }

    // Add job to current month
    this.currentMonthData.jobs.push(job);

    // Update statistics
    this.updateStatistics(job);

    logger.info(`✓ Added job to statistics: ${job.title} at ${job.company}`);
  }

  /**
   * Update statistics with new job data
   */
  private updateStatistics(job: JobStatistic): void {
    const stats = this.currentMonthData.statistics;

    // Total jobs
    stats.totalJobs++;

    // By date
    const dateKey = job.extractedDate.split('T')[0]; // YYYY-MM-DD
    stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1;

    // By industry
    if (job.industry) {
      stats.byIndustry[job.industry] = (stats.byIndustry[job.industry] || 0) + 1;
    }

    // By certificates
    job.certificates.forEach(cert => {
      stats.byCertificate[cert] = (stats.byCertificate[cert] || 0) + 1;
    });

    // By keywords
    job.keywords.forEach(keyword => {
      stats.byKeyword[keyword] = (stats.byKeyword[keyword] || 0) + 1;
    });

    // By seniority
    if (job.seniority) {
      stats.bySeniority[job.seniority] = (stats.bySeniority[job.seniority] || 0) + 1;
    }

    // By location
    if (job.location) {
      stats.byLocation[job.location] = (stats.byLocation[job.location] || 0) + 1;
    }

    // By company
    if (job.company) {
      stats.byCompany[job.company] = (stats.byCompany[job.company] || 0) + 1;
    }
  }

  /**
   * Save current month data and summary to GitHub Gist
   */
  async save(): Promise<void> {
    try {
      if (!this.useGitHubGist) {
        logger.info('GitHub Gist not configured. Skipping save.');
        return;
      }

      // Update timestamps
      const now = new Date().toISOString();
      this.currentMonthData.lastUpdated = now;
      this.summaryData.lastUpdated = now;

      // Update summary statistics
      this.updateSummary();

      // Save both files in one API call
      const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            'job-statistics-current.json': {
              content: JSON.stringify(this.currentMonthData, null, 2),
            },
            'job-statistics-summary.json': {
              content: JSON.stringify(this.summaryData, null, 2),
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const gist = await response.json();
      logger.info(`✓ Job statistics saved to GitHub Gist`);
      logger.info(`  - Gist URL: ${gist.html_url}`);
      logger.info(`  - Current month (${this.currentMonthData.month}): ${this.currentMonthData.jobs.length} jobs`);
      logger.info(`  - Total all time: ${this.summaryData.totalJobsAllTime} jobs`);
    } catch (error) {
      logger.error('Error saving job statistics:', error);
      throw error;
    }
  }

  /**
   * Update summary with current month data
   */
  private updateSummary(): void {
    // Calculate total jobs (current month + all archives)
    let totalJobs = this.currentMonthData.jobs.length;

    // Update current month
    this.summaryData.currentMonth = this.currentMonthData.month;

    // For overall statistics, we'll aggregate from current month
    // (In a real scenario, we'd load and aggregate all archives, but that's expensive)
    this.summaryData.totalJobsAllTime = totalJobs; // Simplified for now

    // Update overall top statistics (top 10 from current month)
    this.summaryData.overallStatistics.topIndustries = this.getTopN(
      this.currentMonthData.statistics.byIndustry,
      10
    );
    this.summaryData.overallStatistics.topCertificates = this.getTopN(
      this.currentMonthData.statistics.byCertificate,
      10
    );
    this.summaryData.overallStatistics.topKeywords = this.getTopN(
      this.currentMonthData.statistics.byKeyword,
      10
    );

    // Calculate average (simplified)
    const totalMonths = this.summaryData.availableArchives.length + 1; // +1 for current month
    this.summaryData.overallStatistics.totalMonths = totalMonths;
    this.summaryData.overallStatistics.averageJobsPerMonth =
      totalJobs / totalMonths;
  }

  /**
   * Get top N items from a record
   */
  private getTopN(record: Record<string, number>, n: number): Record<string, number> {
    return Object.entries(record)
      .sort(([, a], [, b]) => b - a)
      .slice(0, n)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, number>);
  }

  /**
   * Get current month data
   */
  getCurrentMonthData(): CurrentMonthData {
    return this.currentMonthData;
  }

  /**
   * Get summary data
   */
  getSummary(): SummaryData {
    return this.summaryData;
  }

  /**
   * Get archived month data
   */
  async getArchivedMonth(month: string): Promise<ArchiveMonthData | null> {
    try {
      if (!this.useGitHubGist) {
        return null;
      }

      const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
        cache: 'no-store', // Disable caching
        next: { revalidate: 0 }, // Next.js cache control
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const gist = await response.json();
      const fileName = `job-statistics-${month}.json`;
      const file = gist.files[fileName];

      if (!file) {
        logger.info(`No archive found for month: ${month}`);
        return null;
      }

      return JSON.parse(file.content);
    } catch (error) {
      logger.error(`Error loading archived month ${month}:`, error);
      return null;
    }
  }

  /**
   * Get all archived months data and aggregate statistics
   */
  async getAllArchivesAggregated(): Promise<{
    archives: ArchiveMonthData[];
    aggregated: MonthlyStatistics;
    totalJobs: number;
  }> {
    const archives: ArchiveMonthData[] = [];
    const aggregated: MonthlyStatistics = this.createEmptyStatistics();
    let totalJobs = 0;

    try {
      // Load all archives
      for (const month of this.summaryData.availableArchives) {
        const archive = await this.getArchivedMonth(month);
        if (archive) {
          archives.push(archive);

          // Aggregate statistics
          totalJobs += archive.jobCount;

          // Merge byDate
          for (const [date, count] of Object.entries(archive.statistics.byDate)) {
            aggregated.byDate[date] = (aggregated.byDate[date] || 0) + count;
          }

          // Merge byIndustry
          for (const [industry, count] of Object.entries(archive.statistics.byIndustry)) {
            aggregated.byIndustry[industry] = (aggregated.byIndustry[industry] || 0) + count;
          }

          // Merge byCertificate
          for (const [cert, count] of Object.entries(archive.statistics.byCertificate)) {
            aggregated.byCertificate[cert] = (aggregated.byCertificate[cert] || 0) + count;
          }

          // Merge byKeyword
          for (const [keyword, count] of Object.entries(archive.statistics.byKeyword)) {
            aggregated.byKeyword[keyword] = (aggregated.byKeyword[keyword] || 0) + count;
          }

          // Merge bySeniority
          for (const [level, count] of Object.entries(archive.statistics.bySeniority)) {
            aggregated.bySeniority[level] = (aggregated.bySeniority[level] || 0) + count;
          }

          // Merge byLocation
          for (const [location, count] of Object.entries(archive.statistics.byLocation)) {
            aggregated.byLocation[location] = (aggregated.byLocation[location] || 0) + count;
          }

          // Merge byCompany
          for (const [company, count] of Object.entries(archive.statistics.byCompany)) {
            aggregated.byCompany[company] = (aggregated.byCompany[company] || 0) + count;
          }
        }
      }

      // Add current month to aggregation
      totalJobs += this.currentMonthData.jobs.length;

      // Merge current month statistics
      for (const [date, count] of Object.entries(this.currentMonthData.statistics.byDate)) {
        aggregated.byDate[date] = (aggregated.byDate[date] || 0) + count;
      }
      for (const [industry, count] of Object.entries(this.currentMonthData.statistics.byIndustry)) {
        aggregated.byIndustry[industry] = (aggregated.byIndustry[industry] || 0) + count;
      }
      for (const [cert, count] of Object.entries(this.currentMonthData.statistics.byCertificate)) {
        aggregated.byCertificate[cert] = (aggregated.byCertificate[cert] || 0) + count;
      }
      for (const [keyword, count] of Object.entries(this.currentMonthData.statistics.byKeyword)) {
        aggregated.byKeyword[keyword] = (aggregated.byKeyword[keyword] || 0) + count;
      }
      for (const [level, count] of Object.entries(this.currentMonthData.statistics.bySeniority)) {
        aggregated.bySeniority[level] = (aggregated.bySeniority[level] || 0) + count;
      }
      for (const [location, count] of Object.entries(this.currentMonthData.statistics.byLocation)) {
        aggregated.byLocation[location] = (aggregated.byLocation[location] || 0) + count;
      }
      for (const [company, count] of Object.entries(this.currentMonthData.statistics.byCompany)) {
        aggregated.byCompany[company] = (aggregated.byCompany[company] || 0) + count;
      }

      aggregated.totalJobs = totalJobs;

      logger.info(`✓ Aggregated ${archives.length} archived months + current month`);
      logger.info(`  - Total jobs across all time: ${totalJobs}`);

      return { archives, aggregated, totalJobs };
    } catch (error) {
      logger.error('Error aggregating archives:', error);
      return { archives: [], aggregated, totalJobs: 0 };
    }
  }

  /**
   * Get statistics for current month
   */
  getCurrentStatistics(): MonthlyStatistics {
    return this.currentMonthData.statistics;
  }

  /**
   * Filter current month jobs by criteria
   */
  filterJobs(filters: {
    industry?: string;
    certificate?: string;
    keyword?: string;
    seniority?: string;
    location?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
  }): JobStatistic[] {
    return this.currentMonthData.jobs.filter(job => {
      // Industry filter
      if (filters.industry && job.industry !== filters.industry) {
        return false;
      }

      // Certificate filter
      if (filters.certificate && !job.certificates.includes(filters.certificate)) {
        return false;
      }

      // Keyword filter
      if (filters.keyword && !job.keywords.includes(filters.keyword)) {
        return false;
      }

      // Seniority filter
      if (filters.seniority && job.seniority !== filters.seniority) {
        return false;
      }

      // Location filter
      if (filters.location && !job.location.includes(filters.location)) {
        return false;
      }

      // Company filter
      if (filters.company && !job.company.toLowerCase().includes(filters.company.toLowerCase())) {
        return false;
      }

      // Date range filter
      if (filters.startDate) {
        const jobDate = new Date(job.extractedDate);
        const startDate = new Date(filters.startDate);
        if (jobDate < startDate) {
          return false;
        }
      }

      if (filters.endDate) {
        const jobDate = new Date(job.extractedDate);
        const endDate = new Date(filters.endDate);
        if (jobDate > endDate) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      currentMonth: this.currentMonthData.month,
      currentMonthJobs: this.currentMonthData.jobs.length,
      totalJobsAllTime: this.summaryData.totalJobsAllTime,
      availableArchives: this.summaryData.availableArchives.length,
      storageType: this.useGitHubGist ? 'GitHub Gist' : 'Local File',
    };
  }
}
