"use client";

import { Fragment, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Play, History } from "lucide-react";
import { schedules } from "@/lib/api/me";
import type { Schedule, ScheduleJob, LogLine, ScheduleRun } from "@/lib/api/types";
import { StatusDot } from "@/components/StatusDot";
import { LogPanel } from "@/components/LogPanel";
import { CronBuilder } from "@/components/CronBuilder";

const JOBS: ScheduleJob[] = ["check-jobs", "stats-ingest", "scrape"];

export default function SchedulesPage() {
  const [list, setList] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, LogLine[]>>({});
  const [history, setHistory] = useState<Record<string, ScheduleRun[]>>({});
  const [openHistory, setOpenHistory] = useState<string | null>(null);

  const [job, setJob] = useState<ScheduleJob>("check-jobs");
  const [intervalMinutes, setInterval] = useState(15);
  const [mode, setMode] = useState<"interval" | "cron">("interval");
  const [cronExpr, setCronExpr] = useState("0 * * * *");
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
        cronExpr: mode === "cron" ? cronExpr.trim() : null,
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

  const run = async (id: string) => {
    setBusy(`run:${id}`);
    const r = await schedules.run(id);
    setLogs((p) => ({ ...p, [id]: r.logs }));
    await load();
    if (openHistory === id) loadHistory(id); // refresh open history
    setBusy(null);
  };

  const loadHistory = async (id: string) => {
    try {
      const runs = await schedules.runs(id);
      setHistory((p) => ({ ...p, [id]: runs }));
    } catch {
      /* ignore */
    }
  };

  const toggleHistory = async (id: string) => {
    if (openHistory === id) {
      setOpenHistory(null);
      return;
    }
    setOpenHistory(id);
    await loadHistory(id);
  };

  return (
    <section className="panel">
      <h2>SCHEDULES</h2>
      <p className="hint">One schedule per job. Interval is how often it runs (min 5 minutes). The scrape fields apply only to the <b>scrape</b> job.</p>

      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={add}>
        <div className="toolbar">
          <div className="field">
            <label htmlFor="job">Job</label>
            <select id="job" value={job} onChange={(e) => setJob(e.target.value as ScheduleJob)}>
              {JOBS.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="mode">Trigger</label>
            <select id="mode" value={mode} onChange={(e) => setMode(e.target.value as "interval" | "cron")}>
              <option value="interval">Every N minutes</option>
              <option value="cron">Cron expression</option>
            </select>
          </div>
          {mode === "interval" && (
            <div className="field">
              <label htmlFor="iv">Interval (min)</label>
              <input id="iv" type="number" min={5} value={intervalMinutes} onChange={(e) => setInterval(Number(e.target.value))} />
            </div>
          )}
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
        </div>
        {mode === "cron" && <CronBuilder value={cronExpr} onChange={setCronExpr} />}
      </form>

      {loading ? (
        <div className="muted"><Loader2 className="spin" size={16} /> loading…</div>
      ) : list.length === 0 ? (
        <p className="muted">No schedules yet.</p>
      ) : (
        <table className="dash-table">
          <thead>
            <tr><th></th><th>Job</th><th>Interval</th><th>Scrape config</th><th>Enabled</th><th></th></tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <Fragment key={s.id}>
                <tr>
                  <td><StatusDot status={s.lastStatus ?? null} title="Last run" /></td>
                  <td>{s.job}</td>
                  <td>
                    {s.cronExpr ? (
                      <code className="muted" title="cron expression">{s.cronExpr}</code>
                    ) : (
                      <input
                        type="number"
                        min={5}
                        aria-label="Interval minutes"
                        value={s.intervalMinutes}
                        style={{ width: 70 }}
                        onChange={(e) => patch(s.id, { intervalMinutes: Math.max(5, Number(e.target.value)) })}
                      />
                    )}
                  </td>
                  <td className="muted">
                    {s.job === "scrape"
                      ? [s.scrapeSearch, s.scrapeCountries, s.scrapeTimeFilter ? `${s.scrapeTimeFilter}s` : null].filter(Boolean).join(" · ") || "—"
                      : "—"}
                  </td>
                  <td><input type="checkbox" aria-label="Enabled" checked={s.enabled} onChange={(e) => patch(s.id, { enabled: e.target.checked })} /></td>
                  <td>
                    <div className="cell-actions">
                      <button type="button" className="btn sm" onClick={() => run(s.id)} disabled={busy === `run:${s.id}`} title="Run now">
                        {busy === `run:${s.id}` ? <Loader2 className="spin" size={14} /> : <Play size={14} />} RUN
                      </button>
                      <button type="button" className="btn ghost sm" onClick={() => toggleHistory(s.id)} title="Run history">
                        <History size={14} /> LOG
                      </button>
                      <button type="button" className="btn danger sm" onClick={() => remove(s.id)} title="Remove schedule"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
                {logs[s.id] && (
                  <tr><td colSpan={6}><LogPanel logs={logs[s.id]} title="run output" /></td></tr>
                )}
                {openHistory === s.id && (
                  <tr>
                    <td colSpan={6}>
                      <div className="run-history">
                        {(history[s.id] ?? []).length === 0 ? (
                          <div className="run-row"><span className="muted">No runs recorded yet.</span></div>
                        ) : (
                          history[s.id].map((r) => (
                            <div className="run-row" key={r.id}>
                              <StatusDot status={r.ok ? "success" : "fail"} />
                              <span className="run-when">{new Date(r.createdAt).toLocaleString()}</span>
                              <span className="muted">{r.trigger} · {r.durationMs}ms</span>
                              <span className="run-detail">{r.error ?? r.summary ?? "—"}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
