export const RSS_FEED_URLS = process.env.RSS_FEED_URLS
  ? process.env.RSS_FEED_URLS.split(',').map(url => url.trim())
  : [
      "https://rss.app/feeds/w4Ru4NAR9U7AN4DZ.xml",
      "https://rss.app/feeds/lp93S41J4onjcEC8.xml",
      "https://rss.app/feeds/KcrfO8VmpGzIV7hV.xml",
      "https://rss.app/feeds/740W3eyo4bnyhwTs.xml"
    ];

export const CHECK_INTERVAL_MINUTES = parseInt(
  process.env.CHECK_INTERVAL_MINUTES || "1440",
  10
);

export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
export const CRON_SECRET = process.env.CRON_SECRET;

export const RATE_LIMIT_DELAY_MS = 2000; // Delay between Telegram messages
