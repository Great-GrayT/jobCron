"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plug, Send, Rss as RssIcon, RefreshCw, Radio, ListChecks, Clock } from "lucide-react";
import { feeds as feedsApi, schedules as schedulesApi } from "@/lib/api/me";
import type { Feed, Schedule, LogLine } from "@/lib/api/types";
import { AuthGuard } from "@/components/AuthGuard";
import { AdminShell } from "@/components/AdminShell";
import { featuresMenu } from "@/components/navMenu";
import { useAuth } from "@/context/AuthContext";
import { StatusDot } from "@/components/StatusDot";
import { LogPanel } from "@/components/LogPanel";
import "@/components/dashboard.css";

function RssAppInner() {
  const { user } = useAuth();
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
  const activeCount = feeds.filter((f) => f.active).length;
  const cronLabel = checkJob
    ? (checkJob.cronExpr || `every ${checkJob.intervalMinutes}m`) + (checkJob.enabled ? "" : " | disabled")
    : "not scheduled";

  const actions = (
    <>
      <Link href="/dashboard/schedules" className="button is-light is-small btn-goo"><Clock size={14} /> Edit schedule</Link>
      <button className="button is-primary is-small btn-flourish" onClick={callAll} disabled={!!busy}>
        <Send size={14} /> Call all
      </button>
    </>
  );

  return (
    <AdminShell menu={featuresMenu(user?.role)} breadcrumb={["Features", "RSS"]} title="RSS Application" actions={actions}>
      <div className="tiles">
        <div className="tile-widget">
          <div>
            <div className="tile-label">Active feeds</div>
            <div className="tile-value">{activeCount}</div>
          </div>
          <span className="tile-icon is-primary"><Radio size={36} /></span>
        </div>
        <div className="tile-widget">
          <div>
            <div className="tile-label">Total feeds</div>
            <div className="tile-value">{feeds.length}</div>
          </div>
          <span className="tile-icon is-info"><RssIcon size={36} /></span>
        </div>
        <div className="tile-widget">
          <div>
            <div className="tile-label">Cron (check-jobs)</div>
            <div className="tile-value" style={{ fontSize: "1rem", fontWeight: 700 }}>{cronLabel}</div>
          </div>
          <span className="tile-icon is-success"><ListChecks size={36} /></span>
        </div>
      </div>

      <div className="admin-card">
        <header className="card-header">
          <span className="card-header-title">
            <span className="icon"><RssIcon size={16} /></span>
            Feeds
          </span>
          <button className="card-header-icon" onClick={load} title="Reload" disabled={loading}>
            <RefreshCw size={16} className={loading ? "spin" : ""} />
          </button>
        </header>
        <div className="card-content">
          <p className="hint" style={{ marginBottom: "1rem" }}>
            Call any feed on demand (sends to your Telegram + saves to the stats DB), or test it.
          </p>

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
                    <button className="button is-light is-small btn-goo" disabled={busy === `test:${f.id}`} onClick={() => run(`test:${f.id}`, () => feedsApi.test(f.id))}><Plug size={13} /> test</button>
                    <button className="button is-primary is-small btn-flourish" disabled={busy === `send:${f.id}`} onClick={() => run(`send:${f.id}`, () => feedsApi.send(f.id))}><Send size={13} /> call</button>
                  </div>
                </div>
                {logs[`test:${f.id}`] && <LogPanel logs={logs[`test:${f.id}`]} />}
                {logs[`send:${f.id}`] && <LogPanel logs={logs[`send:${f.id}`]} />}
              </div>
            ))
          )}
        </div>
      </div>
    </AdminShell>
  );
}

export default function RssAppPage() {
  return (
    <AuthGuard>
      <RssAppInner />
    </AuthGuard>
  );
}
