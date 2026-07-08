"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { browserTz, formatInZone, formatInZoneFmt, offsetLabel, zoneCountry } from "@/lib/timezone";

interface TimezoneContextType {
  /** Active IANA zone applied to every date in the app. */
  timezone: string;
  setTimezone: (tz: string) => void;
  /** True until the persisted preference has been read on the client. */
  ready: boolean;
  /** ISO-3166 alpha-2 country code for the active zone (for a flag), or null. */
  countryCode: string | null;
  offset: string;
  /** Render an instant in the active zone: default "Mon Jul 07, 11:05". */
  format: (date: Date | string | number, fmt?: string) => string;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);
const STORAGE_KEY = "tz-v1";

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [timezone, setTz] = useState<string>("UTC");
  const [ready, setReady] = useState(false);

  // Load the saved preference (or fall back to the browser's zone) on mount.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setTz(saved || browserTz());
    setReady(true);
  }, []);

  const setTimezone = useCallback((tz: string) => {
    setTz(tz);
    try {
      localStorage.setItem(STORAGE_KEY, tz);
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, []);

  const format = useCallback(
    (date: Date | string | number, fmt?: string) => {
      const d = date instanceof Date ? date : new Date(date);
      return fmt ? formatInZoneFmt(d, timezone, fmt) : formatInZone(d, timezone);
    },
    [timezone],
  );

  const value = useMemo<TimezoneContextType>(
    () => ({
      timezone,
      setTimezone,
      ready,
      countryCode: zoneCountry(timezone),
      offset: offsetLabel(timezone),
      format,
    }),
    [timezone, setTimezone, ready, format],
  );

  return <TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>;
}

export function useTimezone() {
  const ctx = useContext(TimezoneContext);
  if (ctx === undefined) throw new Error("useTimezone must be used within a TimezoneProvider");
  return ctx;
}
