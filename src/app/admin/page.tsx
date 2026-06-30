"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plug, Send, Play, ShieldCheck, ArrowLeft, Trash2, Rss, MessageSquare, Clock, CheckSquare } from "lucide-react";
import { admin, GATED_PAGES } from "@/lib/api/admin";
import type { AdminUser, AdminUserDetail, LogLine } from "@/lib/api/types";
import { useAuth } from "@/context/AuthContext";
import { AuthGuard } from "@/components/AuthGuard";
import { AdminShell } from "@/components/AdminShell";
import { featuresMenu } from "@/components/navMenu";
import { StatusDot } from "@/components/StatusDot";
import { LogPanel } from "@/components/LogPanel";
import "@/components/dashboard.css";

function CardAvatar({ u }: { u: AdminUser }) {
  const src = u.avatarData || u.avatarUrl;
  const name = u.username || u.name || u.email;
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="admin-card-avatar" src={src} alt={name} />
  ) : (
    <span className="admin-card-avatar admin-card-avatar-fallback">{(name[0] || "?").toUpperCase()}</span>
  );
}

function AdminInner() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, LogLine[]>>({});

  useEffect(() => {
    admin
      .users()
      .then((list) => {
        setUsers(list);
        // Deep link from the chat info popup: /admin?user=<id> opens that person.
        const id = new URLSearchParams(window.location.search).get("user");
        if (id) open(id);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    try {
      await admin.setAccess(uid, { role });
      setUsers((p) => p.map((u) => (u.id === uid ? { ...u, role } : u)));
      setDetail((d) => (d && d.user.id === uid ? { ...d, user: { ...d.user, role } } : d));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to change role");
    }
  };

  const act = async (key: string, fn: () => Promise<{ logs: LogLine[] }>) => {
    setBusy(key);
    const r = await fn();
    setLogs((p) => ({ ...p, [key]: r.logs }));
    if (detail) setDetail(await admin.user(detail.user.id));
    setBusy(null);
  };

  const removeUser = async () => {
    if (!detail) return;
    const who = detail.user.username || detail.user.email;
    if (
      !confirm(
        `Permanently delete ${who}?\n\nTheir RSS feeds move to the oldest admin and become public. Telegram channels, tracking, schedules and messages are deleted. This cannot be undone.`,
      )
    )
      return;
    setBusy("delete");
    try {
      const r = await admin.remove(detail.user.id);
      setUsers((p) => p.filter((u) => u.id !== detail.user.id));
      setDetail(null);
      alert(`Deleted ${who}. ${r.reassigned} feed(s) reassigned to the oldest admin.`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  };

  if (user && user.role !== "admin") {
    return (
      <div className="auth-wrap"><div className="auth-card"><h1>FORBIDDEN</h1>
        <p className="sub">Admin only.</p><Link className="btn block" href="/">HOME</Link></div></div>
    );
  }

  return (
    <AdminShell menu={featuresMenu(user?.role)} breadcrumb={["Admin", detail ? "User" : "Users"]} title="Admin" back={detail ? false : "/"}>
      {!detail ? (
        // ---- user mini-cards ----
        loading ? (
          <div className="muted"><Loader2 className="spin" size={16} /> loading users…</div>
        ) : (
          <div className="admin-user-grid">
            {users.map((u) => (
              <button type="button" key={u.id} className="admin-user-card" onClick={() => open(u.id)}>
                <CardAvatar u={u} />
                <div className="admin-card-body">
                  <div className="admin-card-name">
                    {u.username || u.name || u.email}
                    {u.role === "admin" && <span className="admin-role-pill"><ShieldCheck size={11} /> Admin</span>}
                  </div>
                  <div className="admin-card-email">{u.email}</div>
                  <div className="admin-card-chips">
                    <span title="Feeds"><Rss size={12} /> {u._count.feeds}</span>
                    <span title="Telegram channels"><Send size={12} /> {u._count.channels}</span>
                    <span title="Schedules"><Clock size={12} /> {u._count.schedules}</span>
                    <span title="Tracking"><CheckSquare size={12} /> {u._count.appliedJobs}</span>
                    {u.revokedPages.length > 0 && <span className="admin-card-banned" title="Banned pages">{u.revokedPages.length} banned</span>}
                    {!u.emailVerified && <span className="admin-card-unverified">unverified</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        // ---- selected user's settings ----
        <>
          <div className="row admin-detail-bar">
            <button type="button" className="btn ghost sm" onClick={() => setDetail(null)}>
              <ArrowLeft size={14} /> Back to users
            </button>
            <button type="button" className="btn danger sm admin-delete-btn" disabled={busy === "delete"} onClick={removeUser}>
              {busy === "delete" ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />} Delete user
            </button>
          </div>

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
                <div className="cell-actions cell-actions-end">
                  <button className="btn ghost sm" disabled={busy === `tf:${f.id}`} onClick={() => act(`tf:${f.id}`, () => admin.testFeed(f.id))}><Plug size={13} /> test</button>
                  <button className="btn sm" disabled={busy === `sf:${f.id}`} onClick={() => act(`sf:${f.id}`, () => admin.sendFeed(f.id))}><Send size={13} /> send</button>
                </div>
                {logs[`tf:${f.id}`] && <div className="run-log-full"><LogPanel logs={logs[`tf:${f.id}`]} /></div>}
                {logs[`sf:${f.id}`] && <div className="run-log-full"><LogPanel logs={logs[`sf:${f.id}`]} /></div>}
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
                <div className="cell-actions cell-actions-end">
                  <button className="btn ghost sm" disabled={busy === `tc:${c.id}`} onClick={() => act(`tc:${c.id}`, () => admin.testChannel(c.id))}><Plug size={13} /> test</button>
                </div>
                {logs[`tc:${c.id}`] && <div className="run-log-full"><LogPanel logs={logs[`tc:${c.id}`]} /></div>}
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
                <div className="cell-actions cell-actions-end">
                  <button className="btn sm" disabled={busy === `rs:${s.id}`} onClick={() => act(`rs:${s.id}`, () => admin.runSchedule(s.id))}><Play size={13} /> run</button>
                </div>
                {logs[`rs:${s.id}`] && <div className="run-log-full"><LogPanel logs={logs[`rs:${s.id}`]} /></div>}
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
    </AdminShell>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard>
      <AdminInner />
    </AuthGuard>
  );
}
