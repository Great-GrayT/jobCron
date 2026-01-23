import { NextRequest, NextResponse } from 'next/server';
import { validateTrackingUrl, decodeJobData } from '@/lib/tracking-url';
import { getAppliedJobsStorage } from '@/lib/applied-jobs-r2';
import { logger } from '@/lib/logger';

/**
 * Tracking endpoint for job applications
 *
 * When a user clicks a tracking link in Telegram:
 * 1. Validates the URL signature
 * 2. Decodes the job data
 * 3. Stores the application in R2
 * 4. Redirects to the actual job URL
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const jobId = searchParams.get('j');
  const timestamp = searchParams.get('t');
  const signature = searchParams.get('s');
  const encodedData = searchParams.get('d');

  // Validate required parameters
  if (!jobId || !timestamp || !signature || !encodedData) {
    logger.warn('Track: Missing required parameters');
    return NextResponse.json(
      { error: 'Invalid tracking URL - missing parameters' },
      { status: 400 }
    );
  }

  // Validate signature
  const validation = validateTrackingUrl(jobId, timestamp, signature);
  if (!validation.valid) {
    logger.warn(`Track: Invalid signature - ${validation.error}`);
    return NextResponse.json(
      { error: validation.error || 'Invalid tracking URL' },
      { status: 403 }
    );
  }

  // Decode job data
  const jobData = decodeJobData(encodedData);
  if (!jobData) {
    logger.warn('Track: Failed to decode job data');
    return NextResponse.json(
      { error: 'Invalid tracking URL - corrupted data' },
      { status: 400 }
    );
  }

  try {
    // Store the application
    const storage = getAppliedJobsStorage();
    await storage.load();

    const application = await storage.addApplication(jobData);

    if (application) {
      // Save to R2
      await storage.save();
      logger.info(`Track: Logged application for "${jobData.title}" at "${jobData.company}"`);
    } else {
      logger.info(`Track: Already applied to "${jobData.title}" (duplicate click)`);
    }
  } catch (error) {
    // Log error but don't block the redirect
    logger.error('Track: Failed to save application:', error);
  }

  // Redirect to the actual job URL
  return NextResponse.redirect(jobData.jobUrl, 302);
}
