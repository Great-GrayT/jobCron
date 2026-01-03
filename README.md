# LinkedIn Jobs Monitor

A Next.js-based cron job application that monitors RSS feeds for new job postings and sends real-time notifications to Telegram. The system analyzes job descriptions to extract key information like required certifications, years of experience, skills, and company details.

## Features

- **Automated Job Monitoring**: Checks multiple RSS feeds every 5 minutes for new job postings
- **Intelligent Job Analysis**: Extracts and analyzes job details including:
  - Required certifications (CFA, ACCA, MBA, etc.)
  - Years of experience
  - Technical skills and software requirements
  - Academic degrees and majors
  - Company type and industry
  - Job type classification
- **Telegram Notifications**: Sends formatted job alerts to your Telegram chat
- **Rate Limiting**: Prevents API throttling with configurable delays
- **Duplicate Detection**: Filters out duplicate job postings
- **Error Handling**: Comprehensive error handling and logging

## Project Structure

```
job cron on vercel/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── cron/
│   │           └── check-jobs/
│   │               └── route.ts          # API route handler
│   ├── lib/
│   │   ├── job-analyzer.ts              # Job description analysis
│   │   ├── job-formatter.ts             # Message formatting
│   │   ├── job-monitor-service.ts       # Main service logic
│   │   ├── logger.ts                    # Logging utility
│   │   ├── rss-parser.ts                # RSS feed parsing
│   │   ├── telegram.ts                  # Telegram API integration
│   │   └── validation.ts                # Request validation
│   ├── config/
│   │   └── constants.ts                 # Configuration constants
│   └── types/
│       └── job.ts                       # TypeScript type definitions
├── .env.example                         # Environment variables template
├── .gitignore                          # Git ignore rules
├── next.config.js                      # Next.js configuration
├── package.json                        # Dependencies
├── tsconfig.json                       # TypeScript configuration
├── vercel.json                         # Vercel deployment config
└── README.md                           # This file
```

## Setup Instructions

### Prerequisites

- Node.js 18.x or later
- A Telegram Bot Token
- Your Telegram Chat ID
- RSS feed URLs for job postings

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd "job cron on vercel"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# Required: Your Telegram bot token from @BotFather
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Required: Your Telegram chat ID (use @userinfobot to get it)
TELEGRAM_CHAT_ID=your_telegram_chat_id_here

# Optional: Secret for securing the cron endpoint
CRON_SECRET=your_secure_random_string_here

# Optional: Custom RSS feed URLs (comma-separated)
RSS_FEED_URLS=https://rss.app/feeds/feed1.xml,https://rss.app/feeds/feed2.xml

# Optional: Check interval in minutes (default: 5)
CHECK_INTERVAL_MINUTES=5
```

### 4. Getting Telegram Credentials

#### Create a Telegram Bot:
1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the instructions
3. Copy the bot token provided

#### Get Your Chat ID:
1. Search for [@userinfobot](https://t.me/userinfobot) on Telegram
2. Start a chat with it
3. Copy your user ID (this is your chat ID)

Alternatively, to send to a group:
1. Add your bot to a group
2. Send a message in the group
3. Visit `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find the chat ID in the response

### 5. Local Development

Run the development server:

```bash
npm run dev
```

Test the cron endpoint manually:

```bash
curl http://localhost:3000/api/cron/check-jobs
```

Or with authentication:

```bash
curl -H "Authorization: Bearer your_cron_secret" http://localhost:3000/api/cron/check-jobs
```

### 6. Deploy to Vercel

#### Via Vercel CLI:

```bash
npm i -g vercel
vercel login
vercel
```

#### Via Vercel Dashboard:

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Add environment variables in the Vercel dashboard
4. Deploy

The cron job is configured in `vercel.json` to run every 5 minutes automatically.

## Configuration

### RSS Feed URLs

By default, the application monitors these feeds:
- `https://rss.app/feeds/w4Ru4NAR9U7AN4DZ.xml`
- `https://rss.app/feeds/lp93S41J4onjcEC8.xml`
- `https://rss.app/feeds/KcrfO8VmpGzIV7hV.xml`
- `https://rss.app/feeds/740W3eyo4bnyhwTs.xml`

You can override this by setting the `RSS_FEED_URLS` environment variable with comma-separated URLs.

### Check Interval

The default check interval is 5 minutes. You can change this by:

1. Setting `CHECK_INTERVAL_MINUTES` in your `.env` file
2. Updating the cron schedule in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-jobs",
      "schedule": "*/5 * * * *"  // Every 5 minutes
    }
  ]
}
```

Cron schedule format: `* * * * *` (minute hour day month weekday)

### Security

The `CRON_SECRET` environment variable is optional but highly recommended for production. When set, all requests to the cron endpoint must include this secret in the `Authorization` header:

```
Authorization: Bearer your_cron_secret
```

This prevents unauthorized access to your cron endpoint.

## API Endpoints

### GET /api/cron/check-jobs

Main cron endpoint that checks for new jobs and sends notifications.

**Headers:**
- `Authorization: Bearer <CRON_SECRET>` (if CRON_SECRET is set)

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-03T12:00:00.000Z",
  "total": 150,
  "sent": 5,
  "failed": 0
}
```

### POST /api/cron/check-jobs

Same as GET, useful for manual testing.

## Monitoring and Logs

View logs in the Vercel dashboard:
1. Go to your project in Vercel
2. Navigate to the "Logs" tab
3. Filter by function: `/api/cron/check-jobs`

All logs include timestamps and structured information about:
- Jobs fetched
- Jobs filtered
- Messages sent
- Errors encountered

## Troubleshooting

### No messages are being sent

1. Check your environment variables are set correctly
2. Verify your Telegram bot token is valid
3. Ensure your bot can send messages to the chat (start a chat with your bot first)
4. Check the Vercel logs for errors

### Getting rate limited by Telegram

The default rate limit delay is 2 seconds between messages. If you're still getting rate limited:

1. Increase `RATE_LIMIT_DELAY_MS` in [constants.ts](src/config/constants.ts)
2. Reduce the number of RSS feeds being monitored

### Jobs are being sent multiple times

1. Check that your cron job isn't running too frequently
2. Verify the `CHECK_INTERVAL_MINUTES` matches your cron schedule
3. Ensure the job posting dates are being parsed correctly

### Authorization errors

If you set `CRON_SECRET`, make sure:
1. It's set in your Vercel environment variables
2. The cron request includes the correct `Authorization` header
3. There are no extra spaces in the token

## Development

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Building

```bash
npm run build
```

## Architecture

The application follows a modular architecture:

- **Route Handler** ([route.ts](src/app/api/cron/check-jobs/route.ts)): Entry point, handles HTTP requests
- **Service Layer** ([job-monitor-service.ts](src/lib/job-monitor-service.ts)): Orchestrates the main workflow
- **Utilities**: Specialized modules for RSS parsing, job analysis, formatting, and Telegram integration
- **Type Safety**: Comprehensive TypeScript types for all data structures
- **Error Handling**: Custom error classes and structured error responses
- **Logging**: Centralized logging with timestamps

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
#   j o b C r o n  
 