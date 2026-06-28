"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft, Plug, Send, Rss as RssIcon } from "lucide-react";
import { feeds as feedsApi, schedules as schedulesApi } from "@/lib/api/me";
import type { Feed, Schedule, LogLine } from "@/lib/api/types";
import { AuthGuard } from "@/components/AuthGuard";
import { StatusDot } from "@/components/StatusDot";
import { LogPanel } from "@/components/LogPanel";
import "@/components/dashboard.css";

function RssAppInner() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, LogLine[]>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [f, s] = await Promise.all([feedsApi.list(), schedulesApi.list()]);
      setFeeds(f);
      setSchedules(s);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const run = async (key: string, fn: () => Promise<{ logs: LogLine[] }>) => {
    setBusy(key);
    const r = await fn();
    setLogs((p) => ({ ...p, [key]: r.logs }));
    await load();
    setBusy(null);
  };

  const callAll = async () => {
    if (!confirm("Call every active feed now (send to Telegram + save)?")) return;
    for (const f of feeds.filter((x) => x.active)) {
      // eslint-disable-next-line no-await-in-loop
      await run(`send:${f.id}`, () => feedsApi.send(f.id));
    }
  };

  const checkJob = schedules.find((s) => s.job === "check-jobs");

  return (
    <div className="dash">
      <header className="dash-header">
        <Link href="/" className="brand">◆ JOBCRON · RSS</Link>
        <Link href="/" className="btn ghost sm"><ArrowLeft size={14} /> HOME</Link>
      </header>
      <div className="dash-body" style={{ display: "block" }}>
        <section className="panel">
          <h2>RSS APPLICATION</h2>
          <p className="hint">Call any feed on demand (sends to your Telegram + saves to the stats DB), or test it.</p>

          <div className="row" style={{ marginBottom: "1rem" }}>
            <span className="muted">
              Cron (check-jobs): {checkJob ? (checkJob.cronExpr || `every ${checkJob.intervalMinutes}m`) + (checkJob.enabled ? "" : " — disabled") : "not scheduled"}
            </span>
            <Link href="/dashboard/schedules" className="btn ghost sm">EDIT SCHEDULE</Link>
            <button className="btn" onClick={callAll} disabled={!!busy}><Send size={14} /> CALL ALL</button>
          </div>

          {loading ? (
            <div className="muted"><Loader2 className="spin" size={16} /> loading…</div>
          ) : feeds.length === 0 ? (
            <p className="muted">No feeds. Add some in the dashboard.</p>
          ) : (
            feeds.map((f) => (
              <div key={f.id}>
                <div className="run-row">
                  <StatusDot status={f.lastStatus ?? null} />
                  <RssIcon size={14} />
                  <span className="run-detail">{f.name || f.url}</span>
                  <span className="muted">{f.shareToStats ? "stat" : "personal"}{f.active ? "" : " · inactive"}</span>
                  <div className="cell-actions" style={{ marginLeft: "auto" }}>
                    <button className="btn ghost sm" disabled={busy === `test:${f.id}`} onClick={() => run(`test:${f.id}`, () => feedsApi.test(f.id))}><Plug size={13} /> test</button>
                    <button className="btn sm" disabled={busy === `send:${f.id}`} onClick={() => run(`send:${f.id}`, () => feedsApi.send(f.id))}><Send size={13} /> call</button>
                  </div>
                </div>
                {logs[`test:${f.id}`] && <LogPanel logs={logs[`test:${f.id}`]} />}
                {logs[`send:${f.id}`] && <LogPanel logs={logs[`send:${f.id}`]} />}
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

export default function RssAppPage() {
  return (
    <AuthGuard>
      <RssAppInner />
    </AuthGuard>
  );
}
