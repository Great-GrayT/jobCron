/**
 * Daily cache system for tracking sent jobs
 * Automatically clears at midnight (end of day)
 */

interface CacheEntry {
  date: string; // YYYY-MM-DD format
  sentTitles: Set<string>;
  sentDescriptions: Set<string>;
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
      sentTitles: new Set<string>(),
      sentDescriptions: new Set<string>()
    };
  }

  /**
   * Check if a job has already been sent today (by title OR description)
   * @param jobTitle - The job title
   * @param jobDescription - The job description
   * @returns true if job was already sent today (title or description match), false otherwise
   */
  public hasBeenSent(jobTitle: string, jobDescription: string): boolean {
    // If cache is invalid (new day), reset it
    if (!this.isCacheValid()) {
      this.initializeCache();
      return false;
    }

    // Check if either title OR description has been sent
    return this.cache!.sentTitles.has(jobTitle) || this.cache!.sentDescriptions.has(jobDescription);
  }

  /**
   * Mark a job as sent for today
   * @param jobTitle - The job title to mark as sent
   * @param jobDescription - The job description to mark as sent
   */
  public markAsSent(jobTitle: string, jobDescription: string): void {
    // If cache is invalid (new day), reset it
    if (!this.isCacheValid()) {
      this.initializeCache();
    }

    this.cache!.sentTitles.add(jobTitle);
    this.cache!.sentDescriptions.add(jobDescription);
  }

  /**
   * Mark multiple jobs as sent
   * @param jobs - Array of jobs with title and description
   */
  public markMultipleAsSent(jobs: Array<{ title: string; description: string }>): void {
    // If cache is invalid (new day), reset it
    if (!this.isCacheValid()) {
      this.initializeCache();
    }

    jobs.forEach(job => {
      this.cache!.sentTitles.add(job.title);
      this.cache!.sentDescriptions.add(job.description);
    });
  }

  /**
   * Get the number of jobs sent today
   */
  public getSentCount(): number {
    if (!this.isCacheValid()) {
      return 0;
    }
    // Use titles count as the job count (both sets should be the same size)
    return this.cache!.sentTitles.size;
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
      sentCount: this.cache!.sentTitles.size,
      isValid: true
    };
  }
}

// Export a singleton instance
export const dailyJobCache = new DailyJobCache();
