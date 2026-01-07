/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  },
  // Disable image optimization for API-only project
  images: {
    unoptimized: true,
  },
  // Ensure proper function configuration for Vercel
  output: 'standalone',
};

module.exports = nextConfig;
