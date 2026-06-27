"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { feeds } from "@/lib/api/me";
import type { Feed } from "@/lib/api/types";

export default function FeedsPage() {
  const [list, setList] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [notify, setNotify] = useState(true);
  const [shareToStats, setShareToStats] = useState(false);
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
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    // Accept a comma-separated list of URLs — each becomes its own feed.
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

  return (
    <section className="panel">
      <h2>RSS FEEDS</h2>
      <p className="hint">
        <b>notify</b> = send matches to your Telegram. <b>share to stats</b> = feed&apos;s jobs appear on the public Stats page.
      </p>

      {error && <div className="auth-error">{error}</div>}

      <form className="toolbar" onSubmit={add}>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="url">Feed URL(s) <span className="muted">— comma-separated for bulk add</span></label>
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
        <p className="muted">No feeds yet.</p>
      ) : (
        <table className="dash-table">
          <thead>
            <tr><th>Name / URL</th><th>Notify</th><th>Share</th><th>Active</th><th></th></tr>
          </thead>
          <tbody>
            {list.map((f) => (
              <tr key={f.id}>
                <td>
                  <div>{f.name || "—"}</div>
                  <div className="muted" style={{ wordBreak: "break-all" }}>{f.url}</div>
                </td>
                <td><input type="checkbox" checked={f.notify} onChange={(e) => patch(f.id, { notify: e.target.checked })} /></td>
                <td><input type="checkbox" checked={f.shareToStats} onChange={(e) => patch(f.id, { shareToStats: e.target.checked })} /></td>
                <td><input type="checkbox" checked={f.active} onChange={(e) => patch(f.id, { active: e.target.checked })} /></td>
                <td><button className="btn danger sm" onClick={() => remove(f.id)}><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
