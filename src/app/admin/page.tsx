"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plug, Send, Play, ShieldCheck, ArrowLeft, Trash2, Rss, MessageSquare, Clock, CheckSquare, Database } from "lucide-react";
import { admin, GATED_PAGES, CLEAN_DATASETS, REBUILD_OPS, type CleanDataset, type RebuildOp } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import type { AdminUser, AdminUserDetail, LogLine } from "@/lib/api/types";
import { useAuth } from "@/context/AuthContext";
import { useTimezone } from "@/context/TimezoneContext";
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
  const { format } = useTimezone();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, LogLine[]>>({});
  const [delOpen, setDelOpen] = useState(false);
  const [delPw, setDelPw] = useState("");
  const [delErr, setDelErr] = useState<string | null>(null);
  const [g2Busy, setG2Busy] = useState(false);
  const [opLogs, setOpLogs] = useState<LogLine[]>([]);
  // Clean-DB modal (destructive; re-auth with password).
  const [cleanOpen, setCleanOpen] = useState(false);
  const [cleanSel, setCleanSel] = useState<Set<CleanDataset>>(new Set());
  const [cleanPw, setCleanPw] = useState("");
  const [cleanErr, setCleanErr] = useState<string | null>(null);
  const [cleanBusy, setCleanBusy] = useState(false);
  // Rebuild / repair modal — pick which maintenance operations to run.
  const [rebuildOpen, setRebuildOpen] = useState(false);
  const [rebuildSel, setRebuildSel] = useState<Set<RebuildOp>>(
    () => new Set(REBUILD_OPS.filter((o) => o.default).map((o) => o.key)),
  );

  const runBackfill = async () => {
    setG2Busy(true);
    setOpLogs([{ level: "info", message: "Starting g2 import from R2…" }]);
    // Keep the last good render so a transient poll error (e.g. the server
    // restarting -> 502) never wipes the log panel to a bare error.
    let lastGood: LogLine[] = [{ level: "info", message: "Starting g2 import from R2…" }];
    let failures = 0;
    const MAX_FAILURES = 40; // ~60s of retries before giving up

    try {
      const start = await admin.backfillG2Start();
      if (!start.jobId) throw new Error(start.error || "failed to start backfill");

      // Poll the async job until it finishes; render a live header + log tail.
      // The worker runs server-side regardless — polling only reflects it.
      for (;;) {
        let s;
        try {
          s = await admin.backfillStatus(start.jobId);
          failures = 0;
        } catch (pollErr) {
          // Transient (server busy/restarting). Keep last logs, warn, retry.
          failures++;
          const why = pollErr instanceof Error ? pollErr.message : "connection error";
          if (failures >= MAX_FAILURES) {
            setOpLogs([
              ...lastGood,
              { level: "error", message: `Lost contact with the server (${why}). The import may still be running — reopen this page to re-attach.` },
            ]);
            break;
          }
          setOpLogs([
            ...lastGood,
            { level: "warning", message: `Reconnecting… (${why}) [${failures}/${MAX_FAILURES}]` },
          ]);
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }

        const header: LogLine = {
          level: s.status === "failed" ? "error" : s.status === "done" ? "success" : "info",
          message: `[${s.status}] ${s.phase} — ${s.inserted} inserted / ${s.read} read · ${s.daysDone} day(s), ${s.monthsDone} month(s)`,
        };
        const tail: LogLine[] = (s.logs || [])
          .slice(-14)
          .map((l) => ({ level: l.level, message: l.message }));
        const next: LogLine[] = [header, ...tail];
        if (s.status === "failed" && s.error) {
          next.push({ level: "error", message: s.error });
        }
        if (s.status === "done") {
          next.push({ level: "info", message: "Now click “Rebuild stats” to refresh the summary tables." });
        }
        lastGood = next;
        setOpLogs(next);
        if (s.status === "done" || s.status === "failed") break;
        await new Promise((r) => setTimeout(r, 1500));
      }
    } catch (e) {
      // Start failed, or something unexpected — append, don't wipe prior context.
      setOpLogs([...lastGood, { level: "error", message: e instanceof Error ? e.message : "backfill failed" }]);
    } finally {
      setG2Busy(false);
    }
  };

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

  const removeUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail || !delPw) return;
    const who = detail.user.username || detail.user.email;
    setBusy("delete");
    setDelErr(null);
    try {
      const r = await admin.remove(detail.user.id, delPw);
      setUsers((p) => p.filter((u) => u.id !== detail.user.id));
      setDelOpen(false);
      setDelPw("");
      setDetail(null);
      alert(`Deleted ${who}. ${r.reassigned} feed(s) reassigned to the oldest admin.`);
    } catch (err) {
      setDelErr(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  };

  const toggleRebuild = (key: RebuildOp) => {
    setRebuildSel((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const runRebuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rebuildSel.size === 0) return;
    setBusy("rebuild");
    setRebuildOpen(false);
    setOpLogs([{ level: "info", message: "Running maintenance…" }]);
    try {
      const r = await admin.rebuildStats([...rebuildSel]);
      setOpLogs(r.logs?.length ? r.logs : [{ level: "success", message: `Done in ${(r.ms / 1000).toFixed(1)}s.` }]);
    } catch (e) {
      const body = e instanceof ApiError ? (e.body as { logs?: LogLine[] } | undefined) : undefined;
      setOpLogs(body?.logs ?? [{ level: "error", message: e instanceof Error ? e.message : "Rebuild failed" }]);
    } finally {
      setBusy(null);
    }
  };

  const toggleClean = (key: CleanDataset) => {
    setCleanSel((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const runClean = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cleanSel.size === 0 || !cleanPw) return;
    setCleanBusy(true);
    setCleanErr(null);
    try {
      const datasets = [...cleanSel];
      const r = await admin.cleanDb(datasets, cleanPw);
      const lines: LogLine[] = [
        { level: "success", message: `Cleaned: ${r.cleared.join(", ")}.` },
        ...Object.entries(r.counts).map(
          ([k, n]): LogLine => ({ level: "info", message: `  ${k}: removed ${n} row(s).` }),
        ),
        { level: "info", message: "Now run Import g2 data, then Rebuild stats to repopulate." },
      ];
      setOpLogs(lines);
      setCleanOpen(false);
      setCleanSel(new Set());
      setCleanPw("");
    } catch (err) {
      setCleanErr(err instanceof Error ? err.message : "clean failed");
    } finally {
      setCleanBusy(false);
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
        <>
          {/* ---- g2 data import ---- */}
          <section className="panel">
            <h2>g2 DATA IMPORT</h2>
            <p className="hint">
              One-time import of historical jobs from the old R2 store into the stats database.
              Idempotent — safe to re-run; already-imported jobs are skipped. May take a while.
            </p>
            <div className="row">
              <button type="button" className="btn" disabled={g2Busy} onClick={runBackfill}>
                {g2Busy ? <Loader2 className="spin" size={14} /> : <Database size={14} />} Import g2 data
              </button>
              <button type="button" className="btn ghost" disabled={busy === "rebuild"} onClick={() => setRebuildOpen(true)} title="Choose which stats/maintenance operations to run">
                {busy === "rebuild" ? <Loader2 className="spin" size={14} /> : <Database size={14} />} Rebuild / repair
              </button>
              <button type="button" className="btn danger" onClick={() => { setCleanErr(null); setCleanOpen(true); }} title="Empty selected datasets so they can be re-imported (requires your password)">
                <Trash2 size={14} /> Clean database
              </button>
            </div>
            <p className="hint">Run <b>Rebuild stats</b> once after importing to build the fast stats summary tables.</p>
            {opLogs.length > 0 && <LogPanel logs={opLogs} title="operation log" />}
          </section>

          {/* ---- user mini-cards ---- */}
          {loading ? (
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
          )}
        </>
      ) : (
        // ---- selected user's settings ----
        <>
          <div className="row admin-detail-bar">
            <button type="button" className="btn ghost sm" onClick={() => setDetail(null)}>
              <ArrowLeft size={14} /> Back to users
            </button>
            <button type="button" className="btn danger sm admin-delete-btn" onClick={() => { setDelPw(""); setDelErr(null); setDelOpen(true); }}>
              <Trash2 size={14} /> Delete user
            </button>
          </div>

          <section className="panel">
            <h2>{detail.user.username || detail.user.email}</h2>
            <p className="hint">{detail.user.email} · {detail.user.emailVerified ? "verified" : "unverified"} · joined {format(detail.user.createdAt, "dd LLL yyyy")}</p>

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
                <span className="run-when">{format(a.appliedAt, "dd LLL yyyy")}</span>
                <span className="run-detail">{a.jobTitle} — {a.company}</span>
              </div>
            ))}
            {detail.applied.length === 0 && <div className="empty-panel"><p>No applications.</p></div>}
          </section>
        </>
      )}

      {rebuildOpen && (
        <div className="modal-overlay" onClick={() => busy !== "rebuild" && setRebuildOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-emoji">🛠️</div>
            <p className="modal-title">
              Rebuild / repair
              <br />
              <span className="muted">
                Pick which maintenance operations to run. They execute in a safe order
                (date fixes before rollup rebuild). Non-destructive.
              </span>
            </p>
            <form onSubmit={runRebuild}>
              <div className="field">
                <label>Operations</label>
                {REBUILD_OPS.map((o) => (
                  <label key={o.key} className="clean-row">
                    <input type="checkbox" aria-label={o.label} checked={rebuildSel.has(o.key)} onChange={() => toggleRebuild(o.key)} />
                    <span><b>{o.label}</b><br /><span className="muted clean-desc">{o.desc}</span></span>
                  </label>
                ))}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => setRebuildOpen(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={rebuildSel.size === 0}>
                  <Database size={14} /> Run {rebuildSel.size || ""} operation{rebuildSel.size === 1 ? "" : "s"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cleanOpen && (
        <div className="modal-overlay" onClick={() => !cleanBusy && setCleanOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-emoji">🧨</div>
            <p className="modal-title">
              Clean database
              <br />
              <span className="muted">
                Permanently empties the selected datasets. This cannot be undone — job data is
                recreatable via the g2 import, but tracking/dedup history is not.
              </span>
            </p>
            <form onSubmit={runClean}>
              {cleanErr && <div className="auth-error">{cleanErr}</div>}
              <div className="field">
                <label>Datasets to empty</label>
                {CLEAN_DATASETS.map((d) => (
                  <label key={d.key} className="clean-row">
                    <input type="checkbox" aria-label={d.label} checked={cleanSel.has(d.key)} onChange={() => toggleClean(d.key)} />
                    <span><b>{d.label}</b><br /><span className="muted clean-desc">{d.desc}</span></span>
                  </label>
                ))}
              </div>
              <div className="field">
                <label>Confirm with your account password</label>
                <input type="password" aria-label="account password" value={cleanPw} onChange={(e) => setCleanPw(e.target.value)} autoComplete="current-password" autoFocus required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => setCleanOpen(false)} disabled={cleanBusy}>Cancel</button>
                <button type="submit" className="btn danger" disabled={cleanBusy || cleanSel.size === 0 || !cleanPw}>
                  {cleanBusy ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />} Empty {cleanSel.size || ""} dataset{cleanSel.size === 1 ? "" : "s"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {delOpen && detail && (
        <div className="modal-overlay" onClick={() => setDelOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-emoji">⚠️</div>
            <p className="modal-title">
              Permanently delete <b>{detail.user.username || detail.user.email}</b>?
              <br />
              <span className="muted">
                Their RSS feeds move to the oldest admin and become public. Telegram channels, tracking,
                schedules and messages are deleted. This cannot be undone.
              </span>
            </p>
            <form onSubmit={removeUser}>
              {delErr && <div className="auth-error">{delErr}</div>}
              <div className="field">
                <label>Confirm with your account password</label>
                <input type="password" value={delPw} onChange={(e) => setDelPw(e.target.value)} autoComplete="current-password" autoFocus required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => setDelOpen(false)}>Cancel</button>
                <button type="submit" className="btn danger" disabled={busy === "delete" || !delPw}>
                  {busy === "delete" ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />} Delete
                </button>
              </div>
            </form>
          </div>
        </div>
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
