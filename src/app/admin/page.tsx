"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft, Plug, Send, Play, ShieldCheck } from "lucide-react";
import { admin, GATED_PAGES } from "@/lib/api/admin";
import type { AdminUser, AdminUserDetail, LogLine } from "@/lib/api/types";
import { useAuth } from "@/context/AuthContext";
import { AuthGuard } from "@/components/AuthGuard";
import { StatusDot } from "@/components/StatusDot";
import { LogPanel } from "@/components/LogPanel";
import "@/components/dashboard.css";

function AdminInner() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, LogLine[]>>({});

  useEffect(() => {
    admin.users().then(setUsers).finally(() => setLoading(false));
  }, []);

  const open = async (id: string) => {
    setDetail(null);
    setLogs({});
    setDetail(await admin.user(id));
  };

  const toggleBan = async (uid: string, key: string, current: string[]) => {
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    await admin.setAccess(uid, { revokedPages: next });
    setUsers((p) => p.map((u) => (u.id === uid ? { ...u, revokedPages: next } : u)));
    setDetail((d) => (d && d.user.id === uid ? { ...d, user: { ...d.user, revokedPages: next } } : d));
  };

  const setRole = async (uid: string, role: "user" | "admin") => {
    await admin.setAccess(uid, { role });
    setUsers((p) => p.map((u) => (u.id === uid ? { ...u, role } : u)));
    setDetail((d) => (d && d.user.id === uid ? { ...d, user: { ...d.user, role } } : d));
  };

  const act = async (key: string, fn: () => Promise<{ logs: LogLine[] }>) => {
    setBusy(key);
    const r = await fn();
    setLogs((p) => ({ ...p, [key]: r.logs }));
    if (detail) setDetail(await admin.user(detail.user.id));
    setBusy(null);
  };

  if (user && user.role !== "admin") {
    return (
      <div className="auth-wrap"><div className="auth-card"><h1>FORBIDDEN</h1>
        <p className="sub">Admin only.</p><Link className="btn block" href="/">HOME</Link></div></div>
    );
  }

  return (
    <div className="dash">
      <header className="dash-header">
        <Link href="/" className="brand">◆ JOBCRON · ADMIN</Link>
        <Link href="/" className="btn ghost sm"><ArrowLeft size={14} /> HOME</Link>
      </header>
      <div className="dash-body">
        <div className="dash-nav" style={{ minWidth: 240 }}>
          <h2 style={{ fontSize: "0.8rem" }}>USERS</h2>
          {loading ? <Loader2 className="spin" size={16} /> : users.map((u) => (
            <button key={u.id} className={`tab ${detail?.user.id === u.id ? "active" : ""}`} style={{ textAlign: "left" }} onClick={() => open(u.id)}>
              {u.role === "admin" && <ShieldCheck size={12} />} {u.username || u.email}
              <span className="muted"> · {u._count.feeds}f {u._count.schedules}c</span>
            </button>
          ))}
        </div>

        <main className="dash-main">
          {!detail ? (
            <p className="muted">Select a user.</p>
          ) : (
            <>
              <section className="panel">
                <h2>{detail.user.username || detail.user.email}</h2>
                <p className="hint">{detail.user.email} · {detail.user.emailVerified ? "verified" : "unverified"} · joined {new Date(detail.user.createdAt).toLocaleDateString()}</p>

                <label className="cron-label">Role</label>
                <div className="row">
                  <label className="switch"><input type="radio" checked={detail.user.role === "user"} onChange={() => setRole(detail.user.id, "user")} /> user</label>
                  <label className="switch"><input type="radio" checked={detail.user.role === "admin"} onChange={() => setRole(detail.user.id, "admin")} /> admin</label>
                </div>

                <label className="cron-label">Page access (unchecked = banned)</label>
                <div className="cron-toggles">
                  {GATED_PAGES.map((p) => {
                    const banned = detail.user.revokedPages.includes(p.key);
                    return (
                      <button key={p.key} type="button" className={`chip-toggle ${banned ? "" : "on"}`} onClick={() => toggleBan(detail.user.id, p.key, detail.user.revokedPages)}>
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="panel">
                <h2>FEEDS ({detail.feeds.length})</h2>
                {detail.feeds.map((f) => (
                  <div key={f.id} className="run-row">
                    <StatusDot status={f.lastStatus ?? null} />
                    <span className="run-detail">{f.name || f.url}</span>
                    <span className="muted">{f.shareToStats ? "stat" : "personal"}</span>
                    <div className="cell-actions" style={{ marginLeft: "auto" }}>
                      <button className="btn ghost sm" disabled={busy === `tf:${f.id}`} onClick={() => act(`tf:${f.id}`, () => admin.testFeed(f.id))}><Plug size={13} /> test</button>
                      <button className="btn sm" disabled={busy === `sf:${f.id}`} onClick={() => act(`sf:${f.id}`, () => admin.sendFeed(f.id))}><Send size={13} /> send</button>
                    </div>
                    {logs[`tf:${f.id}`] && <div style={{ flexBasis: "100%" }}><LogPanel logs={logs[`tf:${f.id}`]} /></div>}
                    {logs[`sf:${f.id}`] && <div style={{ flexBasis: "100%" }}><LogPanel logs={logs[`sf:${f.id}`]} /></div>}
                  </div>
                ))}
              </section>

              <section className="panel">
                <h2>TELEGRAM ({detail.channels.length})</h2>
                {detail.channels.map((c) => (
                  <div key={c.id} className="run-row">
                    <StatusDot status={c.lastStatus ?? null} />
                    <span>{c.kind}</span>
                    <span className="muted">{c.botTokenMasked} · {c.chatId}</span>
                    <div className="cell-actions" style={{ marginLeft: "auto" }}>
                      <button className="btn ghost sm" disabled={busy === `tc:${c.id}`} onClick={() => act(`tc:${c.id}`, () => admin.testChannel(c.id))}><Plug size={13} /> test</button>
                    </div>
                    {logs[`tc:${c.id}`] && <div style={{ flexBasis: "100%" }}><LogPanel logs={logs[`tc:${c.id}`]} /></div>}
                  </div>
                ))}
              </section>

              <section className="panel">
                <h2>SCHEDULES ({detail.schedules.length})</h2>
                {detail.schedules.map((s) => (
                  <div key={s.id} className="run-row">
                    <StatusDot status={s.lastStatus ?? null} />
                    <span>{s.job}</span>
                    <span className="muted">{s.cronExpr || `every ${s.intervalMinutes}m`} {s.enabled ? "" : "(off)"}</span>
                    <div className="cell-actions" style={{ marginLeft: "auto" }}>
                      <button className="btn sm" disabled={busy === `rs:${s.id}`} onClick={() => act(`rs:${s.id}`, () => admin.runSchedule(s.id))}><Play size={13} /> run</button>
                    </div>
                    {logs[`rs:${s.id}`] && <div style={{ flexBasis: "100%" }}><LogPanel logs={logs[`rs:${s.id}`]} /></div>}
                  </div>
                ))}
              </section>

              <section className="panel">
                <h2>TRACKING ({detail.applied.length})</h2>
                {detail.applied.slice(0, 30).map((a) => (
                  <div key={a.id} className="run-row">
                    <span className="run-when">{new Date(a.appliedAt).toLocaleDateString()}</span>
                    <span className="run-detail">{a.jobTitle} — {a.company}</span>
                  </div>
                ))}
                {detail.applied.length === 0 && <p className="muted">No applications.</p>}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard>
      <AdminInner />
    </AuthGuard>
  );
}
