// Index powering the navbar "Search the page" box. Each entry maps a page or a
// notable component/section to the route that shows it, so a query like "avatar",
// "cron", "chart" or "delete user" suggests the right destination.

export interface SearchEntry {
  label: string;
  href: string;
  hint: string;
  section: "settings" | "features" | "general";
  keywords: string[];
}

export const SEARCH_INDEX: SearchEntry[] = [
  // pages
  { label: "Home", href: "/", hint: "Landing", section: "general", keywords: ["home", "landing", "start"] },
  { label: "Account", href: "/dashboard/account", hint: "Settings", section: "settings", keywords: ["account", "profile", "avatar", "photo", "name", "phone", "country", "password"] },
  { label: "Feeds", href: "/dashboard/feeds", hint: "Settings", section: "settings", keywords: ["feed", "rss", "add feed", "url", "notify", "share"] },
  { label: "Telegram", href: "/dashboard/telegram", hint: "Settings", section: "settings", keywords: ["telegram", "bot", "token", "channel", "chat id", "filtered channel"] },
  { label: "JFS", href: "/dashboard/jfs", hint: "Settings", section: "settings", keywords: ["jfs", "job filtering system", "filter", "industry", "category", "seniority", "keyword", "and", "or"] },
  { label: "Schedules", href: "/dashboard/schedules", hint: "Settings", section: "settings", keywords: ["schedule", "cron", "interval", "scrape", "check jobs", "cron builder"] },
  { label: "RSS App", href: "/rss", hint: "Feature", section: "features", keywords: ["rss", "feed", "call", "send", "run feed"] },
  { label: "Stats", href: "/stats", hint: "Feature", section: "features", keywords: ["stats", "analytics", "charts", "salary", "skills", "industry", "treemap", "heatmap"] },
  { label: "Tracking", href: "/applied", hint: "Feature", section: "features", keywords: ["tracking", "applied", "applications", "velocity", "company"] },
  { label: "Messages", href: "/messages", hint: "Feature", section: "features", keywords: ["message", "chat", "conversation", "inbox", "reply", "admin query"] },
  { label: "Admin", href: "/admin", hint: "Feature", section: "features", keywords: ["admin", "user management", "delete user", "ban", "role", "users"] },

  // components / sections -> page
  { label: "Avatar picker", href: "/dashboard/account", hint: "Account", section: "settings", keywords: ["avatar", "album", "profile picture", "upload", "random"] },
  { label: "Add a feed", href: "/dashboard/feeds", hint: "Feeds", section: "settings", keywords: ["add feed", "new feed", "bulk add"] },
  { label: "Cron builder", href: "/dashboard/schedules", hint: "Schedules", section: "settings", keywords: ["cron builder", "cron expression", "every"] },
  { label: "Chat", href: "/messages", hint: "Messages", section: "features", keywords: ["chat", "bubble", "dm", "direct message"] },
  { label: "Delete a user", href: "/admin", hint: "Admin", section: "features", keywords: ["delete user", "remove user", "purge"] },
  { label: "User management", href: "/admin", hint: "Admin", section: "features", keywords: ["user management", "manage users", "roles", "bans"] },
];

export function searchPages(query: string, limit = 8): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: { e: SearchEntry; score: number }[] = [];
  for (const e of SEARCH_INDEX) {
    const label = e.label.toLowerCase();
    let score = 0;
    if (label === q) score = 100;
    else if (label.startsWith(q)) score = 80;
    else if (label.includes(q)) score = 60;
    if (e.keywords.some((k) => k.includes(q))) score = Math.max(score, 50);
    if (score) scored.push({ e, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.e);
}
