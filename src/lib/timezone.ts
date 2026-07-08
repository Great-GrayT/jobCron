/**
 * Timezone helpers. The server stores/evaluates instants in UTC; the user picks
 * a home zone (global account preference) and every date in the app is rendered
 * through it. Uses luxon for DST-correct offsets/conversions and
 * countries-and-timezones to attach a flag to each zone.
 */

import { DateTime } from "luxon";
import { getAllTimezones, getTimezone } from "countries-and-timezones";

/** The viewer's own IANA zone, e.g. "Europe/Istanbul". */
export function browserTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export type ZoneInfo = { name: string; country: string | null; flag: string; offsetLabel: string };

/** ISO country code (first if a zone spans several) for a zone. */
export function zoneCountry(zone: string): string | null {
  return getTimezone(zone)?.countries?.[0] ?? null;
}

/** Regional-indicator flag emoji for an ISO-3166 alpha-2 code. */
export function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "🌐";
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/** Flag emoji for a zone (falls back to a globe). */
export function zoneFlag(zone: string): string {
  return countryFlag(zoneCountry(zone));
}

/** "+03:00" / "-05:30" offset label for a zone at `date` (DST-aware). */
export function offsetLabel(zone: string, date: Date = new Date()): string {
  const dt = DateTime.fromJSDate(date).setZone(zone);
  return dt.isValid ? dt.toFormat("ZZ") : "+00:00";
}

/** Minutes the zone is ahead of UTC at `date` (e.g. +180, -300, +330). DST-aware. */
export function offsetMinutes(zone: string, date: Date = new Date()): number {
  const dt = DateTime.fromJSDate(date).setZone(zone);
  return dt.isValid ? dt.offset : 0;
}

/** All known zones with flag + current offset, sorted by offset then name. */
export function listZones(date: Date = new Date()): ZoneInfo[] {
  let names: string[];
  try {
    names = Object.keys(getAllTimezones({ deprecated: false }));
  } catch {
    const sv = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    names = typeof sv === "function" ? sv("timeZone") : ["UTC"];
  }
  return names
    .map((name) => {
      const country = zoneCountry(name);
      return { name, country, flag: countryFlag(country), offsetLabel: offsetLabel(name, date) };
    })
    .sort((a, b) =>
      a.offsetLabel === b.offsetLabel
        ? a.name.localeCompare(b.name)
        : a.offsetLabel.localeCompare(b.offsetLabel),
    );
}

/**
 * Convert a local wall-clock time in `zone` to the UTC hour/minute a cron field
 * needs, DST-correct for `ref`'s date. (Cron is UTC-fixed, so a schedule that
 * crosses a DST boundary will shift by an hour in local terms — unavoidable.)
 */
export function localTimeToUtc(
  hour: number,
  minute: number,
  zone: string,
  ref: Date = new Date(),
): { hour: number; minute: number } {
  const local = DateTime.fromJSDate(ref).setZone(zone).set({ hour, minute, second: 0, millisecond: 0 });
  const u = local.toUTC();
  return { hour: u.hour, minute: u.minute };
}

/** Format an instant in a zone, e.g. "Mon Jul 07, 11:05". */
export function formatInZone(date: Date, zone: string): string {
  const dt = DateTime.fromJSDate(date).setZone(zone);
  return dt.isValid ? dt.toFormat("ccc LLL dd, HH:mm") : date.toISOString();
}

/** Format with an explicit luxon format string. */
export function formatInZoneFmt(date: Date, zone: string, fmt: string): string {
  const dt = DateTime.fromJSDate(date).setZone(zone);
  return dt.isValid ? dt.toFormat(fmt) : date.toISOString();
}
