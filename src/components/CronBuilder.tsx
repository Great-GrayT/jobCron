"use client";

import { useState } from "react";

// Visual builder for a 5-field cron ("m h dom mon dow"). Toggles compose the
// expression; the raw field is also directly editable (source of truth on edit).

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function compose(minute: string, hour: string, dom: string, months: number[], dows: number[]): string {
  const mon = months.length === 12 || months.length === 0 ? "*" : months.map((m) => m + 1).join(",");
  const dow = dows.length === 7 || dows.length === 0 ? "*" : dows.join(",");
  return `${minute || "0"} ${hour || "*"} ${dom || "*"} ${mon} ${dow}`;
}

export function CronBuilder({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [minute, setMinute] = useState("0");
  const [hour, setHour] = useState("*");
  const [dom, setDom] = useState("*");
  const [months, setMonths] = useState<number[]>([]);
  const [dows, setDows] = useState<number[]>([]);

  const push = (m = minute, h = hour, d = dom, mo = months, dw = dows) =>
    onChange(compose(m, h, d, mo, dw));

  const toggle = (arr: number[], v: number, set: (a: number[]) => void, after: (a: number[]) => void) => {
    const next = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v].sort((a, b) => a - b);
    set(next);
    after(next);
  };

  return (
    <div className="cron-builder">
      <div className="cron-grid">
        <div className="field">
          <label>Minute</label>
          <input value={minute} onChange={(e) => { setMinute(e.target.value); push(e.target.value); }} placeholder="0 / */15" />
        </div>
        <div className="field">
          <label>Hour</label>
          <input value={hour} onChange={(e) => { setHour(e.target.value); push(minute, e.target.value); }} placeholder="* / 9 / 9,17" />
        </div>
        <div className="field">
          <label>Day of month</label>
          <input value={dom} onChange={(e) => { setDom(e.target.value); push(minute, hour, e.target.value); }} placeholder="* / 1 / 1,15" />
        </div>
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
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="* * * * *" spellCheck={false} />
      </div>
    </div>
  );
}
