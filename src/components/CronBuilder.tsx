"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Globe } from "lucide-react";
import { CRON_PRESET_GROUPS, describeCron, isValidCron, nextRuns } from "@/lib/cron";
import { localTimeToUtc } from "@/lib/timezone";
import { useTimezone } from "@/context/TimezoneContext";

// Visual builder for a 5-field cron ("m h dom mon dow"). Presets and toggles
// compose the expression; the raw field is also directly editable (source of
// truth on edit). A live summary + next-run preview derive from the raw value.
// All times are UTC — that is what the server matches on.

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function compose(minute: string, hour: string, dom: string, months: number[], dows: number[]): string {
  const mon = months.length === 12 || months.length === 0 ? "*" : months.map((m) => m + 1).join(",");
  const dow = dows.length === 7 || dows.length === 0 ? "*" : dows.join(",");
  return `${minute || "0"} ${hour || "*"} ${dom || "*"} ${mon} ${dow}`;
}

const fmtRun = (d: Date) =>
  `${DOW[d.getUTCDay()]} ${MON[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, "0")}, ` +
  `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;

export function CronBuilder({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [minute, setMinute] = useState("0");
  const [hour, setHour] = useState("*");
  const [dom, setDom] = useState("*");
  const [months, setMonths] = useState<number[]>([]);
  const [dows, setDows] = useState<number[]>([]);
  const [localTime, setLocalTime] = useState("09:00");
  const { timezone, flag, offset, format } = useTimezone();

  const push = (m = minute, h = hour, d = dom, mo = months, dw = dows) =>
    onChange(compose(m, h, d, mo, dw));

  // Convert the entered local wall-clock time (in the user's global zone) to UTC
  // and drop it into the minute/hour fields — the server matches in UTC.
  const applyLocalTime = () => {
    const [hStr, mStr] = localTime.split(":");
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return;
    const utc = localTimeToUtc(h, m, timezone);
    setMinute(String(utc.minute));
    setHour(String(utc.hour));
    push(String(utc.minute), String(utc.hour));
  };

  const toggle = (arr: number[], v: number, set: (a: number[]) => void, after: (a: number[]) => void) => {
    const next = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v].sort((a, b) => a - b);
    set(next);
    after(next);
  };

  const valid = useMemo(() => isValidCron(value), [value]);
  const summary = useMemo(() => describeCron(value), [value]);
  const runs = useMemo(() => (valid ? nextRuns(value, 3) : []), [value, valid]);

  return (
    <div className="cron-builder">
      {/* one-click templates, grouped */}
      <label className="cron-label" style={{ marginTop: 0 }}>Templates</label>
      {CRON_PRESET_GROUPS.map((g) => (
        <div className="cron-preset-group" key={g.group}>
          <span className="cron-preset-group-label">{g.group}</span>
          <div className="cron-toggles">
            {g.presets.map((p) => (
              <button
                type="button"
                key={p.expr}
                className={`chip-toggle ${value.trim() === p.expr ? "on" : ""}`}
                title={`${p.expr} — ${describeCron(p.expr)}`}
                onClick={() => onChange(p.expr)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="cron-grid" style={{ marginTop: "0.7rem" }}>
        <div className="field">
          <label>Minute</label>
          <input value={minute} onChange={(e) => { setMinute(e.target.value); push(e.target.value); }} placeholder="0 / */15" />
        </div>
        <div className="field">
          <label>Hour</label>
          <input value={hour} onChange={(e) => { setHour(e.target.value); push(minute, e.target.value); }} placeholder="* / 9 / 8-21" />
        </div>
        <div className="field">
          <label>Day of month</label>
          <input value={dom} onChange={(e) => { setDom(e.target.value); push(minute, hour, e.target.value); }} placeholder="* / 1 / 1,15" />
        </div>
      </div>

      {/* location / timezone helper — uses the global zone from the top bar */}
      <div className="cron-tz">
        <span className="cron-tz-head">
          <Globe size={13} /> Set by your local time
          <span className="cron-tz-zone">{flag} {timezone.replace(/_/g, " ")} · UTC{offset}</span>
        </span>
        <div className="cron-tz-row">
          <input
            type="time"
            value={localTime}
            onChange={(e) => setLocalTime(e.target.value)}
            aria-label="Local time"
          />
          <button type="button" className="btn sm" onClick={applyLocalTime}>Apply</button>
        </div>
        <span className="cron-tz-note">
          Converts to UTC for the schedule (cron runs in UTC). Change your zone from the
          timezone picker in the top bar. Across daylight-saving changes the local time may shift by an hour.
        </span>
      </div>

      <label className="cron-label">Days of week</label>
      <div className="cron-toggles">
        {DOW.map((d, i) => (
          <button type="button" key={d} className={`chip-toggle ${dows.includes(i) ? "on" : ""}`}
            onClick={() => toggle(dows, i, setDows, (n) => push(minute, hour, dom, months, n))}>{d}</button>
        ))}
      </div>

      <label className="cron-label">Months</label>
      <div className="cron-toggles">
        {MON.map((m, i) => (
          <button type="button" key={m} className={`chip-toggle ${months.includes(i) ? "on" : ""}`}
            onClick={() => toggle(months, i, setMonths, (n) => push(minute, hour, dom, n, dows))}>{m}</button>
        ))}
      </div>

      <div className="field" style={{ marginTop: "0.6rem" }}>
        <label>Cron expression (editable)</label>
        <input
          className={value.trim() && !valid ? "invalid" : ""}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="* * * * *"
          spellCheck={false}
          aria-invalid={!!value.trim() && !valid}
        />
      </div>

      {/* live feedback */}
      <div className={`cron-summary ${valid ? "ok" : "bad"}`}>
        {valid ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
        <span>{valid ? summary : "Invalid cron — need 5 fields: minute hour day-of-month month day-of-week."}</span>
      </div>

      {runs.length > 0 && (
        <div className="cron-next">
          <span className="cron-next-head">
            <Clock size={13} /> Next runs · <span className="cron-next-zone">{flag} your time</span> / UTC
          </span>
          <ul>
            {runs.map((r, i) => (
              <li key={i}>
                <span className="cron-next-local">{format(r)}</span>
                <span className="cron-next-utc">{fmtRun(r)} UTC</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
