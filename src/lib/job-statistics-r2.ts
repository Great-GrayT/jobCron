import { logger } from './logger';
import { SalaryData } from './salary-extractor';
import { getR2Storage, Manifest, ManifestMonth, ManifestDay } from './r2-storage';

/**
 * Normalize city names for consistent statistics
 */
function normalizeCity(cityName: string | null): string | null {
  if (!cityName) return null;

  const normalized = cityName
    .replace(/\s+Area$/i, '')
    .replace(/^City of\s+/i, '')
    .replace(/^Greater\s+/i, '')
    .trim();

  if (/^England$/i.test(normalized) ||
      /^Scotland$/i.test(normalized) ||
      /^Wales$/i.test(normalized) ||
      /^United Kingdom$/i.test(normalized)) {
    return null;
  }

  return normalized;
}

// Re-export existing interfaces for compatibility
export interface JobStatistic {
  id: string;
  title: string;
  company: string;
  location: string;
  country: string | null;
  city: string | null;
  region: 'Europe' | 'America' | 'Middle East' | 'Asia' | 'Africa' | 'Oceania' | null;
  url: string;
  postedDate: string;
  extractedDate: string;
  keywords: string[];
  certificates: string[];
  industry: string;
  seniority: string;
  description: string;
  salary?: SalaryData | null;
  software?: string[];
  programmingSkills?: string[];
  yearsExperience?: string | null;
  academicDegrees?: string[];
}

/**
 * Job metadata (lightweight, for filtering)
 * ~300-500 bytes per job
 */
export interface JobMetadata {
  id: string;
  title: string;
  company: string;
  location: string;
  country: string | null;
  city: string | null;
  region: 'Europe' | 'America' | 'Middle East' | 'Asia' | 'Africa' | 'Oceania' | null;
  url: string;
  postedDate: string;
  extractedDate: string;
  keywords: string[];
  certificates: string[];
  industry: string;
  seniority: string;
  salary?: SalaryData | null;
  software?: string[];
  programmingSkills?: string[];
  yearsExperience?: string | null;
  academicDegrees?: string[];
}

/**
 * Job description (heavy content, loaded on-demand)
 * ~2-4KB per job
 */
export interface JobDescription {
  id: string;
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
  byCountry: Record<string, number>;
  byCity: Record<string, number>;
  byRegion: Record<string, number>;
  byCompany: Record<string, number>;
  bySoftware: Record<string, number>;
  byProgrammingSkill: Record<string, number>;
  byYearsExperience: Record<string, number>;
  byAcademicDegree: Record<string, number>;
  salaryStats?: {
    totalWithSalary: number;
    averageSalary: number | null;
    medianSalary: number | null;
    byIndustry: Record<string, { avg: number; median: number; count: number }>;
    bySeniority: Record<string, { avg: number; median: number; count: number }>;
    byLocation: Record<string, { avg: number; median: number; count: number }>;
    byCountry: Record<string, { avg: number; median: number; count: number }>;
    byCity: Record<string, { avg: number; median: number; count: number }>;
    byCurrency: Record<string, number>;
    salaryRanges: {
      '0-30k': number;
      '30-50k': number;
      '50-75k': number;
      '75-100k': number;
      '100-150k': number;
      '150k+': number;
    };
  };
}

export interface CurrentMonthData {
  month: string;
  lastUpdated: string;
  jobs: JobStatistic[];
  statistics: MonthlyStatistics;
}

export interface ArchiveMonthData {
  month: string;
  statistics: MonthlyStatistics;
  jobCount: number;
  archived: boolean;
}

export interface SummaryData {
  lastUpdated: string;
  totalJobsAllTime: number;
  currentMonth: string;
  availableArchives: string[];
  overallStatistics: {
    totalMonths: number;
    averageJobsPerMonth: number;
    topIndustries: Record<string, number>;
    topCertificates: Record<string, number>;
    topKeywords: Record<string, number>;
  };
}

/**
 * R2-based Job Statistics Cache
 *
 * File structure in R2:
 * - manifest.json                          (index of all data)
 * - url-index.json                         (set of all job URLs for deduplication)
 * - stats/YYYY-MM.json                     (pre-computed statistics per month)
 * - metadata/YYYY/MM/day-DD.ndjson.gz      (job metadata, ~150KB/day)
 * - descriptions/YYYY/MM/day-DD.ndjson.gz  (job descriptions, ~1.5MB/day)
 */
export class JobStatisticsCacheR2 {
  private r2 = getR2Storage();
  private manifest: Manifest | null = null;
  private pendingJobs: Map<string, JobStatistic[]> = new Map(); // date -> jobs
  private currentMonthStats: MonthlyStatistics | null = null;
  private urlIndex: Set<string> = new Set(); // All known job URLs for deduplication
  private loaded = false;

  constructor() {
    logger.info('Job Statistics Cache (R2): Initialized');
  }

  private getCurrentMonthString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private getDateString(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private createEmptyStatistics(): MonthlyStatistics {
    return {
      totalJobs: 0,
      byDate: {},
      byIndustry: {},
      byCertificate: {},
      byKeyword: {},
      bySeniority: {},
      byLocation: {},
      byCountry: {},
      byCity: {},
      byRegion: {},
      byCompany: {},
      bySoftware: {},
      byProgrammingSkill: {},
      byYearsExperience: {},
      byAcademicDegree: {},
      salaryStats: {
        totalWithSalary: 0,
        averageSalary: null,
        medianSalary: null,
        byIndustry: {},
        bySeniority: {},
        byLocation: {},
        byCountry: {},
        byCity: {},
        byCurrency: {},
        salaryRanges: {
          '0-30k': 0,
          '30-50k': 0,
          '50-75k': 0,
          '75-100k': 0,
          '100-150k': 0,
          '150k+': 0,
        },
      },
    };
  }

  /**
   * Load manifest, URL index, and current month stats from R2
   */
  async load(): Promise<void> {
    try {
      if (!this.r2.isAvailable()) {
        logger.warn('R2 not configured, using empty state');
        this.manifest = await this.createEmptyManifest();
        this.currentMonthStats = this.createEmptyStatistics();
        this.urlIndex = new Set();
        this.loaded = true;
        return;
      }

      // Load manifest and URL index in parallel
      const [manifest, urlIndexData] = await Promise.all([
        this.r2.getManifest(),
        this.r2.getJSON<{ urls: string[] }>('url-index.json'),
      ]);

      this.manifest = manifest;
      logger.info(`✓ Loaded manifest: ${this.manifest.totalJobsAllTime} total jobs`);

      // Load URL index for deduplication
      if (urlIndexData?.urls) {
        this.urlIndex = new Set(urlIndexData.urls);
        logger.info(`✓ Loaded URL index: ${this.urlIndex.size} known URLs`);
      } else {
        this.urlIndex = new Set();
        logger.info('No URL index found, starting fresh');
      }

      // Check for month change
      const currentMonth = this.getCurrentMonthString();
      if (this.manifest.currentMonth !== currentMonth) {
        logger.info(`Month changed from ${this.manifest.currentMonth} to ${currentMonth}`);
        // Archive the old month if it has data
        if (this.manifest.months[this.manifest.currentMonth]?.totalJobs > 0) {
          // Old month is already saved, just update manifest
          if (!this.manifest.availableMonths.includes(this.manifest.currentMonth)) {
            this.manifest.availableMonths.unshift(this.manifest.currentMonth);
          }
        }
        this.manifest.currentMonth = currentMonth;
        await this.r2.saveManifest(this.manifest);
      }

      // Load current month stats
      const statsKey = `stats/${currentMonth}.json`;
      this.currentMonthStats = await this.r2.getJSON<MonthlyStatistics>(statsKey);

      if (!this.currentMonthStats) {
        this.currentMonthStats = this.createEmptyStatistics();
        logger.info(`Starting fresh statistics for ${currentMonth}`);
      } else {
        logger.info(`✓ Loaded stats for ${currentMonth}: ${this.currentMonthStats.totalJobs} jobs`);
      }

      this.loaded = true;
    } catch (error) {
      logger.error('Error loading from R2:', error);
      this.manifest = await this.createEmptyManifest();
      this.currentMonthStats = this.createEmptyStatistics();
      this.urlIndex = new Set();
      this.loaded = true;
    }
  }

  private async createEmptyManifest(): Promise<Manifest> {
    const currentMonth = this.getCurrentMonthString();
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      currentMonth,
      months: {},
      availableMonths: [],
      totalJobsAllTime: 0,
      schema: 'v1',
    };
  }

  /**
   * Split job into metadata and description
   */
  private splitJob(job: JobStatistic): { metadata: JobMetadata; description: JobDescription } {
    const { description, ...rest } = job;
    return {
      metadata: rest as JobMetadata,
      description: { id: job.id, description },
    };
  }

  /**
   * Combine metadata and description back into full job
   */
  private combineJob(metadata: JobMetadata, description: JobDescription): JobStatistic {
    return {
      ...metadata,
      description: description.description,
    };
  }

  /**
   * Add a job to the pending queue (will be saved on save())
   */
  addJob(job: JobStatistic): boolean {
    if (!this.loaded) {
      logger.warn('Cache not loaded yet');
      return false;
    }

    // Check if job already exists in R2 (using URL index)
    if (this.urlIndex.has(job.url)) {
      // Don't log every duplicate - too noisy
      return false;
    }

    // Check for duplicates in pending jobs (same session)
    for (const jobs of this.pendingJobs.values()) {
      if (jobs.some(j => j.url === job.url)) {
        return false;
      }
    }

    // Add to URL index immediately to prevent duplicates in same batch
    this.urlIndex.add(job.url);

    // Group by extraction date
    const dateKey = this.getDateString(job.extractedDate);

    if (!this.pendingJobs.has(dateKey)) {
      this.pendingJobs.set(dateKey, []);
    }

    this.pendingJobs.get(dateKey)!.push(job);

    // Update statistics
    this.updateStatistics(job);

    logger.info(`✓ Queued job: ${job.title} at ${job.company} (${dateKey})`);
    return true;
  }

  /**
   * Update statistics with new job data
   */
  private updateStatistics(job: JobStatistic): void {
    if (!this.currentMonthStats) {
      this.currentMonthStats = this.createEmptyStatistics();
    }

    const stats = this.currentMonthStats;

    stats.totalJobs++;

    const dateKey = this.getDateString(job.extractedDate);
    stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1;

    if (job.industry) {
      stats.byIndustry[job.industry] = (stats.byIndustry[job.industry] || 0) + 1;
    }

    job.certificates.forEach(cert => {
      stats.byCertificate[cert] = (stats.byCertificate[cert] || 0) + 1;
    });

    job.keywords.forEach(keyword => {
      stats.byKeyword[keyword] = (stats.byKeyword[keyword] || 0) + 1;
    });

    if (job.seniority) {
      stats.bySeniority[job.seniority] = (stats.bySeniority[job.seniority] || 0) + 1;
    }

    if (job.location) {
      stats.byLocation[job.location] = (stats.byLocation[job.location] || 0) + 1;
    }

    if (job.country) {
      stats.byCountry[job.country] = (stats.byCountry[job.country] || 0) + 1;
    }

    const normalizedCity = normalizeCity(job.city);
    if (normalizedCity) {
      stats.byCity[normalizedCity] = (stats.byCity[normalizedCity] || 0) + 1;
    }

    if (job.region) {
      stats.byRegion[job.region] = (stats.byRegion[job.region] || 0) + 1;
    }

    if (job.company) {
      stats.byCompany[job.company] = (stats.byCompany[job.company] || 0) + 1;
    }

    if (job.software) {
      job.software.forEach(soft => {
        stats.bySoftware[soft] = (stats.bySoftware[soft] || 0) + 1;
      });
    }

    if (job.programmingSkills) {
      job.programmingSkills.forEach(skill => {
        stats.byProgrammingSkill[skill] = (stats.byProgrammingSkill[skill] || 0) + 1;
      });
    }

    if (job.yearsExperience) {
      stats.byYearsExperience[job.yearsExperience] = (stats.byYearsExperience[job.yearsExperience] || 0) + 1;
    }

    if (job.academicDegrees) {
      job.academicDegrees.forEach(degree => {
        stats.byAcademicDegree[degree] = (stats.byAcademicDegree[degree] || 0) + 1;
      });
    }

    // Update salary stats
    this.updateSalaryStats(job);
  }

  private updateSalaryStats(job: JobStatistic): void {
    if (!job.salary || !this.currentMonthStats) return;

    const stats = this.currentMonthStats;
    if (!stats.salaryStats) {
      stats.salaryStats = {
        totalWithSalary: 0,
        averageSalary: null,
        medianSalary: null,
        byIndustry: {},
        bySeniority: {},
        byLocation: {},
        byCountry: {},
        byCity: {},
        byCurrency: {},
        salaryRanges: {
          '0-30k': 0,
          '30-50k': 0,
          '50-75k': 0,
          '75-100k': 0,
          '100-150k': 0,
          '150k+': 0,
        },
      };
    }

    stats.salaryStats.totalWithSalary++;

    const midpoint = job.salary.min !== null && job.salary.max !== null
      ? (job.salary.min + job.salary.max) / 2
      : (job.salary.min || job.salary.max || 0);

    if (midpoint > 0) {
      stats.salaryStats.byCurrency[job.salary.currency] =
        (stats.salaryStats.byCurrency[job.salary.currency] || 0) + 1;

      if (midpoint < 30000) {
        stats.salaryStats.salaryRanges['0-30k']++;
      } else if (midpoint < 50000) {
        stats.salaryStats.salaryRanges['30-50k']++;
      } else if (midpoint < 75000) {
        stats.salaryStats.salaryRanges['50-75k']++;
      } else if (midpoint < 100000) {
        stats.salaryStats.salaryRanges['75-100k']++;
      } else if (midpoint < 150000) {
        stats.salaryStats.salaryRanges['100-150k']++;
      } else {
        stats.salaryStats.salaryRanges['150k+']++;
      }
    }
  }

  /**
   * Save all pending jobs and updated statistics to R2
   */
  async save(): Promise<void> {
    if (!this.r2.isAvailable()) {
      logger.warn('R2 not configured, skipping save');
      return;
    }

    if (!this.manifest) {
      await this.load();
    }

    const currentMonth = this.getCurrentMonthString();
    const [year, month] = currentMonth.split('-');

    // Ensure month entry exists in manifest
    if (!this.manifest!.months[currentMonth]) {
      this.manifest!.months[currentMonth] = {
        stats: `stats/${currentMonth}.json`,
        totalJobs: 0,
        days: [],
      };
    }

    const monthData = this.manifest!.months[currentMonth];

    // Save each day's data
    for (const [dateKey, jobs] of this.pendingJobs.entries()) {
      if (jobs.length === 0) continue;

      const day = dateKey.split('-')[2]; // DD

      // Load existing data for this day
      const metadataKey = `metadata/${year}/${month}/day-${day}.ndjson.gz`;
      const descriptionsKey = `descriptions/${year}/${month}/day-${day}.ndjson.gz`;

      const existingMetadata = await this.r2.getNDJSONGzipped<JobMetadata>(metadataKey);
      const existingDescriptions = await this.r2.getNDJSONGzipped<JobDescription>(descriptionsKey);

      // Merge with new jobs (avoiding duplicates)
      const existingUrls = new Set(existingMetadata.map(m => m.url));
      const newJobs = jobs.filter(j => !existingUrls.has(j.url));

      if (newJobs.length === 0) {
        logger.info(`No new jobs to save for ${dateKey}`);
        continue;
      }

      // Split new jobs
      const newMetadata: JobMetadata[] = [];
      const newDescriptions: JobDescription[] = [];

      for (const job of newJobs) {
        const { metadata, description } = this.splitJob(job);
        newMetadata.push(metadata);
        newDescriptions.push(description);
      }

      // Combine and save
      const allMetadata = [...existingMetadata, ...newMetadata];
      const allDescriptions = [...existingDescriptions, ...newDescriptions];

      const metadataBytes = await this.r2.putNDJSONGzipped(metadataKey, allMetadata);
      const descriptionsBytes = await this.r2.putNDJSONGzipped(descriptionsKey, allDescriptions);

      // Update manifest day entry
      const existingDayIndex = monthData.days.findIndex(d => d.date === dateKey);
      const dayEntry: ManifestDay = {
        date: dateKey,
        metadata: metadataKey,
        descriptions: descriptionsKey,
        jobCount: allMetadata.length,
        metadataBytes,
        descriptionsBytes,
      };

      if (existingDayIndex >= 0) {
        monthData.days[existingDayIndex] = dayEntry;
      } else {
        monthData.days.push(dayEntry);
        monthData.days.sort((a, b) => a.date.localeCompare(b.date));
      }

      logger.info(`✓ Saved ${newJobs.length} new jobs for ${dateKey}`);
    }

    // Update month totals
    monthData.totalJobs = monthData.days.reduce((sum, d) => sum + d.jobCount, 0);

    // Save statistics
    if (this.currentMonthStats) {
      await this.r2.putJSON(`stats/${currentMonth}.json`, this.currentMonthStats, 'public, max-age=60');
      logger.info(`✓ Saved stats for ${currentMonth}: ${this.currentMonthStats.totalJobs} jobs`);
    }

    // Update manifest totals
    this.manifest!.totalJobsAllTime = Object.values(this.manifest!.months)
      .reduce((sum, m) => sum + m.totalJobs, 0);

    // Update available months
    this.manifest!.availableMonths = Object.keys(this.manifest!.months)
      .filter(m => this.manifest!.months[m].totalJobs > 0)
      .sort()
      .reverse();

    // Save manifest
    await this.r2.saveManifest(this.manifest!);

    // Save URL index for deduplication (critical for preventing duplicates)
    await this.r2.putJSON('url-index.json', {
      urls: Array.from(this.urlIndex),
      updatedAt: new Date().toISOString(),
      count: this.urlIndex.size,
    }, 'public, max-age=60');
    logger.info(`✓ Saved URL index: ${this.urlIndex.size} URLs`);

    // Clear pending jobs
    this.pendingJobs.clear();

    logger.info(`✓ Saved to R2. Total jobs all time: ${this.manifest!.totalJobsAllTime}`);
  }

  /**
   * Get current month data (compatible with old interface)
   */
  async getCurrentMonthData(): Promise<CurrentMonthData> {
    if (!this.loaded) await this.load();

    const currentMonth = this.getCurrentMonthString();
    const jobs = await this.loadJobsForMonth(currentMonth);

    return {
      month: currentMonth,
      lastUpdated: this.manifest?.updatedAt || new Date().toISOString(),
      jobs,
      statistics: this.currentMonthStats || this.createEmptyStatistics(),
    };
  }

  /**
   * Load all jobs for a specific month
   */
  async loadJobsForMonth(month: string): Promise<JobStatistic[]> {
    if (!this.manifest?.months[month]) {
      return [];
    }

    const monthData = this.manifest.months[month];
    const jobs: JobStatistic[] = [];

    // Load each day's data in parallel
    const dayPromises = monthData.days.map(async (day) => {
      const [metadata, descriptions] = await Promise.all([
        this.r2.getNDJSONGzipped<JobMetadata>(day.metadata),
        this.r2.getNDJSONGzipped<JobDescription>(day.descriptions),
      ]);

      // Create description lookup
      const descMap = new Map(descriptions.map(d => [d.id, d]));

      // Combine
      return metadata.map(m => {
        const desc = descMap.get(m.id);
        return this.combineJob(m, desc || { id: m.id, description: '' });
      });
    });

    const dayResults = await Promise.all(dayPromises);
    for (const dayJobs of dayResults) {
      jobs.push(...dayJobs);
    }

    // Add pending jobs for this month
    for (const [dateKey, pendingJobs] of this.pendingJobs.entries()) {
      if (dateKey.startsWith(month)) {
        jobs.push(...pendingJobs);
      }
    }

    return jobs;
  }

  /**
   * Load jobs for a specific date range
   */
  async loadJobsForDateRange(startDate: string, endDate: string): Promise<JobStatistic[]> {
    if (!this.manifest) await this.load();

    const jobs: JobStatistic[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (const [month, monthData] of Object.entries(this.manifest!.months)) {
      for (const day of monthData.days) {
        const dayDate = new Date(day.date);
        if (dayDate >= start && dayDate <= end) {
          const [metadata, descriptions] = await Promise.all([
            this.r2.getNDJSONGzipped<JobMetadata>(day.metadata),
            this.r2.getNDJSONGzipped<JobDescription>(day.descriptions),
          ]);

          const descMap = new Map(descriptions.map(d => [d.id, d]));
          for (const m of metadata) {
            const desc = descMap.get(m.id);
            jobs.push(this.combineJob(m, desc || { id: m.id, description: '' }));
          }
        }
      }
    }

    return jobs;
  }

  /**
   * Load only metadata for a month (no descriptions - for filtering)
   */
  async loadMetadataForMonth(month: string): Promise<JobMetadata[]> {
    if (!this.manifest?.months[month]) {
      return [];
    }

    const monthData = this.manifest.months[month];
    const metadata: JobMetadata[] = [];

    const promises = monthData.days.map(day =>
      this.r2.getNDJSONGzipped<JobMetadata>(day.metadata)
    );

    const results = await Promise.all(promises);
    for (const dayMetadata of results) {
      metadata.push(...dayMetadata);
    }

    return metadata;
  }

  /**
   * Load description for a specific job
   */
  async loadJobDescription(jobId: string, extractedDate: string): Promise<string | null> {
    const dateKey = this.getDateString(extractedDate);
    const [year, month, day] = dateKey.split('-');

    const descriptionsKey = `descriptions/${year}/${month}/day-${day}.ndjson.gz`;
    const descriptions = await this.r2.getNDJSONGzipped<JobDescription>(descriptionsKey);

    const desc = descriptions.find(d => d.id === jobId);
    return desc?.description || null;
  }

  /**
   * Get summary data (compatible with old interface)
   */
  getSummary(): SummaryData {
    const stats = this.currentMonthStats || this.createEmptyStatistics();

    return {
      lastUpdated: this.manifest?.updatedAt || new Date().toISOString(),
      totalJobsAllTime: this.manifest?.totalJobsAllTime || 0,
      currentMonth: this.manifest?.currentMonth || this.getCurrentMonthString(),
      availableArchives: this.manifest?.availableMonths.filter(m => m !== this.manifest?.currentMonth) || [],
      overallStatistics: {
        totalMonths: this.manifest?.availableMonths.length || 0,
        averageJobsPerMonth: this.manifest?.totalJobsAllTime
          ? Math.round(this.manifest.totalJobsAllTime / Math.max(this.manifest.availableMonths.length, 1))
          : 0,
        topIndustries: this.getTopN(stats.byIndustry, 10),
        topCertificates: this.getTopN(stats.byCertificate, 10),
        topKeywords: this.getTopN(stats.byKeyword, 10),
      },
    };
  }

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
   * Get statistics for a specific month
   */
  async getMonthStatistics(month: string): Promise<MonthlyStatistics | null> {
    const statsKey = `stats/${month}.json`;
    return await this.r2.getJSON<MonthlyStatistics>(statsKey);
  }

  /**
   * Get all archives aggregated (compatible with old interface)
   */
  async getAllArchivesAggregated(): Promise<{
    archives: ArchiveMonthData[];
    aggregated: MonthlyStatistics;
    totalJobs: number;
  }> {
    if (!this.manifest) await this.load();

    const archives: ArchiveMonthData[] = [];
    const aggregated = this.createEmptyStatistics();
    let totalJobs = 0;

    for (const month of this.manifest!.availableMonths) {
      const stats = await this.getMonthStatistics(month);
      if (!stats) continue;

      const monthData = this.manifest!.months[month];
      archives.push({
        month,
        statistics: stats,
        jobCount: monthData?.totalJobs || stats.totalJobs,
        archived: month !== this.manifest!.currentMonth,
      });

      totalJobs += stats.totalJobs;

      // Merge statistics
      this.mergeStatistics(aggregated, stats);
    }

    aggregated.totalJobs = totalJobs;

    return { archives, aggregated, totalJobs };
  }

  private mergeStatistics(target: MonthlyStatistics, source: MonthlyStatistics): void {
    for (const [key, value] of Object.entries(source.byDate)) {
      target.byDate[key] = (target.byDate[key] || 0) + value;
    }
    for (const [key, value] of Object.entries(source.byIndustry)) {
      target.byIndustry[key] = (target.byIndustry[key] || 0) + value;
    }
    for (const [key, value] of Object.entries(source.byCertificate)) {
      target.byCertificate[key] = (target.byCertificate[key] || 0) + value;
    }
    for (const [key, value] of Object.entries(source.byKeyword)) {
      target.byKeyword[key] = (target.byKeyword[key] || 0) + value;
    }
    for (const [key, value] of Object.entries(source.bySeniority)) {
      target.bySeniority[key] = (target.bySeniority[key] || 0) + value;
    }
    for (const [key, value] of Object.entries(source.byLocation)) {
      target.byLocation[key] = (target.byLocation[key] || 0) + value;
    }
    for (const [key, value] of Object.entries(source.byCountry || {})) {
      target.byCountry[key] = (target.byCountry[key] || 0) + value;
    }
    for (const [key, value] of Object.entries(source.byCity || {})) {
      target.byCity[key] = (target.byCity[key] || 0) + value;
    }
    for (const [key, value] of Object.entries(source.byRegion || {})) {
      target.byRegion[key] = (target.byRegion[key] || 0) + value;
    }
    for (const [key, value] of Object.entries(source.byCompany)) {
      target.byCompany[key] = (target.byCompany[key] || 0) + value;
    }
    for (const [key, value] of Object.entries(source.bySoftware || {})) {
      target.bySoftware[key] = (target.bySoftware[key] || 0) + value;
    }
    for (const [key, value] of Object.entries(source.byProgrammingSkill || {})) {
      target.byProgrammingSkill[key] = (target.byProgrammingSkill[key] || 0) + value;
    }
    for (const [key, value] of Object.entries(source.byYearsExperience || {})) {
      target.byYearsExperience[key] = (target.byYearsExperience[key] || 0) + value;
    }
    for (const [key, value] of Object.entries(source.byAcademicDegree || {})) {
      target.byAcademicDegree[key] = (target.byAcademicDegree[key] || 0) + value;
    }
  }

  /**
   * Check if job URL already exists
   */
  async jobExists(url: string): Promise<boolean> {
    // Check pending jobs first
    for (const jobs of this.pendingJobs.values()) {
      if (jobs.some(j => j.url === url)) {
        return true;
      }
    }

    // Check current month in R2
    const currentMonth = this.getCurrentMonthString();
    const metadata = await this.loadMetadataForMonth(currentMonth);
    return metadata.some(m => m.url === url);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      currentMonth: this.manifest?.currentMonth || this.getCurrentMonthString(),
      currentMonthJobs: this.currentMonthStats?.totalJobs || 0,
      totalJobsAllTime: this.manifest?.totalJobsAllTime || 0,
      availableArchives: this.manifest?.availableMonths.length || 0,
      storageType: 'Cloudflare R2',
      pendingJobs: Array.from(this.pendingJobs.values()).reduce((sum, jobs) => sum + jobs.length, 0),
    };
  }

  /**
   * Get current month statistics
   */
  getCurrentStatistics(): MonthlyStatistics {
    return this.currentMonthStats || this.createEmptyStatistics();
  }

  /**
   * Get manifest (for API responses)
   */
  getManifest(): Manifest | null {
    return this.manifest;
  }
}

// Singleton instance
let cacheInstance: JobStatisticsCacheR2 | null = null;

export function getJobStatisticsCacheR2(): JobStatisticsCacheR2 {
  if (!cacheInstance) {
    cacheInstance = new JobStatisticsCacheR2();
  }
  return cacheInstance;
}
