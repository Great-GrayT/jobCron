# Deployment Guide

Complete guide for deploying the LinkedIn Jobs Monitor to Vercel.

## Prerequisites

- [Node.js](https://nodejs.org/) 18.x or later
- [Git](https://git-scm.com/) installed
- A [GitHub](https://github.com/) account
- A [Vercel](https://vercel.com/) account
- Telegram bot credentials (see below)

## Quick Start

### 1. Prepare Telegram Bot

#### Create Bot
1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot`
3. Follow prompts to name your bot
4. **Save the bot token** (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

#### Get Chat ID
1. Search for [@userinfobot](https://t.me/userinfobot)
2. Start a chat
3. **Save your ID** (format: `123456789`)

#### Start Your Bot
1. Search for your bot in Telegram
2. Click "Start" or send `/start`
3. This allows the bot to send you messages

### 2. Deploy to Vercel

#### Method A: Deploy via GitHub (Recommended)

1. **Push code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/job-monitor.git
   git push -u origin main
   ```

2. **Import to Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Environment Variables:**
   In the Vercel import screen, add:

   | Name | Value | Description |
   |------|-------|-------------|
   | `TELEGRAM_BOT_TOKEN` | Your bot token | Required |
   | `TELEGRAM_CHAT_ID` | Your chat ID | Required |
   | `CRON_SECRET` | Random secure string | Optional but recommended |
   | `RSS_FEED_URLS` | Comma-separated URLs | Optional (has defaults) |
   | `CHECK_INTERVAL_MINUTES` | `5` | Optional (default: 5) |

4. **Deploy:**
   - Click "Deploy"
   - Wait for deployment to complete (~2 minutes)
   - Your app is live!

#### Method B: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Set up environment variables:**
   Create `.env` file:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in your values.

4. **Deploy:**
   ```bash
   vercel
   ```

   Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N**
   - What's your project's name? **job-monitor** (or your choice)
   - In which directory is your code located? **.**
   - Want to override settings? **N**

5. **Add environment variables to Vercel:**
   ```bash
   vercel env add TELEGRAM_BOT_TOKEN production
   # Paste your bot token when prompted

   vercel env add TELEGRAM_CHAT_ID production
   # Paste your chat ID when prompted

   vercel env add CRON_SECRET production
   # Enter a random secure string
   ```

6. **Deploy to production:**
   ```bash
   vercel --prod
   ```

## Configuration

### Environment Variables

All environment variables can be set in the Vercel dashboard:
1. Go to your project
2. Click "Settings"
3. Click "Environment Variables"
4. Add or edit variables

#### Required Variables

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

#### Optional Variables

```env
# Secure your cron endpoint (highly recommended for production)
CRON_SECRET=your_secure_random_string_here

# Override default RSS feeds (comma-separated)
RSS_FEED_URLS=https://rss.app/feeds/feed1.xml,https://rss.app/feeds/feed2.xml

# Change check interval (must match cron schedule)
CHECK_INTERVAL_MINUTES=5
```

### Generating a Secure CRON_SECRET

```bash
# On macOS/Linux:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Or use an online generator:
# https://www.random.org/strings/
```

### Cron Schedule

The cron schedule is defined in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-jobs",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Schedule Format:** `minute hour day month weekday`

Examples:
- `*/5 * * * *` - Every 5 minutes
- `*/10 * * * *` - Every 10 minutes
- `0 * * * *` - Every hour at minute 0
- `0 9 * * *` - Every day at 9:00 AM
- `0 9 * * 1-5` - Every weekday at 9:00 AM

**Important:** If you change the schedule, update `CHECK_INTERVAL_MINUTES` to match!

## Verification

### 1. Check Deployment Status

```bash
vercel ls
```

### 2. Test the Endpoint

Without authentication:
```bash
curl https://your-app.vercel.app/api/cron/check-jobs
```

With authentication:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://your-app.vercel.app/api/cron/check-jobs
```

Expected response:
```json
{
  "success": true,
  "timestamp": "2024-01-03T12:00:00.000Z",
  "total": 150,
  "sent": 5,
  "failed": 0
}
```

### 3. Check Telegram

You should receive job notifications in your Telegram chat.

### 4. Monitor Logs

1. Go to your Vercel dashboard
2. Select your project
3. Click "Logs"
4. Filter by function: `/api/cron/check-jobs`

Look for:
- `[INFO] Cron job started`
- `[INFO] Fetched X total jobs from Y feeds`
- `[INFO] Found X recent jobs`
- `[INFO] Job check completed`

## Troubleshooting

### No Telegram Messages

**Check 1: Bot token is valid**
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe
```
Should return bot information.

**Check 2: Chat ID is correct**
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage \
     -d "chat_id=<YOUR_CHAT_ID>&text=Test"
```
Should send you a test message.

**Check 3: You started the bot**
- Open Telegram
- Search for your bot
- Click "Start"

**Check 4: Environment variables are set**
- Go to Vercel project settings
- Check "Environment Variables"
- Verify `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are present

### Cron Job Not Running

**Check 1: Vercel Crons are enabled**
- Free tier: 1 cron per project
- Pro tier: Multiple crons allowed
- Ensure you haven't exceeded limits

**Check 2: vercel.json is correct**
```bash
cat vercel.json
```
Should show the cron configuration.

**Check 3: View cron logs**
- Vercel Dashboard → Your Project → Logs
- Filter by time range when cron should have run
- Look for execution logs

### 401 Unauthorized Error

**Solution:** Check `CRON_SECRET` configuration

If `CRON_SECRET` is set in environment variables, you must include it in requests:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://your-app.vercel.app/api/cron/check-jobs
```

Note: Vercel Cron automatically includes the authorization header.

### 500 Internal Server Error

**Check logs:**
1. Vercel Dashboard → Logs
2. Look for error messages
3. Common issues:
   - Missing environment variables
   - Invalid RSS feed URLs
   - Network timeouts

**Test locally:**
```bash
npm install
npm run dev
curl http://localhost:3000/api/cron/check-jobs
```

### Rate Limited by Telegram

**Symptoms:**
- 429 errors in logs
- Not all messages sent

**Solutions:**
1. Reduce RSS feeds being monitored
2. Increase rate limit delay in [constants.ts](src/config/constants.ts):
   ```typescript
   export const RATE_LIMIT_DELAY_MS = 3000; // Increase from 2000
   ```
3. Consider using Telegram channels instead of direct messages

## Updating the Deployment

### Update Code

```bash
git add .
git commit -m "Update description"
git push
```

Vercel will automatically deploy the changes.

### Update Environment Variables

**Via Dashboard:**
1. Vercel project → Settings → Environment Variables
2. Edit the variable
3. Click "Save"
4. Redeploy for changes to take effect

**Via CLI:**
```bash
vercel env rm VARIABLE_NAME production
vercel env add VARIABLE_NAME production
# Enter new value when prompted
```

### Force Redeploy

```bash
vercel --prod --force
```

## Monitoring

### Set Up Alerts

1. Go to Vercel Dashboard → Integrations
2. Add Slack/Discord integration
3. Configure alerts for:
   - Failed deployments
   - Function errors
   - Performance issues

### Check Cron Execution History

```bash
vercel logs --follow
```

Or in the dashboard:
1. Project → Logs
2. Filter: `/api/cron/check-jobs`
3. View execution history

### Monitor Telegram Bot

Check bot status:
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe
```

View recent updates:
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
```

## Best Practices

### Security

1. **Always set CRON_SECRET** in production
2. **Never commit** `.env` file to Git
3. **Rotate tokens** periodically
4. **Use environment variables** for all secrets
5. **Monitor access logs** for unauthorized attempts

### Performance

1. **Limit RSS feeds** to necessary sources only
2. **Monitor function execution time** in Vercel logs
3. **Adjust rate limiting** based on Telegram API limits
4. **Consider caching** for frequently accessed data

### Reliability

1. **Monitor logs** regularly for errors
2. **Set up alerts** for failures
3. **Test after deployments**
4. **Keep dependencies updated**:
   ```bash
   npm outdated
   npm update
   ```

## Cost Considerations

### Vercel Free Tier Limits

- 100 GB bandwidth per month
- 100 hours of function execution per month
- 1 concurrent build
- 1 cron per project

**Estimated usage for this app:**
- Cron runs: ~8,640 per month (every 5 minutes)
- Execution time: ~2 seconds per run
- Total: ~4.8 hours per month
- Well within free tier limits!

### Scaling Up

If you need more:
- **Pro tier** ($20/month): Unlimited crons, more execution time
- **Enterprise**: Custom limits and SLAs

## Backup and Recovery

### Backup Configuration

Save your environment variables:
```bash
vercel env pull .env.backup
```

### Export Project Settings

```bash
vercel project ls
vercel project inspect your-project-name > project-config.json
```

### Disaster Recovery

1. Keep code in Git repository
2. Document environment variables separately
3. Export Vercel configuration periodically
4. Test deployment in a staging project first

## Next Steps

After successful deployment:

1. **Customize RSS feeds** for your job interests
2. **Adjust message format** in [job-formatter.ts](src/lib/job-formatter.ts)
3. **Add filtering** based on keywords/location
4. **Create a dashboard** to view job statistics
5. **Add database** to track sent jobs (prevent duplicates across deployments)

## Support

- **Documentation**: See [README.md](README.md)
- **Migration**: See [MIGRATION.md](MIGRATION.md)
- **Issues**: Open a GitHub issue
- **Vercel Docs**: https://vercel.com/docs
- **Telegram Bot API**: https://core.telegram.org/bots/api
