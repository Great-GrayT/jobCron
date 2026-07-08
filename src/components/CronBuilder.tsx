"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { CRON_PRESET_GROUPS, cronToUtc, describeCron, isValidCron, nextRuns } from "@/lib/cron";
import { offsetMinutes } from "@/lib/timezone";
import { useTimezone } from "@/context/TimezoneContext";
import { Flag } from "@/components/Flag";

// Visual builder for a 5-field cron ("m h dom mon dow"). Presets and toggles
// compose the expression; the raw field is also directly editable. Every time in
// this builder is the USER'S timezone; the schedules page converts it to UTC on
// save (cronToUtc), because the server matches in UTC. The next-run preview runs
// on the UTC-converted expression, so it mirrors exactly what the server will do.

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
  const { timezone, countryCode, offset, format } = useTimezone();
  const offMin = useMemo(() => offsetMinutes(timezone), [timezone]);

  const push = (m = minute, h = hour, d = dom, mo = months, dw = dows) =>
    onChange(compose(m, h, d, mo, dw));

  const toggle = (arr: number[], v: number, set: (a: number[]) => void, after: (a: number[]) => void) => {
    const next = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v].sort((a, b) => a - b);
    set(next);
    after(next);
  };

  const valid = useMemo(() => isValidCron(value), [value]);
  const summary = useMemo(() => describeCron(value), [value]);
  // Preview runs on the UTC-converted expression (what the server stores/matches).
  const runs = useMemo(() => (valid ? nextRuns(cronToUtc(value, offMin), 3) : []), [value, valid, offMin]);

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
                title={`${p.expr} | ${describeCron(p.expr)}`}
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

      {/* Times below are in your timezone; saved to the server as UTC. */}
      <div className="cron-tz-note-row">
        <Flag code={countryCode} />
        <span>Times are in <b>{timezone.replace(/_/g, " ")}</b> (UTC{offset}) | converted to UTC when saved. Change your zone from the top-bar picker.</span>
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
        <span>{valid ? summary : "Invalid cron | need 5 fields: minute hour day-of-month month day-of-week."}</span>
      </div>

      {runs.length > 0 && (
        <div className="cron-next">
          <span className="cron-next-head">
            <Clock size={13} /> Next runs · <span className="cron-next-zone"><Flag code={countryCode} /> your time</span> / UTC
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
