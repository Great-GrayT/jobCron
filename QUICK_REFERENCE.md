# Quick Reference Guide

## Essential Commands

### Development
```bash
npm install              # Install dependencies
npm run dev             # Start dev server (http://localhost:3000)
npm run build           # Build for production
npm run start           # Start production server
npm run type-check      # Check TypeScript types
npm run lint            # Lint code
```

### Testing
```bash
# Test cron endpoint locally
curl http://localhost:3000/api/cron/check-jobs

# Test with auth
curl -H "Authorization: Bearer YOUR_SECRET" \
     http://localhost:3000/api/cron/check-jobs

# Test production
curl https://your-app.vercel.app/api/cron/check-jobs
```

### Deployment
```bash
vercel                  # Deploy to preview
vercel --prod          # Deploy to production
vercel logs            # View logs
vercel env ls          # List environment variables
vercel env add VAR     # Add environment variable
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | ✅ Yes | - | Bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | ✅ Yes | - | Your Telegram chat/user ID |
| `CRON_SECRET` | ⚠️ Recommended | - | Secret for endpoint security |
| `RSS_FEED_URLS` | ❌ No | 4 feeds | Comma-separated RSS URLs |
| `CHECK_INTERVAL_MINUTES` | ❌ No | 5 | Job check interval |

## File Structure

```
src/
├── app/
│   ├── api/cron/check-jobs/route.ts    # Main API endpoint
│   ├── layout.tsx                       # Root layout
│   └── page.tsx                         # Home page
├── lib/
│   ├── job-analyzer.ts                  # Extract job details
│   ├── job-formatter.ts                 # Format Telegram messages
│   ├── job-monitor-service.ts           # Main orchestration
│   ├── logger.ts                        # Logging utility
│   ├── rss-parser.ts                    # RSS feed parsing
│   ├── telegram.ts                      # Telegram API
│   └── validation.ts                    # Request validation
├── config/
│   └── constants.ts                     # Configuration
└── types/
    └── job.ts                          # TypeScript types
```

## Common Tasks

### Add a New RSS Feed

**Option 1: Environment Variable**
```env
RSS_FEED_URLS=https://feed1.xml,https://feed2.xml,https://new-feed.xml
```

**Option 2: Code** (edit [constants.ts](src/config/constants.ts))
```typescript
export const RSS_FEED_URLS = [
  "https://feed1.xml",
  "https://feed2.xml",
  "https://new-feed.xml"
];
```

### Change Cron Schedule

Edit [vercel.json](vercel.json):
```json
{
  "crons": [
    {
      "path": "/api/cron/check-jobs",
      "schedule": "*/10 * * * *"  // Every 10 minutes
    }
  ]
}
```

Also update environment variable:
```env
CHECK_INTERVAL_MINUTES=10
```

### Customize Message Format

Edit [job-formatter.ts](src/lib/job-formatter.ts):
```typescript
export function formatJobMessage(job: JobItem): string {
  // Modify message structure here
  return message;
}
```

### Add Job Filtering

Edit [job-monitor-service.ts](src/lib/job-monitor-service.ts):
```typescript
const recentJobs = filterRecentJobs(allJobs, CHECK_INTERVAL_MINUTES)
  .filter(job => {
    // Add custom filters here
    return job.title.includes('Senior');
  });
```

### Add New Analysis Fields

Edit [job-analyzer.ts](src/lib/job-analyzer.ts):
```typescript
export function analyzeJobDescription(description: string): JobAnalysis {
  return {
    // ... existing fields
    newField: extractNewField(description),
  };
}
```

## API Response Format

### Success
```json
{
  "success": true,
  "timestamp": "2024-01-03T12:00:00.000Z",
  "total": 150,      // Total jobs fetched
  "sent": 5,         // Messages sent
  "failed": 0        // Messages failed
}
```

### Error
```json
{
  "error": "Error message",
  "errorType": "ValidationError",
  "timestamp": "2024-01-03T12:00:00.000Z"
}
```

## Telegram Message Format

```
🆕 NEW JOB POSTING
━━━━━━━━━━━━━━━━━━━━━━

📋 Position: Senior Financial Analyst

🏢 Company: Goldman Sachs
🏦 Industry: Investment Bank

📍 Location: New York, NY
💼 Role Type: Financial Analysis
📊 Experience: 5+ years
🎓 Certifications: CFA, MBA
🎓 Education: Bachelor's, Master's

🔧 Key Skills:
   • Financial Modeling
   • Valuation
   • Excel

💻 Programming: Python, SQL
🖥️ Software: Excel, Bloomberg

⏰ Posted: 15 mins ago
📅 Fri, 03 Jan 2024 at 12:00

🔗 Apply here:
https://jobs.example.com/12345

━━━━━━━━━━━━━━━━━━━━━━
💼 LinkedIn Jobs Monitor
```

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| No messages | Check bot token and chat ID |
| 401 error | Verify CRON_SECRET or remove it |
| Duplicate messages | Check cron schedule matches interval |
| Rate limited | Increase RATE_LIMIT_DELAY_MS |
| Build fails | Run `npm run type-check` |

## Useful Links

- **Project Dashboard**: https://vercel.com/dashboard
- **Logs**: Project → Logs in Vercel dashboard
- **Environment Variables**: Project → Settings → Environment Variables
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **Vercel Cron Docs**: https://vercel.com/docs/cron-jobs
- **RSS Feed Generator**: https://rss.app

## Cron Schedule Cheatsheet

| Schedule | Description |
|----------|-------------|
| `*/5 * * * *` | Every 5 minutes |
| `*/10 * * * *` | Every 10 minutes |
| `*/15 * * * *` | Every 15 minutes |
| `0 * * * *` | Every hour |
| `0 */2 * * *` | Every 2 hours |
| `0 9 * * *` | Daily at 9 AM |
| `0 9 * * 1-5` | Weekdays at 9 AM |
| `0 0 * * 0` | Every Sunday at midnight |

Format: `minute hour day month weekday`>

## Development Workflow

1. **Make changes** to source files
2. **Test locally**: `npm run dev`
3. **Type check**: `npm run type-check`
4. **Commit**: `git add . && git commit -m "Message"`
5. **Push**: `git push`
6. **Auto-deploy**: Vercel deploys automatically
7. **Verify**: Check logs and Telegram

## Environment Setup Checklist

- [ ] Node.js 18+ installed
- [ ] Git initialized
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created from `.env.example`>
- [ ] `TELEGRAM_BOT_TOKEN` set
- [ ] `TELEGRAM_CHAT_ID` set
- [ ] Bot started in Telegram (sent `/start`)
- [ ] Local test successful
- [ ] Pushed to GitHub
- [ ] Deployed to Vercel
- [ ] Environment variables set in Vercel
- [ ] Production test successful
- [ ] Received test message in Telegram

## Emergency Contacts

- **Telegram Bot Issues**: [@BotSupport](https://t.me/BotSupport)
- **Vercel Support**: https://vercel.com/support
- **Project Issues**: Open GitHub issue

## Performance Benchmarks

- Typical execution time: 1-3 seconds
- Memory usage: ~50 MB
- Bandwidth per run: ~100 KB
- Monthly executions: ~8,640 (every 5 min)
- Monthly bandwidth: ~850 MB

## Security Checklist

- [ ] `CRON_SECRET` set in production
- [ ] `.env` not committed to Git
- [ ] Environment variables not in code
- [ ] HTTPS enabled (automatic on Vercel)
- [ ] Bot token rotated periodically
- [ ] Logs reviewed for unauthorized access
- [ ] Error messages don't leak secrets

## Monitoring Checklist

- [ ] Vercel logs checked weekly
- [ ] Telegram messages arriving correctly
- [ ] No 429 rate limit errors
- [ ] Function execution time < 10s
- [ ] Error rate < 1%
- [ ] All RSS feeds responding

## Backup Checklist

- [ ] Code in Git repository
- [ ] Environment variables documented separately
- [ ] Telegram bot token saved securely
- [ ] RSS feed URLs documented
- [ ] Vercel project configuration exported

---

**Need more help?** See [README.md](README.md) for detailed documentation.
