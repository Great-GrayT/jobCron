/**
 * Frontend cron helpers for the schedule builder. Mirrors the server matcher
 * (cron-server/src/lib/FUNC-cron.ts) exactly | same 5-field grammar, same UTC
 * semantics | so the live description and "next runs" preview match what the
 * backend will actually do. All times are UTC.
 */

const BOUNDS: [number, number][] = [
  [0, 59], // minute
  [0, 23], // hour
  [1, 31], // day of month
  [1, 12], // month
  [0, 6], //  day of week (0 = Sun)
];

function parseField(field: string, min: number, max: number): Set<number> {
  const out = new Set<number>();
  for (const part of field.split(",")) {
    const [rangePart, stepPart] = part.split("/");
    const step = stepPart ? parseInt(stepPart, 10) : 1;
    let lo = min;
    let hi = max;
    if (rangePart !== "*") {
      const [a, b] = rangePart.split("-");
      lo = parseInt(a, 10);
      hi = b !== undefined ? parseInt(b, 10) : lo;
    }
    if (Number.isNaN(lo) || Number.isNaN(hi) || Number.isNaN(step) || step < 1) continue;
    for (let v = lo; v <= hi; v += step) if (v >= min && v <= max) out.add(v);
  }
  return out;
}

export function isValidCron(expr: string): boolean {
  const f = expr.trim().split(/\s+/);
  if (f.length !== 5) return false;
  return f.every((field, i) => parseField(field, BOUNDS[i][0], BOUNDS[i][1]).size > 0);
}

function matches(fields: string[], date: Date): boolean {
  const minute = parseField(fields[0], 0, 59);
  const hour = parseField(fields[1], 0, 23);
  const dom = parseField(fields[2], 1, 31);
  const month = parseField(fields[3], 1, 12);
  const dow = parseField(fields[4], 0, 6);
  const domRestricted = fields[2] !== "*";
  const dowRestricted = fields[4] !== "*";
  const dayOk =
    domRestricted && dowRestricted
      ? dom.has(date.getUTCDate()) || dow.has(date.getUTCDay())
      : dom.has(date.getUTCDate()) && dow.has(date.getUTCDay());
  return (
    minute.has(date.getUTCMinutes()) &&
    hour.has(date.getUTCHours()) &&
    month.has(date.getUTCMonth() + 1) &&
    dayOk
  );
}

/** Next N run times (UTC) after `from`. Steps minute-by-minute up to a horizon. */
export function nextRuns(expr: string, count = 5, from: Date = new Date()): Date[] {
  if (!isValidCron(expr)) return [];
  const fields = expr.trim().split(/\s+/);
  const runs: Date[] = [];
  const d = new Date(from);
  d.setUTCSeconds(0, 0);
  d.setUTCMinutes(d.getUTCMinutes() + 1); // strictly after `from`
  const MAX_ITER = 366 * 24 * 60; // ~1 year of minutes
  for (let i = 0; i < MAX_ITER && runs.length < count; i++) {
    if (matches(fields, d)) runs.push(new Date(d));
    d.setUTCMinutes(d.getUTCMinutes() + 1);
  }
  return runs;
}

const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

function listPhrase(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Plain-English summary of an expression. Empty string if invalid. */
export function describeCron(expr: string): string {
  const f = expr.trim().split(/\s+/);
  if (!isValidCron(expr)) return "";
  const [min, hr, dom, mon, dow] = f;
  const minSet = parseField(min, 0, 59);
  const hrSet = parseField(hr, 0, 23);

  // ---- time-of-day clause ----
  let time: string;
  const everyNMin = /^\*\/(\d+)$/.exec(min);
  if (min === "*") {
    time = hr === "*" ? "Every minute" : "Every minute";
  } else if (everyNMin) {
    time = `Every ${everyNMin[1]} minutes`;
  } else if (minSet.size === 1 && hr === "*") {
    time = `Hourly at :${pad([...minSet][0])}`;
  } else if (minSet.size === 1 && hrSet.size <= 6) {
    const m = [...minSet][0];
    time = "At " + listPhrase([...hrSet].sort((a, b) => a - b).map((h) => `${pad(h)}:${pad(m)}`));
  } else {
    time = `At minute ${[...minSet].join(",")}`;
  }

  // ---- hour-window clause (only meaningful when minute is a step/wildcard) ----
  const rangeMatch = /^(\d+)-(\d+)$/.exec(hr);
  let window = "";
  if ((min === "*" || everyNMin) && hr !== "*") {
    if (rangeMatch) window = `, between ${pad(+rangeMatch[1])}:00 and ${pad(+rangeMatch[2])}:59`;
    else if (hrSet.size <= 6)
      window = `, during hour ${[...hrSet].sort((a, b) => a - b).map(pad).join(", ")}`;
    else window = "";
  }

  // ---- day clause ----
  const parts: string[] = [];
  if (dow !== "*") {
    const days = [...parseField(dow, 0, 6)].sort((a, b) => a - b).map((d) => DOW_NAMES[d]);
    parts.push(`on ${listPhrase(days)}`);
  }
  if (dom !== "*") parts.push(`on day ${dom} of the month`);
  if (mon !== "*") {
    const months = [...parseField(mon, 1, 12)].sort((a, b) => a - b).map((m) => MON_NAMES[m - 1]);
    parts.push(`in ${listPhrase(months)}`);
  }
  // Only say "every day" for a specific time-of-day; it reads as redundant after
  // a frequency clause ("Every 5 minutes", "Hourly …").
  const dayClause = parts.length
    ? " " + parts.join(", ")
    : dow === "*" && dom === "*" && time.startsWith("At")
      ? " every day"
      : "";

  return `${time}${window}${dayClause}`;
}

const uniqSort = (a: number[]) => [...new Set(a)].sort((x, y) => x - y);

/** Re-compress a value set back to compact cron notation: wildcard, range, step, or list. */
function compressField(vals: number[], max: number): string {
  const v = uniqSort(vals);
  if (v.length === 0) return "*";
  if (v.length === max + 1) return "*";
  const contiguous = v.every((x, i) => i === 0 || x === v[i - 1] + 1);
  if (contiguous) return v.length === 1 ? String(v[0]) : `${v[0]}-${v[v.length - 1]}`;
  const step = v[1] - v[0];
  if (v[0] === 0 && step > 1 && v.every((x, i) => x === i * step) && v[v.length - 1] + step > max) {
    return `*/${step}`;
  }
  return v.join(",");
}

/** Shift the day-of-week / day-of-month field by whole days (best-effort). */
function shiftDayField(field: string, dd: number, min: number, max: number, isDow: boolean): string {
  const vals = [...parseField(field, min, max)].map((v) => {
    if (isDow) return (((v + dd) % 7) + 7) % 7; // 0-6
    let n = v + dd; // dom 1-31, wrap (month length ignored | approximate)
    while (n < 1) n += 31;
    while (n > 31) n -= 31;
    return n;
  });
  return isDow ? compressField(vals, 6) : uniqSort(vals).join(",");
}

/**
 * Shift a cron's time-of-day by `deltaMin` minutes, used to convert between the
 * user's timezone and the UTC the server matches on. Day-of-week / day-of-month
 * roll over when the shift crosses midnight (best-effort | a schedule whose hour
 * list straddles midnight while days are restricted can't be represented exactly,
 * so days are left as-is there). Non-time-bearing shapes are returned unchanged.
 */
export function cronShiftMinutes(expr: string, deltaMin: number): string {
  const f = expr.trim().split(/\s+/);
  if (f.length !== 5 || !Number.isFinite(deltaMin) || deltaMin === 0) return expr;
  const [minF, hourF, domF, monF, dowF] = f;

  // Hour = * : runs every hour, so only the minute-within-hour shifts.
  if (hourF === "*") {
    if (minF === "*" || minF.includes("/")) return expr; // every minute / every-N-min is tz-invariant
    const mins = [...parseField(minF, 0, 59)].map((m) => (((m + deltaMin) % 60) + 60) % 60);
    return `${compressField(mins, 59)} * ${domF} ${monF} ${dowF}`;
  }

  const hours = [...parseField(hourF, 0, 23)];
  const minuteStar = minF === "*";
  const minutes = minuteStar ? Array.from({ length: 60 }, (_, i) => i) : [...parseField(minF, 0, 59)];
  if (hours.length === 0 || minutes.length === 0) return expr;

  const newHours = new Set<number>();
  const newMins = new Set<number>();
  const dayDeltas = new Set<number>();
  for (const h of hours) {
    for (const m of minutes) {
      let total = h * 60 + m + deltaMin;
      dayDeltas.add(Math.floor(total / 1440));
      total = ((total % 1440) + 1440) % 1440;
      newHours.add(Math.floor(total / 60));
      newMins.add(total % 60);
    }
  }

  const newMinF = minuteStar ? "*" : compressField([...newMins], 59);
  const newHourF = compressField([...newHours], 23);

  let newDom = domF;
  let newDow = dowF;
  if (dayDeltas.size === 1) {
    const dd = [...dayDeltas][0];
    if (dd !== 0) {
      if (dowF !== "*") newDow = shiftDayField(dowF, dd, 0, 6, true);
      if (domF !== "*") newDom = shiftDayField(domF, dd, 1, 31, false);
    }
  }
  return `${newMinF} ${newHourF} ${newDom} ${monF} ${newDow}`;
}

/** Convert a cron the user built in their zone to the UTC the server stores/matches. */
export const cronToUtc = (expr: string, offsetMin: number) => cronShiftMinutes(expr, -offsetMin);
/** Convert a stored UTC cron back to the user's zone for display/editing. */
export const cronToLocal = (expr: string, offsetMin: number) => cronShiftMinutes(expr, offsetMin);

export type Preset = { label: string; expr: string };

/** Common schedules offered as one-click templates, grouped for scannability. */
export const CRON_PRESET_GROUPS: { group: string; presets: Preset[] }[] = [
  {
    group: "Frequent",
    presets: [
      { label: "Every minute", expr: "* * * * *" },
      { label: "Every 5 min", expr: "*/5 * * * *" },
      { label: "Every 10 min", expr: "*/10 * * * *" },
      { label: "Every 15 min", expr: "*/15 * * * *" },
      { label: "Every 30 min", expr: "*/30 * * * *" },
    ],
  },
  {
    group: "Hourly & windows",
    presets: [
      { label: "Hourly", expr: "0 * * * *" },
      { label: "Every 6 hours", expr: "0 */6 * * *" },
      { label: "Business hours (08–21, /5)", expr: "*/5 8-21 * * *" },
      { label: "Work hours (09–17, /15)", expr: "*/15 9-17 * * *" },
    ],
  },
  {
    group: "Daily & weekly",
    presets: [
      { label: "Midnight", expr: "0 0 * * *" },
      { label: "Daily 09:00", expr: "0 9 * * *" },
      { label: "Twice daily (00 & 12)", expr: "0 0,12 * * *" },
      { label: "Weekdays 09:00", expr: "0 9 * * 1-5" },
      { label: "Weekends 10:00", expr: "0 10 * * 0,6" },
      { label: "Weekly (Mon 09:00)", expr: "0 9 * * 1" },
      { label: "Monthly (1st 00:00)", expr: "0 0 1 * *" },
    ],
  },
];

/** Flat list of every template (kept for convenience / existing callers). */
export const CRON_PRESETS: Preset[] = CRON_PRESET_GROUPS.flatMap((g) => g.presets);
