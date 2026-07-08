"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useTimezone } from "@/context/TimezoneContext";
import { browserTz, listZones } from "@/lib/timezone";
import { Flag } from "@/components/Flag";

// Global timezone selector shown in the top bar. Picking a zone re-renders every
// date in the app (see useTimezone().format). Flags come from the zone's country.

export function TimezonePicker() {
  const { timezone, setTimezone, countryCode, offset } = useTimezone();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const zones = useMemo(() => listZones(), []);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? zones.filter((z) => z.name.toLowerCase().includes(needle) || (z.country ?? "").toLowerCase().includes(needle))
      : zones;
    return list.slice(0, 200);
  }, [q, zones]);

  const shortName = timezone.split("/").pop()?.replace(/_/g, " ") ?? timezone;

  return (
    <div className="tz-picker" ref={ref}>
      <button
        className="terminal-btn tz-picker-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change timezone"
        aria-expanded={open}
        title={`${timezone} (UTC${offset})`}
      >
        <Flag code={countryCode} className="tz-flag" />
        <span className="tz-name">{shortName}</span>
        <span className="tz-offset">UTC{offset}</span>
      </button>

      {open && (
        <div className="tz-dropdown" role="listbox" aria-label="Timezones">
          <input
            className="tz-search"
            autoFocus
            placeholder="Search city or country…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            spellCheck={false}
          />
          <button
            className="tz-option tz-detect"
            onClick={() => { setTimezone(browserTz()); setOpen(false); }}
          >
            📍 Detect my timezone
          </button>
          <div className="tz-list">
            {filtered.map((z) => (
              <button
                key={z.name}
                className={`tz-option ${z.name === timezone ? "active" : ""}`}
                role="option"
                aria-selected={z.name === timezone}
                onClick={() => { setTimezone(z.name); setOpen(false); }}
              >
                <Flag code={z.country} className="tz-flag" />
                <span className="tz-option-name">{z.name.replace(/_/g, " ")}</span>
                <span className="tz-option-offset">UTC{z.offsetLabel}</span>
                {z.name === timezone && <Check size={13} className="tz-check" />}
              </button>
            ))}
            {filtered.length === 0 && <div className="tz-empty">No match</div>}
          </div>
        </div>
      )}
    </div>
  );
}
