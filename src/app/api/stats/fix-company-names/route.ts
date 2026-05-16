import { NextRequest, NextResponse } from "next/server";
import { getR2Storage } from "@/lib/r2-storage";
import { JobMetadata } from "@/lib/job-statistics-r2";
import { extractJobDetails } from "@/lib/job-analyzer";
import { logger } from "@/lib/logger";
import { getCompanyFromUrl } from "@/lib/company-location-lookup";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function isUnknown(company: string | undefined | null): boolean {
  if (!company) return true;
  const c = company.trim();
  return c === '' || c === 'N/A' || c === 'Unknown Company';
}

function detectCompany(title: string, url: string): string | null {
  // First try extracting from the title pattern ("Company hiring Position at Location")
  const jobDetails = extractJobDetails(title);
  if (!isUnknown(jobDetails.company)) {
    return jobDetails.company;
  }

  return getCompanyFromUrl(url, title);
}

async function recalculateMonthStats(
  r2: ReturnType<typeof getR2Storage>,
  month: string,
  days: Array<{ metadata: string; date: string }>
) {
  const stats = {
    totalJobs: 0,
    byDate: {} as Record<string, number>,
    byIndustry: {} as Record<string, number>,
    byCertificate: {} as Record<string, number>,
    byKeyword: {} as Record<string, number>,
    bySeniority: {} as Record<string, number>,
    byLocation: {} as Record<string, number>,
    byCountry: {} as Record<string, number>,
    byCity: {} as Record<string, number>,
    byRegion: {} as Record<string, number>,
    byCompany: {} as Record<string, number>,
    bySoftware: {} as Record<string, number>,
    byProgrammingSkill: {} as Record<string, number>,
    byYearsExperience: {} as Record<string, number>,
    byAcademicDegree: {} as Record<string, number>,
  };

  for (const day of days) {
    try {
      const metadata = await r2.getNDJSONGzipped<JobMetadata>(day.metadata);
      for (const job of metadata) {
        stats.totalJobs++;
        const dateKey = job.extractedDate.split('T')[0];
        stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1;
        if (job.industry) stats.byIndustry[job.industry] = (stats.byIndustry[job.industry] || 0) + 1;
        job.certificates?.forEach(c => { stats.byCertificate[c] = (stats.byCertificate[c] || 0) + 1; });
        job.keywords?.forEach(k => { stats.byKeyword[k] = (stats.byKeyword[k] || 0) + 1; });
        if (job.seniority) stats.bySeniority[job.seniority] = (stats.bySeniority[job.seniority] || 0) + 1;
        if (job.location) stats.byLocation[job.location] = (stats.byLocation[job.location] || 0) + 1;
        if (job.country) stats.byCountry[job.country] = (stats.byCountry[job.country] || 0) + 1;
        if (job.city) stats.byCity[job.city] = (stats.byCity[job.city] || 0) + 1;
        if (job.region) stats.byRegion[job.region] = (stats.byRegion[job.region] || 0) + 1;
        if (job.company) stats.byCompany[job.company] = (stats.byCompany[job.company] || 0) + 1;
        job.software?.forEach(s => { stats.bySoftware[s] = (stats.bySoftware[s] || 0) + 1; });
        job.programmingSkills?.forEach(s => { stats.byProgrammingSkill[s] = (stats.byProgrammingSkill[s] || 0) + 1; });
        if (job.yearsExperience) stats.byYearsExperience[job.yearsExperience] = (stats.byYearsExperience[job.yearsExperience] || 0) + 1;
        job.academicDegrees?.forEach(d => { stats.byAcademicDegree[d] = (stats.byAcademicDegree[d] || 0) + 1; });
      }
    } catch (error) {
      logger.warn(`Failed to load metadata for stats: ${day.metadata}`, error);
    }
  }

  await r2.putJSON(`stats/${month}.json`, stats, 'public, max-age=60');
}

/**
 * POST /api/stats/fix-company-names
 * Scans all job metadata in R2 and re-runs company detection for any job
 * whose company is unknown/missing, then recalculates month statistics.
 */
export async function POST(request: NextRequest) {
  logger.info("=== Starting Company Name Fix ===");

  try {
    const r2 = getR2Storage();
    if (!r2.isAvailable()) {
      return NextResponse.json({ error: "R2 not configured" }, { status: 400 });
    }

    const manifest = await r2.getManifest();

    let totalProcessed = 0;
    let totalFixed = 0;
    const examples: Array<{ title: string; oldCompany: string; newCompany: string }> = [];

    // Collect all months to process (archived + current)
    const allMonths = [...manifest.availableMonths];
    if (!allMonths.includes(manifest.currentMonth)) {
      allMonths.push(manifest.currentMonth);
    }

    for (const month of allMonths) {
      const monthData = manifest.months[month];
      if (!monthData?.days) continue;

      let monthFixed = 0;

      for (const day of monthData.days) {
        try {
          const records = await r2.getNDJSONGzipped<JobMetadata>(day.metadata);
          let dayFixed = 0;

          const updated = records.map(job => {
            if (!isUnknown(job.company)) return job;

            const detected = detectCompany(job.title, job.url);
            if (!detected) return job;

            dayFixed++;
            if (examples.length < 30) {
              examples.push({
                title: job.title.substring(0, 80),
                oldCompany: job.company || '(empty)',
                newCompany: detected,
              });
            }

            return { ...job, company: detected };
          });

          totalProcessed += records.length;
          monthFixed += dayFixed;
          totalFixed += dayFixed;

          if (dayFixed > 0) {
            await r2.putNDJSONGzipped(day.metadata, updated);
            logger.info(`✓ Fixed ${dayFixed} companies in ${day.date}`);
          }
        } catch (error) {
          logger.error(`Error processing ${day.metadata}:`, error);
        }
      }

      if (monthFixed > 0) {
        await recalculateMonthStats(r2, month, monthData.days);
        logger.info(`✓ Recalculated stats for ${month}`);
      }
    }

    await r2.saveManifest(manifest);
    logger.info("=== Company Name Fix Complete ===");

    return NextResponse.json({
      success: true,
      stats: {
        totalProcessed,
        totalFixed,
        monthsProcessed: allMonths.length,
      },
      examples,
    });
  } catch (error) {
    logger.error("Company name fix failed:", error);
    return NextResponse.json(
      { error: "Company name fix failed", message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stats/fix-company-names
 * Returns a preview of how many jobs have unknown companies.
 */
export async function GET() {
  const r2 = getR2Storage();
  if (!r2.isAvailable()) {
    return NextResponse.json({ error: "R2 not configured" }, { status: 400 });
  }

  const manifest = await r2.getManifest();
  let unknownCount = 0;
  let totalCount = 0;

  const allMonths = [...manifest.availableMonths];
  if (!allMonths.includes(manifest.currentMonth)) allMonths.push(manifest.currentMonth);

  for (const month of allMonths) {
    const monthData = manifest.months[month];
    if (!monthData?.days) continue;
    for (const day of monthData.days) {
      try {
        const records = await r2.getNDJSONGzipped<JobMetadata>(day.metadata);
        totalCount += records.length;
        unknownCount += records.filter(j => isUnknown(j.company)).length;
      } catch {}
    }
  }

  return NextResponse.json({
    status: "ready",
    message: "POST to this endpoint to fix unknown company names across all stored jobs",
    totalJobs: totalCount,
    unknownCompanyJobs: unknownCount,
    monthsToProcess: allMonths.length,
  });
}
