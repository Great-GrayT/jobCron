# Vercel Blob Storage Setup Guide

## Quick Setup (5 minutes)

Follow these steps to enable persistent caching across all cron job executions on Vercel.

### Step 1: Create Blob Storage in Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click on **Storage** tab in the top navigation
4. Click **Create Database**
5. Select **Blob** from the options
6. Click **Continue**
7. Give it a name (e.g., "linkedin-jobs-cache")
8. Click **Create**

### Step 2: Copy the Environment Variable

After creating the Blob store, Vercel will show you environment variables:

```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxxxxxxxxxx
```

Copy this entire value.

### Step 3: Add to Project Environment Variables

**Option 1: Automatic (Recommended)**

Vercel should automatically add the environment variable to your project. Verify by:
1. Go to **Settings** → **Environment Variables**
2. Check if `BLOB_READ_WRITE_TOKEN` is listed
3. Make sure it's enabled for **Production**, **Preview**, and **Development**

**Option 2: Manual**

If not automatically added:
1. Go to **Settings** → **Environment Variables**
2. Click **Add New**
3. Key: `BLOB_READ_WRITE_TOKEN`
4. Value: Paste the token from Step 2
5. Select all environments: **Production**, **Preview**, **Development**
6. Click **Save**

### Step 4: Redeploy

1. Go to **Deployments** tab
2. Click **⋯** (three dots) on your latest deployment
3. Click **Redeploy**
4. Or simply push a new commit to trigger automatic deployment

### Step 5: Verify It's Working

After the next cron job execution, check your logs:

**Success indicators:**
```
Cache storage: Vercel Blob (persistent)
✓ Cache saved to Vercel Blob
  - Blob URL: https://xxxxx.public.blob.vercel-storage.com/linkedin-jobs-cache.json
  - Total URLs cached: 45
```

**If you see this instead:**
```
Cache storage: Local file system
```

Then the `BLOB_READ_WRITE_TOKEN` environment variable is not set correctly.

### Step 6: View Your Cache

You can view the cached URLs in Vercel:

1. Go to **Storage** → **Blob**
2. Click **Browse**
3. Find `linkedin-jobs-cache.json`
4. Click to view the JSON content

The file will look like:
```json
{
  "urls": [
    "https://linkedin.com/jobs/view/123456",
    "https://linkedin.com/jobs/view/789012"
  ],
  "lastUpdated": "2026-01-11T21:30:00.000Z",
  "metadata": {
    "totalUrlsCached": 150,
    "version": "1.0.0"
  }
}
```

## Testing Locally (Optional)

To test Vercel Blob Storage locally:

1. Create a `.env.local` file in your project root:
   ```bash
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
   ```

2. Run your dev server:
   ```bash
   npm run dev
   ```

3. The cache will now use Vercel Blob Storage even in local development

## Pricing

**Vercel Blob Storage Free Tier:**
- ✅ 500,000 reads per month
- ✅ 50,000 writes per month
- ✅ 10 GB storage

For a LinkedIn job scraper running daily:
- ~30 writes/month (1 per day)
- ~30 reads/month (1 per day)
- ~1 MB storage (for thousands of URLs)

**You'll stay well within the free tier!** 🎉

## Troubleshooting

### Cache not persisting between runs

**Check:**
1. Environment variable is set: `BLOB_READ_WRITE_TOKEN`
2. Variable is enabled for Production environment
3. You've redeployed after adding the variable

**Verify in logs:**
```
Cache storage: Vercel Blob (persistent)  ← Should see this
```

### Error: "Failed to save to Vercel Blob"

**Common causes:**
1. Invalid or expired token
2. Blob store was deleted
3. Network/connectivity issues

**Fix:**
1. Regenerate the token in Vercel Dashboard
2. Update the environment variable
3. Redeploy

### Want to clear the cache

**Two options:**

1. **Via Vercel Dashboard:**
   - Storage → Blob → Browse
   - Find `linkedin-jobs-cache.json`
   - Delete it

2. **It will auto-recreate:**
   - Next run will create a fresh cache file
   - Starts from 0 URLs again

## Need Help?

Check the [CACHE.md](./CACHE.md) file for more details about how the cache works.
