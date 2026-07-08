"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Trash2, Plug, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { feeds, channels } from "@/lib/api/me";
import type { Feed, LogLine } from "@/lib/api/types";
import { StatusDot } from "@/components/StatusDot";
import { LogPanel } from "@/components/LogPanel";
import { PageGuide } from "@/components/PageGuide";
import { FeedsGuide } from "@/components/guides";

/** Confirmation message shown after a toggle is saved on the server. */
function toggleMessage(body: { notify?: boolean; shareToStats?: boolean; active?: boolean }): string | null {
  if (body.shareToStats !== undefined)
    return body.shareToStats
      ? "Sharing on | this feed's posts are now saved to the public stats and their info is visible to all users."
      : "Sharing off | this feed's posts stay private; only you will see them in your own stats.";
  if (body.notify !== undefined)
    return body.notify
      ? "Notify on | this feed is analysed on every check-jobs run and matching posts are sent to the Telegram channel you've set (if any)."
      : "Notify off | this feed will no longer send posts to your Telegram channel.";
  if (body.active !== undefined)
    return body.active ? "Feed enabled." : "Feed paused | it won't run until you re-enable it.";
  return null;
}

export default function FeedsPage() {
  const [list, setList] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, LogLine[]>>({});
  const [error, setError] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [notify, setNotify] = useState(true);
  const [shareToStats, setShareToStats] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hasChannel, setHasChannel] = useState(true); // default true → no warning flash
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  };
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setList(await feeds.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load feeds");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    channels.list().then((c) => setHasChannel(c.length > 0)).catch(() => {});
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    // Accept a comma-separated list of URLs | each becomes its own feed.
    const urls = Array.from(
      new Set(url.split(",").map((u) => u.trim()).filter(Boolean)),
    );
    if (!urls.length) return;
    setAdding(true);
    setError(null);
    const failures: string[] = [];
    try {
      for (const u of urls) {
        try {
          // name only applies when adding a single feed.
          await feeds.create({
            url: u,
            name: urls.length === 1 ? name.trim() || undefined : undefined,
            notify,
            shareToStats,
          });
        } catch (err) {
          failures.push(`${u} (${err instanceof Error ? err.message : "failed"})`);
        }
      }
      if (failures.length) setError(`Failed: ${failures.join(", ")}`);
      else {
        setUrl("");
        setName("");
      }
      await load();
    } finally {
      setAdding(false);
    }
  };

  const patch = async (
    id: string,
    body: { name?: string; notify?: boolean; shareToStats?: boolean; active?: boolean },
  ) => {
    setList((prev) => prev.map((f) => (f.id === id ? { ...f, ...body } : f)));
    try {
      await feeds.update(id, body);
      const msg = toggleMessage(body);
      if (msg) showToast(msg); // only after the server confirms the change
    } catch {
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this feed?")) return;
    setList((prev) => prev.filter((f) => f.id !== id));
    try {
      await feeds.remove(id);
    } catch {
      load();
    }
  };

  const test = async (id: string) => {
    setBusy(`test:${id}`);
    const r = await feeds.test(id);
    setLogs((p) => ({ ...p, [id]: r.logs }));
    await load();
    setBusy(null);
  };

  const send = async (id: string) => {
    if (!confirm("Fetch this feed now, send new jobs to your Telegram, and save them?")) return;
    setBusy(`send:${id}`);
    const r = await feeds.send(id);
    setLogs((p) => ({ ...p, [id]: r.logs }));
    await load();
    setBusy(null);
  };

  return (
    <section className="panel">
      <h2>RSS FEEDS <PageGuide>{FeedsGuide}</PageGuide></h2>
      <p className="hint">
        <b>notify</b> = send matches to your Telegram. <b>share to stats</b> = feed&apos;s jobs appear on the public Stats page.
      </p>

      {!hasChannel && (
        <div className="warn-banner">
          <AlertTriangle size={16} />
          <span>You haven&apos;t set up a Telegram channel yet | feed output can&apos;t be delivered. <Link href="/dashboard/telegram">Set one up</Link>.</span>
        </div>
      )}

      {error && <div className="auth-error">{error}</div>}

      <form className="toolbar" onSubmit={add}>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="url">Feed URL(s) <span className="muted">| comma-separated for bulk add</span></label>
          <input id="url" required placeholder="https://rss.com/a, https://rss.com/b" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="name">Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="optional" />
        </div>
        <label className="switch"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> notify</label>
        <label className="switch"><input type="checkbox" checked={shareToStats} onChange={(e) => setShareToStats(e.target.checked)} /> share</label>
        <button className="btn" type="submit" disabled={adding}>
          {adding ? <Loader2 className="spin" size={16} /> : <Plus size={16} />} ADD
        </button>
      </form>

      {loading ? (
        <div className="muted"><Loader2 className="spin" size={16} /> loading…</div>
      ) : list.length === 0 ? (
        <div className="empty-panel"><p>No feeds yet. Add an RSS feed to begin.</p></div>
      ) : (
        <table className="dash-table">
          <thead>
            <tr><th></th><th>Name / URL</th><th>Notify</th><th>Share</th><th>Active</th><th></th></tr>
          </thead>
          <tbody>
            {list.map((f) => (
              <Fragment key={f.id}>
                <tr>
                  <td><StatusDot status={f.lastStatus ?? null} title="Last test/send" /></td>
                  <td>
                    <div>{f.name || "|"}</div>
                    <div className="muted" style={{ wordBreak: "break-all" }}>{f.url}</div>
                  </td>
                  <td><input type="checkbox" aria-label="Notify" checked={f.notify} onChange={(e) => patch(f.id, { notify: e.target.checked })} /></td>
                  <td><input type="checkbox" aria-label="Share to stats" checked={f.shareToStats} onChange={(e) => patch(f.id, { shareToStats: e.target.checked })} /></td>
                  <td><input type="checkbox" aria-label="Active" checked={f.active} onChange={(e) => patch(f.id, { active: e.target.checked })} /></td>
                  <td>
                    <div className="cell-actions">
                      <button type="button" className="btn ghost sm" onClick={() => test(f.id)} disabled={busy === `test:${f.id}`} title="Test feed fetch">
                        {busy === `test:${f.id}` ? <Loader2 className="spin" size={14} /> : <Plug size={14} />} TEST
                      </button>
                      <button type="button" className="btn sm" onClick={() => send(f.id)} disabled={busy === `send:${f.id}`} title="Send to Telegram + save">
                        {busy === `send:${f.id}` ? <Loader2 className="spin" size={14} /> : <Send size={14} />} SEND
                      </button>
                      <button type="button" className="btn danger sm" onClick={() => remove(f.id)} title="Remove feed"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
                {logs[f.id] && (
                  <tr>
                    <td colSpan={6}><LogPanel logs={logs[f.id]} title="feed action log" /></td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}

      {toast && (
        <div className="feed-toast" role="status" aria-live="polite">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}
    </section>
  );
}
