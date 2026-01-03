# Migration Guide

This document explains the changes made during the project rewrite and how to migrate from the old structure to the new one.

## What Changed

### Project Structure

**Before:**
```
job cron on vercel/
└── route.ts  (single file with all logic)
```

**After:**
```
job cron on vercel/
├── src/
│   ├── app/
│   │   ├── api/cron/check-jobs/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   ├── job-analyzer.ts
│   │   ├── job-formatter.ts
│   │   ├── job-monitor-service.ts
│   │   ├── logger.ts
│   │   ├── rss-parser.ts
│   │   ├── telegram.ts
│   │   └── validation.ts
│   ├── config/
│   │   └── constants.ts
│   └── types/
│       └── job.ts
├── Configuration files
└── Documentation
```

### Key Improvements

1. **Modular Architecture**: Code is now split into focused, reusable modules
2. **Type Safety**: Comprehensive TypeScript types throughout
3. **Error Handling**: Custom error classes and better error messages
4. **Configuration**: Environment variables properly validated and typed
5. **Logging**: Structured logging with timestamps
6. **Maintainability**: Easier to test, debug, and extend

### API Endpoint Change

**Before:**
- No specific path (depended on file location)

**After:**
- `/api/cron/check-jobs` (explicitly defined)

**Action Required:**
Update your `vercel.json` to use the new path (already done in the rewrite).

### Environment Variables

The environment variables remain the same, but now have better validation:

```env
TELEGRAM_BOT_TOKEN=required
TELEGRAM_CHAT_ID=required
CRON_SECRET=optional (recommended)
RSS_FEED_URLS=optional (has defaults)
CHECK_INTERVAL_MINUTES=optional (default: 5)
```

**Action Required:**
1. Copy your existing environment variables to `.env`
2. Ensure `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set

## Breaking Changes

### 1. File Location

The main route handler moved from `route.ts` to `src/app/api/cron/check-jobs/route.ts`.

**Migration:** No action needed if you deploy the new structure.

### 2. Cron Endpoint Path

If you have external services calling your cron endpoint, update the URL:

**Old:** `https://your-app.vercel.app/api/...` (path varied)
**New:** `https://your-app.vercel.app/api/cron/check-jobs`

### 3. Import Paths

If you were importing functions from `route.ts`, update imports to use the new module structure:

**Old:**
```typescript
import { parseRSSFeed } from './route';
```

**New:**
```typescript
import { parseRSSFeeds } from '@/lib/rss-parser';
```

## Non-Breaking Changes

### Enhanced Features

1. **Better Error Messages**: Errors now include more context and are properly typed
2. **Improved Logging**: All logs include timestamps and structured data
3. **Rate Limiting**: Configurable delay between Telegram messages
4. **Duplicate Detection**: More robust link deduplication
5. **Security**: Optional cron secret validation

### Code Quality

1. **Separation of Concerns**: Each module has a single responsibility
2. **Testability**: Functions are pure and easily testable
3. **Reusability**: Utilities can be used in other parts of the application
4. **Documentation**: Comprehensive JSDoc comments and README

## Migration Steps

### Step 1: Backup Current Deployment

1. Note your current environment variables in Vercel
2. Save your current `.env` file (if any)

### Step 2: Deploy New Structure

#### Option A: Direct Deployment

1. Push the new code to your repository
2. Vercel will automatically deploy
3. Verify environment variables in Vercel dashboard

#### Option B: Test Locally First

1. Install dependencies: `npm install`
2. Copy environment variables: `cp .env.example .env`
3. Fill in your credentials in `.env`
4. Test locally: `npm run dev`
5. Test the endpoint: `curl http://localhost:3000/api/cron/check-jobs`
6. Deploy: `vercel`

### Step 3: Verify Deployment

1. Check Vercel deployment logs for errors
2. Manually trigger the cron job:
   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
        https://your-app.vercel.app/api/cron/check-jobs
   ```
3. Verify you receive a Telegram message
4. Monitor the logs for the next scheduled run

### Step 4: Update External References

If you have:
- Documentation referencing the old path
- External services calling the cron endpoint
- Monitoring tools checking the endpoint

Update them to use `/api/cron/check-jobs`.

## Rollback Plan

If you need to rollback:

1. Revert to the previous commit in Git
2. Redeploy via Vercel
3. Restore environment variables if changed

The old `route.ts` file is preserved in the commit history.

## Testing Checklist

After migration, verify:

- [ ] Cron job runs automatically every 5 minutes
- [ ] Telegram messages are received correctly
- [ ] No errors in Vercel logs
- [ ] Job analysis includes all expected fields
- [ ] Duplicate jobs are filtered out
- [ ] Rate limiting prevents Telegram API errors
- [ ] Error handling works (test with invalid token)

## Support

If you encounter issues during migration:

1. Check the Vercel deployment logs
2. Verify environment variables are set correctly
3. Test the endpoint manually with curl
4. Review the [README.md](README.md) for setup instructions
5. Open an issue on GitHub

## New Features to Explore

After successful migration, you can:

1. **Customize RSS Feeds**: Set `RSS_FEED_URLS` environment variable
2. **Adjust Check Interval**: Modify `CHECK_INTERVAL_MINUTES`
3. **Secure the Endpoint**: Set `CRON_SECRET` for production
4. **Extend Analysis**: Modify `src/lib/job-analyzer.ts` to extract additional fields
5. **Custom Formatting**: Update `src/lib/job-formatter.ts` to change message layout
6. **Add Webhooks**: Create new routes in `src/app/api/` for additional integrations

## Architecture Benefits

The new architecture provides:

1. **Scalability**: Easy to add new features and integrations
2. **Maintainability**: Clear separation of concerns
3. **Testing**: Each module can be tested independently
4. **Debugging**: Better error messages and logging
5. **Collaboration**: Team members can work on different modules
6. **Documentation**: Self-documenting code with TypeScript types
