import { NextRequest, NextResponse } from "next/server";
import { getStatsCache } from "@/lib/stats-storage";
import { validateEnvironmentVariables } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET /api/stats/description?date=YYYY-MM-DD
 *
 * Returns job descriptions for a specific date, fetched on demand.
 * Response: { success: true, date, descriptions: Array<{ id, description }> }
 */
export async function GET(request: NextRequest) {
  try {
    validateEnvironmentVariables();

    const date = request.nextUrl.searchParams.get("date");
    if (!date) {
      return NextResponse.json({ error: "date parameter required" }, { status: 400 });
    }

    const statsCache = await getStatsCache();
    await statsCache.load();

    if (typeof statsCache.loadDescriptionsForDate !== "function") {
      return NextResponse.json({ success: true, date, descriptions: [] });
    }

    const descMap: Map<string, string> = await statsCache.loadDescriptionsForDate(date);
    const descriptions = Array.from(descMap.entries()).map(([id, description]) => ({
      id,
      description,
    }));

    return NextResponse.json({
      success: true,
      date,
      descriptions,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch descriptions",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
