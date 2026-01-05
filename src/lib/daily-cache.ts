/**
 * Daily cache system for tracking sent jobs
 * Automatically clears at midnight (end of day)
 */

interface CacheEntry {
  date: string; // YYYY-MM-DD format
  sentJobs: Set<string>;
}

class DailyJobCache {
  private cache: CacheEntry | null = null;

  /**
   * Get today's date in YYYY-MM-DD format
   */
  private getTodayDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * Check if cache is still valid for today
   */
  private isCacheValid(): boolean {
    if (!this.cache) return false;
    return this.cache.date === this.getTodayDate();
  }

  /**
   * Initialize or reset cache for today
   */
  private initializeCache(): void {
    this.cache = {
      date: this.getTodayDate(),
      sentJobs: new Set<string>()
    };
  }

  /**
   * Check if a job has already been sent today
   * @param jobTitle - The job title (used as unique identifier)
   * @returns true if job was already sent today, false otherwise
   */
  public hasBeenSent(jobTitle: string): boolean {
    // If cache is invalid (new day), reset it
    if (!this.isCacheValid()) {
      this.initializeCache();
      return false;
    }

    return this.cache!.sentJobs.has(jobTitle);
  }

  /**
   * Mark a job as sent for today
   * @param jobTitle - The job title to mark as sent
   */
  public markAsSent(jobTitle: string): void {
    // If cache is invalid (new day), reset it
    if (!this.isCacheValid()) {
      this.initializeCache();
    }

    this.cache!.sentJobs.add(jobTitle);
  }

  /**
   * Mark multiple jobs as sent
   * @param jobTitles - Array of job titles to mark as sent
   */
  public markMultipleAsSent(jobTitles: string[]): void {
    // If cache is invalid (new day), reset it
    if (!this.isCacheValid()) {
      this.initializeCache();
    }

    jobTitles.forEach(title => this.cache!.sentJobs.add(title));
  }

  /**
   * Get the number of jobs sent today
   */
  public getSentCount(): number {
    if (!this.isCacheValid()) {
      return 0;
    }
    return this.cache!.sentJobs.size;
  }

  /**
   * Manually clear the cache (for testing purposes)
   */
  public clear(): void {
    this.cache = null;
  }

  /**
   * Get cache statistics
   */
  public getStats() {
    if (!this.isCacheValid()) {
      return {
        date: this.getTodayDate(),
        sentCount: 0,
        isValid: false
      };
    }

    return {
      date: this.cache!.date,
      sentCount: this.cache!.sentJobs.size,
      isValid: true
    };
  }
}

// Export a singleton instance
export const dailyJobCache = new DailyJobCache();
