// Client-side working-day filter for the Posting Velocity chart. A working day is
// Mon–Fri that isn't a US federal holiday. Holidays are computed (no server, no
// data file) and cached per year. Dates are "YYYY-MM-DD" and treated as UTC.

const holidayCache = new Map<number, Set<string>>();

const pad = (n: number) => String(n).padStart(2, "0");

/** Day-of-month of the n-th `weekday` (0=Sun) in `month` (1-12), or null. */
function nthWeekday(year: number, month: number, weekday: number, n: number): number | null {
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCMonth() !== month - 1) break;
    if (d.getUTCDay() === weekday && ++count === n) return day;
  }
  return null;
}

/** Day-of-month of the last `weekday` in `month`. */
function lastWeekday(year: number, month: number, weekday: number): number {
  let last = 1;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCMonth() !== month - 1) break;
    if (d.getUTCDay() === weekday) last = day;
  }
  return last;
}

function usFederalHolidays(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const s = new Set<string>();
  const add = (m: number, d: number) => s.add(`${year}-${pad(m)}-${pad(d)}`);
  // fixed-date
  add(1, 1); //   New Year's Day
  add(6, 19); //  Juneteenth
  add(7, 4); //   Independence Day
  add(11, 11); // Veterans Day
  add(12, 25); // Christmas
  // floating
  add(1, nthWeekday(year, 1, 1, 3)!); //   MLK Day — 3rd Mon Jan
  add(2, nthWeekday(year, 2, 1, 3)!); //   Presidents' Day — 3rd Mon Feb
  add(5, lastWeekday(year, 5, 1)); //      Memorial Day — last Mon May
  add(9, nthWeekday(year, 9, 1, 1)!); //   Labor Day — 1st Mon Sep
  add(10, nthWeekday(year, 10, 1, 2)!); // Columbus Day — 2nd Mon Oct
  add(11, nthWeekday(year, 11, 4, 4)!); // Thanksgiving — 4th Thu Nov
  holidayCache.set(year, s);
  return s;
}

/** True if `dateStr` (YYYY-MM-DD) is a Mon–Fri that isn't a US federal holiday. */
export function isWorkingDay(dateStr: string): boolean {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const dow = d.getUTCDay();
  if (dow === 0 || dow === 6) return false; // weekend
  return !usFederalHolidays(d.getUTCFullYear()).has(dateStr);
}
