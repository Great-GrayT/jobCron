/** @type {import('next').NextConfig} */

// The API the browser talks to (same value the client uses). Whitelisted in the
// CSP connect-src so fetches to the cron-server aren't blocked.
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "https://cron.polarislab.ir").replace(/\/$/, "");

// Content-Security-Policy: defense-in-depth against XSS/clickjacking/data-exfil.
// 'unsafe-inline' is kept for script/style because Next injects inline bootstrap
// without a nonce; tighten to nonce-based later if needed. img/connect are the
// ones that actually matter for this app (avatars + the API).
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${API_BASE}`,
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(), camera=(), microphone=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig = {
  // Disable image optimization for API-only project
  images: {
    unoptimized: true,
  },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
