import { NextResponse } from "next/server";

/**
 * Frontend-host proxy for the g2 backfill.
 *
 * The browser calls THIS same-origin route with the admin's Bearer token. Here
 * (server-side, on the Vercel host) we read the R2 credentials from env and
 * forward them + the admin JWT to the cron-server. R2 secrets never reach the
 * browser.
 *
 * The import is async on the cron-server: POST starts it (returns a jobId),
 * GET ?jobId=... polls progress. This proxy just forwards both | no long-held
 * request, so no gateway 502.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "https://cron.polarislab.ir").replace(/\/$/, "");

function requireAuth(req: Request): string | null {
  const auth = req.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth : null;
}

export async function POST(req: Request) {
  const auth = requireAuth(req);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return NextResponse.json(
      { error: "R2 not configured on the frontend host (set R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME)" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/backfill-r2`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({ accountId, accessKeyId, secretAccessKey, bucket }),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: "backfill proxy failed", message: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}

export async function GET(req: Request) {
  const auth = requireAuth(req);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const jobId = new URL(req.url).searchParams.get("jobId");
  const qs = jobId ? `?jobId=${encodeURIComponent(jobId)}` : "";
  try {
    const res = await fetch(`${API_BASE}/api/admin/backfill-r2${qs}`, {
      headers: { Authorization: auth },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: "backfill status proxy failed", message: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
