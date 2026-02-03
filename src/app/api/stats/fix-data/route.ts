import { NextRequest, NextResponse } from "next/server";
import { getStatsCache, getStorageInfo } from "@/lib/stats-storage";
import { validateEnvironmentVariables } from "@/lib/validation";
import { logger } from "@/lib/logger";
import { SalaryExtractor } from "@/lib/salary-extractor";
import { RoleTypeExtractor } from "@/lib/role-type-extractor";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for processing

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

  // Filter out non-city names
  if (/^England$/i.test(normalized) ||
      /^Scotland$/i.test(normalized) ||
      /^Wales$/i.test(normalized) ||
      /^United Kingdom$/i.test(normalized)) {
    return null;
  }

  return normalized;
}

/**
 * POST /api/stats/fix-data
 *
 * Fixes existing stored data by:
 * 1. Re-extracting salary data from job descriptions
 * 2. Recalculating byHour and byDayHour for heatmap
 * 3. Recalculating all salary statistics
 */
export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    validateEnvironmentVariables();

    const storageInfo = getStorageInfo();
    logger.info(`Starting data fix using ${storageInfo.backend} storage...`);

    // Initialize statistics cache
    const statsCache = await getStatsCache();
    await statsCache.load();

    // Get current month data
    const currentMonthData = await Promise.resolve(statsCache.getCurrentMonthData());
    const jobs = currentMonthData.jobs || [];

    if (jobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No jobs to fix",
        fixed: 0,
      });
    }

    logger.info(`Processing ${jobs.length} jobs for data fix...`);

    // Track statistics
    let salaryFixed = 0;
    let salaryNew = 0;
    let salaryUnchanged = 0;
    let hoursGenerated = 0;
    let roleTypeNew = 0;
    let roleTypeUpdated = 0;

    // Reset byHour and byDayHour
    const byHour: Record<string, number> = {};
    const byDayHour: Record<string, number> = {};
    const byRoleType: Record<string, number> = {};
    const byRoleCategory: Record<string, number> = {};

    // Process each job
    for (const job of jobs) {
      // 1. Re-extract salary from description
      const oldSalary = job.salary;
      const newSalary = SalaryExtractor.extractSalary(job.title, job.description);

      if (newSalary) {
        // Normalize to annual
        const normalizedSalary = SalaryExtractor.normalizeToAnnual(newSalary);

        if (!oldSalary) {
          salaryNew++;
        } else if (
          oldSalary.min !== normalizedSalary.min ||
          oldSalary.max !== normalizedSalary.max
        ) {
          salaryFixed++;
        } else {
          salaryUnchanged++;
        }

        // Update the job's salary
        job.salary = normalizedSalary;
      } else if (oldSalary) {
        // Had salary before but couldn't extract now - keep old
        salaryUnchanged++;
      }

      // 2. Extract role type
      const roleTypeMatch = RoleTypeExtractor.extractRoleType(
        job.title,
        job.keywords || [],
        job.description || '',
        job.industry || ''
      );

      if (roleTypeMatch) {
        if (!job.roleType) {
          roleTypeNew++;
        } else if (job.roleType !== roleTypeMatch.roleType) {
          roleTypeUpdated++;
        }
        job.roleType = roleTypeMatch.roleType;
        job.roleCategory = roleTypeMatch.category;

        // Track role type stats
        byRoleType[roleTypeMatch.roleType] = (byRoleType[roleTypeMatch.roleType] || 0) + 1;
        byRoleCategory[roleTypeMatch.category] = (byRoleCategory[roleTypeMatch.category] || 0) + 1;
      }

      // 3. Generate byHour and byDayHour from postedDate
      if (job.postedDate) {
        try {
          const postedDate = new Date(job.postedDate);
          if (!isNaN(postedDate.getTime())) {
            const hour = postedDate.getUTCHours();
            const dayOfWeek = postedDate.getUTCDay();

            const hourKey = String(hour).padStart(2, '0');
            byHour[hourKey] = (byHour[hourKey] || 0) + 1;

            const dayHourKey = `${dayOfWeek}-${hour}`;
            byDayHour[dayHourKey] = (byDayHour[dayHourKey] || 0) + 1;

            hoursGenerated++;
          }
        } catch (e) {
          logger.warn(`Failed to parse postedDate for job ${job.id}: ${job.postedDate}`);
        }
      }
    }

    // 4. Update statistics with new byHour, byDayHour, byRoleType, byRoleCategory
    currentMonthData.statistics.byHour = byHour;
    currentMonthData.statistics.byDayHour = byDayHour;
    currentMonthData.statistics.byRoleType = byRoleType;
    currentMonthData.statistics.byRoleCategory = byRoleCategory;

    // 5. Recalculate salary statistics
    recalculateSalaryStats(currentMonthData);

    // 6. Save the updated data
    await statsCache.save();

    const stats = currentMonthData.statistics.salaryStats;

    logger.info(`Data fix completed:`);
    logger.info(`  - Salaries: ${salaryNew} new, ${salaryFixed} fixed, ${salaryUnchanged} unchanged`);
    logger.info(`  - Role types: ${roleTypeNew} new, ${roleTypeUpdated} updated`);
    logger.info(`  - Hours generated: ${hoursGenerated}`);
    logger.info(`  - Total with salary: ${stats?.totalWithSalary || 0}`);
    logger.info(`  - Average salary: ${stats?.averageSalary || 'N/A'}`);
    logger.info(`  - Median salary: ${stats?.medianSalary || 'N/A'}`);
    logger.info(`  - Role types found: ${Object.keys(byRoleType).length}`);

    return NextResponse.json({
      success: true,
      message: "Data fix completed",
      results: {
        totalJobs: jobs.length,
        salaryStats: {
          new: salaryNew,
          fixed: salaryFixed,
          unchanged: salaryUnchanged,
          totalWithSalary: stats?.totalWithSalary || 0,
          averageSalary: stats?.averageSalary,
          medianSalary: stats?.medianSalary,
        },
        roleTypeStats: {
          new: roleTypeNew,
          updated: roleTypeUpdated,
          totalRoleTypes: Object.keys(byRoleType).length,
          totalCategories: Object.keys(byRoleCategory).length,
          byRoleType,
          byRoleCategory,
        },
        timeStats: {
          hoursGenerated,
          byHourEntries: Object.keys(byHour).length,
          byDayHourEntries: Object.keys(byDayHour).length,
        },
        bySeniority: stats?.bySeniority || {},
      },
    });
  } catch (error) {
    logger.error("Error fixing data:", error);

    return NextResponse.json(
      {
        error: "Failed to fix data",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Recalculate salary statistics from all jobs
 */
function recalculateSalaryStats(currentMonthData: any): void {
  const stats = currentMonthData.statistics;
  const jobs = currentMonthData.jobs;
  const jobsWithSalary = jobs.filter((j: any) => j.salary && (j.salary.min || j.salary.max));

  // Initialize salaryStats
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

  const salaryStats = stats.salaryStats;
  salaryStats.totalWithSalary = jobsWithSalary.length;

  if (jobsWithSalary.length === 0) {
    return;
  }

  // Calculate midpoint salaries
  const salaries: number[] = [];
  const industryGroups: Record<string, number[]> = {};
  const seniorityGroups: Record<string, number[]> = {};
  const locationGroups: Record<string, number[]> = {};
  const countryGroups: Record<string, number[]> = {};
  const cityGroups: Record<string, number[]> = {};

  jobsWithSalary.forEach((job: any) => {
    if (!job.salary) return;

    const midpoint = job.salary.min !== null && job.salary.max !== null
      ? (job.salary.min + job.salary.max) / 2
      : (job.salary.min || job.salary.max || 0);

    if (midpoint > 0) {
      salaries.push(midpoint);

      // Group by industry
      if (job.industry) {
        if (!industryGroups[job.industry]) industryGroups[job.industry] = [];
        industryGroups[job.industry].push(midpoint);
      }

      // Group by seniority
      if (job.seniority) {
        if (!seniorityGroups[job.seniority]) seniorityGroups[job.seniority] = [];
        seniorityGroups[job.seniority].push(midpoint);
      }

      // Group by location
      if (job.location) {
        if (!locationGroups[job.location]) locationGroups[job.location] = [];
        locationGroups[job.location].push(midpoint);
      }

      // Group by country
      if (job.country) {
        if (!countryGroups[job.country]) countryGroups[job.country] = [];
        countryGroups[job.country].push(midpoint);
      }

      // Group by city (normalized)
      const normalizedCity = normalizeCity(job.city);
      if (normalizedCity) {
        if (!cityGroups[normalizedCity]) cityGroups[normalizedCity] = [];
        cityGroups[normalizedCity].push(midpoint);
      }

      // Currency count
      if (job.salary.currency) {
        salaryStats.byCurrency[job.salary.currency] =
          (salaryStats.byCurrency[job.salary.currency] || 0) + 1;
      }

      // Salary ranges
      if (midpoint < 30000) {
        salaryStats.salaryRanges['0-30k']++;
      } else if (midpoint < 50000) {
        salaryStats.salaryRanges['30-50k']++;
      } else if (midpoint < 75000) {
        salaryStats.salaryRanges['50-75k']++;
      } else if (midpoint < 100000) {
        salaryStats.salaryRanges['75-100k']++;
      } else if (midpoint < 150000) {
        salaryStats.salaryRanges['100-150k']++;
      } else {
        salaryStats.salaryRanges['150k+']++;
      }
    }
  });

  // Calculate overall average and median
  if (salaries.length > 0) {
    salaryStats.averageSalary = Math.round(
      salaries.reduce((a, b) => a + b, 0) / salaries.length
    );

    const sorted = [...salaries].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    salaryStats.medianSalary = sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : Math.round(sorted[mid]);
  }

  // Helper to calculate grouped stats
  const calcGroupStats = (groups: Record<string, number[]>) => {
    const result: Record<string, { avg: number; median: number; count: number }> = {};
    for (const [key, values] of Object.entries(groups)) {
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        result[key] = {
          avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
          median: sorted.length % 2 === 0
            ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
            : Math.round(sorted[mid]),
          count: values.length,
        };
      }
    }
    return result;
  };

  salaryStats.byIndustry = calcGroupStats(industryGroups);
  salaryStats.bySeniority = calcGroupStats(seniorityGroups);
  salaryStats.byLocation = calcGroupStats(locationGroups);
  salaryStats.byCountry = calcGroupStats(countryGroups);
  salaryStats.byCity = calcGroupStats(cityGroups);
}
