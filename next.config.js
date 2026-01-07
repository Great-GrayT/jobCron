/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  },
  // Disable image optimization for API-only project
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
