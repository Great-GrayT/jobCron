# LinkedIn Jobs URL Cache

## Overview

The LinkedIn job scraper uses a **persistent cache** to track all scraped job URLs. This prevents duplicate job postings from being included in your results across multiple scraper runs.

## How It Works

### Cache Storage

The cache automatically detects the environment and uses the appropriate storage:

- **Local Development**: Cache stored in `./cache/linkedin-jobs-cache.json` (file system)
- **Vercel Production**: Cache stored in **Vercel Blob Storage** (persistent across all executions)

The cache automatically switches between local file storage and Vercel Blob based on the presence of the `BLOB_READ_WRITE_TOKEN` environment variable.

### Cache Structure

The cache file contains:
```json
{
  "urls": [
    "https://linkedin.com/jobs/view/123456",
    "https://linkedin.com/jobs/view/789012",
    ...
  ],
  "lastUpdated": "2026-01-11T10:30:00.000Z",
  "metadata": {
    "totalUrlsCached": 150,
    "version": "1.0.0"
  }
}
```

### Cache Behavior

1. **On Startup**: The scraper loads the cache file (if it exists)
2. **During Scraping**: Each job URL is checked against the cache
   - **New URL**: Added to cache and included in results
   - **Cached URL**: Skipped (logged as duplicate)
3. **On Completion**: Cache is saved back to the file

### Logs

The scraper now provides detailed logging:
- Cache status at start (how many URLs are already cached)
- Each URL being processed (NEW or DUPLICATE)
- Complete list of all cached URLs at the end
- Summary statistics

## Vercel Blob Storage Setup

### Prerequisites

You need a Vercel account with Blob Storage enabled (free tier available).

### Setup Instructions

1. **Create a Blob Store in Vercel**
   - Go to your Vercel project dashboard
   - Navigate to **Storage** → **Create Database** → **Blob**
   - Create a new Blob store (any name is fine)

2. **Get the Token**
   - After creating the Blob store, Vercel will show you environment variables
   - Copy the `BLOB_READ_WRITE_TOKEN` value

3. **Add Environment Variable**

   **Option A: Via Vercel Dashboard**
   - Go to your project settings → **Environment Variables**
   - Add: `BLOB_READ_WRITE_TOKEN` = `your_token_here`
   - Make sure it's available for **Production**, **Preview**, and **Development**

   **Option B: Via `.env.local` for local testing**
   ```bash
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
   ```

4. **Deploy**
   - Redeploy your project for the environment variable to take effect
   - The cache will automatically start using Vercel Blob Storage

### Verification

Check your logs after the first run. You should see:
```
Cache storage: Vercel Blob (persistent)
✓ Cache saved to Vercel Blob
  - Blob URL: https://xxxxx.public.blob.vercel-storage.com/linkedin-jobs-cache.json
  - Total URLs cached: 45
```

### Important Notes

✅ **With Vercel Blob Storage**:
- Cache persists across ALL cron job executions
- Cache survives function cold starts
- Cache is shared across all serverless instances
- Automatic backup and redundancy

⚠️ **Without Blob Storage** (local dev):
- Cache only persists in your local `./cache/` directory
- Perfect for development and testing

## Cache Management

### View Cache Contents

The scraper automatically logs all cached URLs at the end of each run. Check your logs to see what's cached.

### Clear Cache

**Local Development:**
```bash
rm cache/linkedin-jobs-cache.json
```

**Vercel Blob Storage:**
- Go to Vercel Dashboard → **Storage** → **Blob**
- Find and delete `linkedin-jobs-cache.json`
- Or use the Vercel Blob API/CLI to delete it

### View Cache in Vercel

You can view the cache file directly in your browser:
- Go to Vercel Dashboard → **Storage** → **Blob** → **Browse**
- Find `linkedin-jobs-cache.json`
- Click to view the JSON content

## Example Log Output

### First Run (Vercel Blob)
```
Cache storage: Vercel Blob (persistent)
Cache file name: linkedin-jobs-cache.json
No existing cache in Vercel Blob. Starting with empty cache.

=== Cache Status at Start ===
URLs already in cache: 0

...scraping happens...

=== Starting Deduplication Process ===
Total jobs scraped this run: 120
URLs in persistent cache before processing: 0

✓ NEW job added to cache: https://linkedin.com/jobs/view/123456
✓ NEW job added to cache: https://linkedin.com/jobs/view/789012
✓ NEW job added to cache: https://linkedin.com/jobs/view/345678
...

✓ Cache saved to Vercel Blob
  - Blob URL: https://xxxxx.public.blob.vercel-storage.com/linkedin-jobs-cache.json
  - Total URLs cached: 90

=== Cache Contents (90 URLs) ===
1. https://linkedin.com/jobs/view/123456
2. https://linkedin.com/jobs/view/789012
3. https://linkedin.com/jobs/view/345678
...

=== Deduplication Summary ===
Jobs scraped this run: 120
Invalid URLs skipped: 5
New unique jobs (added to cache): 90
Already cached (duplicates): 25
Total URLs now in persistent cache: 90
```

### Second Run (Cache Persisted)
```
Cache storage: Vercel Blob (persistent)
Cache file name: linkedin-jobs-cache.json
✓ Cache loaded from Vercel Blob
  - URLs in cache: 90
  - Last updated: 2026-01-11T21:30:00.000Z
  - Cache version: 1.0.0

=== Cache Status at Start ===
URLs already in cache: 90

...scraping happens...

=== Starting Deduplication Process ===
Total jobs scraped this run: 120
URLs in persistent cache before processing: 90

✗ DUPLICATE (already cached): https://linkedin.com/jobs/view/123456 - Software Engineer
✗ DUPLICATE (already cached): https://linkedin.com/jobs/view/789012 - Senior Developer
✓ NEW job added to cache: https://linkedin.com/jobs/view/999888
✓ NEW job added to cache: https://linkedin.com/jobs/view/777666
...

✓ Cache saved to Vercel Blob
  - Blob URL: https://xxxxx.public.blob.vercel-storage.com/linkedin-jobs-cache.json
  - Total URLs cached: 120

=== Deduplication Summary ===
Jobs scraped this run: 120
Invalid URLs skipped: 3
New unique jobs (added to cache): 30
Already cached (duplicates): 87
Total URLs now in persistent cache: 120
```

## Future Enhancements

Consider implementing:
- Cache expiration (remove old URLs after X days)
- Cache size limits (prevent unlimited growth)
- Multiple cache files per keyword/country
- External persistent storage for Vercel
