# GitHub Gist Storage Setup Guide

## Quick Setup (3 minutes)

Use GitHub Gist as free, persistent storage for your job cache across all Vercel cron executions.

### Why GitHub Gist?

- ✅ **100% Free** - No limits for our use case
- ✅ **Persistent** - Survives all Vercel restarts forever
- ✅ **Simple** - Just 3 steps to set up
- ✅ **Reliable** - GitHub's infrastructure
- ✅ **Viewable** - You can see your cache in browser

---

## Step 1: Create a GitHub Personal Access Token

1. Go to [GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a name: `LinkedIn Jobs Cache`
4. Select **only** the `gist` scope (check the box)
5. Click **"Generate token"**
6. **Copy the token immediately** (starts with `ghp_`)
   - ⚠️ You won't be able to see it again!

---

## Step 2: Create a GitHub Gist

1. Go to [https://gist.github.com](https://gist.github.com)
2. Create a new Gist:
   - **Filename**: `linkedin-jobs-cache.json`
   - **Content**: `{}` (just empty braces)
   - **Description**: (optional) "LinkedIn jobs cache"
   - Select **"Create secret gist"** (or public, your choice)
3. Click **"Create secret gist"** or **"Create public gist"**
4. **Copy the Gist ID** from the URL
   - URL will look like: `https://gist.github.com/username/abc123def456`
   - The Gist ID is: `abc123def456`

---

## Step 3: Add Environment Variables to Vercel

### Option A: Via Vercel Dashboard

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add two variables:

   **Variable 1:**
   - Key: `GITHUB_TOKEN`
   - Value: `ghp_xxxxxxxxxxxxx` (your token from Step 1)
   - Environments: ✅ Production, ✅ Preview, ✅ Development

   **Variable 2:**
   - Key: `GIST_ID`
   - Value: `abc123def456` (your Gist ID from Step 2)
   - Environments: ✅ Production, ✅ Preview, ✅ Development

3. Click **Save** for each

### Option B: For Local Testing

Create `.env.local` in your project root:

```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
GIST_ID=abc123def456
```

---

## Step 4: Deploy

1. **Push your code** to trigger a deployment, or
2. **Redeploy** manually from Vercel dashboard

---

## Step 5: Verify It's Working

After the next cron job run, check your logs:

### ✅ Success - You should see:
```
Cache storage: GitHub Gist (persistent)
✓ Cache loaded from GitHub Gist
  - Gist URL: https://gist.github.com/username/abc123...
  - URLs in cache: 45
✓ Cache saved to GitHub Gist
  - Total URLs cached: 90
```

### ❌ If you see this instead:
```
Cache storage: Local file system
```

Then the environment variables are not set correctly. Double-check Step 3.

---

## Viewing Your Cache

You can view the cached URLs anytime in your browser:

1. Go to your Gist URL: `https://gist.github.com/username/{GIST_ID}`
2. Click on `linkedin-jobs-cache.json`
3. See all cached job URLs in JSON format

Example:
```json
{
  "urls": [
    "https://linkedin.com/jobs/view/123456",
    "https://linkedin.com/jobs/view/789012"
  ],
  "lastUpdated": "2026-01-11T22:00:00.000Z",
  "metadata": {
    "totalUrlsCached": 150,
    "version": "1.0.0"
  }
}
```

---

## Managing the Cache

### Clear Cache

Just delete all URLs from your Gist:
1. Go to your Gist URL
2. Click **Edit**
3. Replace content with `{}`
4. Click **Update secret gist**

Or delete the entire Gist and create a new one (update `GIST_ID` in Vercel).

### Monitor Cache Growth

The Gist will show:
- File size
- Last updated timestamp
- Full history of all changes (click "Revisions")

---

## FAQ

### Q: Is my cache data private?

**A:** If you created a **secret gist**, only people with the URL can see it. It's not indexed by search engines.

### Q: Are there any limits?

**A:** Gists have a soft limit of 100MB. Our cache will be ~1KB per 100 URLs, so you can cache millions of jobs before hitting limits.

### Q: What if my token expires?

**A:** Classic tokens don't expire unless you set an expiration. If it does expire, just create a new token and update the `GITHUB_TOKEN` environment variable.

### Q: Can I use the same Gist for multiple projects?

**A:** Yes! Just use different filenames in the same Gist. Each project can have its own cache file.

### Q: What if I accidentally delete my token?

**A:** Create a new token (Step 1) and update the `GITHUB_TOKEN` environment variable in Vercel.

---

## Troubleshooting

### Error: "GitHub API error: 401"

**Problem:** Invalid or expired token

**Fix:**
1. Verify `GITHUB_TOKEN` is correct
2. Make sure token has `gist` scope
3. Create a new token if needed

### Error: "GitHub API error: 404"

**Problem:** Invalid Gist ID or Gist was deleted

**Fix:**
1. Verify `GIST_ID` is correct
2. Make sure the Gist still exists
3. Create a new Gist if needed

### Cache not persisting

**Check:**
1. Both `GITHUB_TOKEN` and `GIST_ID` are set in Vercel
2. Environment variables are enabled for Production
3. You redeployed after adding the variables
4. Logs show "GitHub Gist (persistent)" not "Local file system"

---

## Cost

**100% FREE Forever** ✨

GitHub Gists are free with no limits for our use case.

---

## Security Best Practices

1. ✅ Use a **secret gist** if you don't want job URLs publicly visible
2. ✅ Only grant the `gist` scope to your token (don't give extra permissions)
3. ✅ Never commit your `GITHUB_TOKEN` to git
4. ✅ Add `.env.local` to `.gitignore` (already done)

---

## Next Steps

After setup, your cache will persist across:
- ✅ All cron job executions
- ✅ Vercel function cold starts
- ✅ Deployments and redeployments
- ✅ Forever (until you delete the Gist)

Enjoy your persistent cache! 🎉
