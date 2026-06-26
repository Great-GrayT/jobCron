"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { schedules } from "@/lib/api/me";
import type { Schedule, ScheduleJob } from "@/lib/api/types";

const JOBS: ScheduleJob[] = ["check-jobs", "stats-ingest", "scrape"];

export default function SchedulesPage() {
  const [list, setList] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [job, setJob] = useState<ScheduleJob>("check-jobs");
  const [intervalMinutes, setInterval] = useState(15);
  const [scrapeSearch, setScrapeSearch] = useState("");
  const [scrapeCountries, setScrapeCountries] = useState("");
  const [scrapeTimeFilter, setScrapeTimeFilter] = useState(86400);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setList(await schedules.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load schedules");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      await schedules.create({
        job,
        intervalMinutes: Math.max(5, intervalMinutes),
        enabled: true,
        ...(job === "scrape"
          ? {
              scrapeSearch: scrapeSearch.trim() || undefined,
              scrapeCountries: scrapeCountries.trim() || undefined,
              scrapeTimeFilter,
            }
          : {}),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add schedule");
    } finally {
      setAdding(false);
    }
  };

  const patch = async (id: string, body: Partial<Schedule>) => {
    setList((prev) => prev.map((s) => (s.id === id ? { ...s, ...body } : s)));
    try {
      await schedules.update(id, body);
    } catch {
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this schedule?")) return;
    setList((prev) => prev.filter((s) => s.id !== id));
    try {
      await schedules.remove(id);
    } catch {
      load();
    }
  };

  return (
    <section className="panel">
      <h2>SCHEDULES</h2>
      <p className="hint">One schedule per job. Interval is how often it runs (min 5 minutes). The scrape fields apply only to the <b>scrape</b> job.</p>

      {error && <div className="auth-error">{error}</div>}

      <form className="toolbar" onSubmit={add}>
        <div className="field">
          <label htmlFor="job">Job</label>
          <select id="job" value={job} onChange={(e) => setJob(e.target.value as ScheduleJob)}>
            {JOBS.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="iv">Interval (min)</label>
          <input id="iv" type="number" min={5} value={intervalMinutes} onChange={(e) => setInterval(Number(e.target.value))} />
        </div>
        {job === "scrape" && (
          <>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="ss">Search</label>
              <input id="ss" value={scrapeSearch} onChange={(e) => setScrapeSearch(e.target.value)} placeholder="terms" />
            </div>
            <div className="field">
              <label htmlFor="sc">Countries</label>
              <input id="sc" value={scrapeCountries} onChange={(e) => setScrapeCountries(e.target.value)} placeholder="UK,US" />
            </div>
            <div className="field">
              <label htmlFor="tf">Time window (s)</label>
              <input id="tf" type="number" value={scrapeTimeFilter} onChange={(e) => setScrapeTimeFilter(Number(e.target.value))} />
            </div>
          </>
        )}
        <button className="btn" type="submit" disabled={adding}>
          {adding ? <Loader2 className="spin" size={16} /> : <Plus size={16} />} ADD
        </button>
      </form>

      {loading ? (
        <div className="muted"><Loader2 className="spin" size={16} /> loading…</div>
      ) : list.length === 0 ? (
        <p className="muted">No schedules yet.</p>
      ) : (
        <table className="dash-table">
          <thead>
            <tr><th>Job</th><th>Interval</th><th>Scrape config</th><th>Enabled</th><th></th></tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <td>{s.job}</td>
                <td>
                  <input
                    type="number"
                    min={5}
                    value={s.intervalMinutes}
                    style={{ width: 70 }}
                    onChange={(e) => patch(s.id, { intervalMinutes: Math.max(5, Number(e.target.value)) })}
                  />
                </td>
                <td className="muted">
                  {s.job === "scrape"
                    ? [s.scrapeSearch, s.scrapeCountries, s.scrapeTimeFilter ? `${s.scrapeTimeFilter}s` : null].filter(Boolean).join(" · ") || "—"
                    : "—"}
                </td>
                <td><input type="checkbox" checked={s.enabled} onChange={(e) => patch(s.id, { enabled: e.target.checked })} /></td>
                <td><button className="btn danger sm" onClick={() => remove(s.id)}><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
