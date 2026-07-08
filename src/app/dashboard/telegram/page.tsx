"use client";

import { Fragment, useEffect, useState } from "react";
import { Loader2, Save, Trash2, Plug } from "lucide-react";
import { channels } from "@/lib/api/me";
import type { Channel, ChannelKind, LogLine } from "@/lib/api/types";
import { StatusDot } from "@/components/StatusDot";
import { LogPanel } from "@/components/LogPanel";
import { PageGuide } from "@/components/PageGuide";
import { TelegramGuide, BotTokenGuide, ChatIdGuide } from "@/components/guides";

export default function TelegramPage() {
  const [list, setList] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, LogLine[]>>({});

  const test = async (id: string) => {
    setTesting(id);
    const r = await channels.test(id);
    setLogs((p) => ({ ...p, [id]: r.logs }));
    await load();
    setTesting(null);
  };

  const [kind, setKind] = useState<ChannelKind>("main");
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setList(await channels.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load channels");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botToken.trim() || !chatId.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await channels.upsert({ kind, botToken: botToken.trim(), chatId: chatId.trim(), active: true });
      setBotToken("");
      setChatId("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save channel");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this channel?")) return;
    setList((prev) => prev.filter((c) => c.id !== id));
    try {
      await channels.remove(id);
    } catch {
      load();
    }
  };

  return (
    <section className="panel">
      <h2>TELEGRAM CHANNELS <PageGuide>{TelegramGuide}</PageGuide></h2>
      <p className="hint">
        One <b>main</b> and one <b>filtered</b> channel per account. The bot token is write-only | it&apos;s
        encrypted server-side and only ever shown back masked.
      </p>

      {error && <div className="auth-error">{error}</div>}

      <form className="toolbar" onSubmit={save}>
        <div className="field">
          <label htmlFor="kind">Kind</label>
          <select id="kind" value={kind} onChange={(e) => setKind(e.target.value as ChannelKind)}>
            <option value="main">main</option>
            <option value="filtered">filtered</option>
          </select>
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="token">Bot Token <PageGuide label="How to get a bot token">{BotTokenGuide}</PageGuide></label>
          <input id="token" type="password" placeholder="123456:ABC…" value={botToken} onChange={(e) => setBotToken(e.target.value)} autoComplete="off" />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="chat">Chat ID <PageGuide label="How to get a chat ID">{ChatIdGuide}</PageGuide></label>
          <input id="chat" value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="-1001…" />
        </div>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} SAVE
        </button>
      </form>

      {loading ? (
        <div className="muted"><Loader2 className="spin" size={16} /> loading…</div>
      ) : list.length === 0 ? (
        <p className="muted">No channels configured.</p>
      ) : (
        <table className="dash-table">
          <thead>
            <tr><th></th><th>Kind</th><th>Token</th><th>Chat ID</th><th>Active</th><th></th></tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <Fragment key={c.id}>
                <tr>
                  <td><StatusDot status={c.lastStatus ?? null} title="Last test" /></td>
                  <td>{c.kind}</td>
                  <td className="muted">{c.botTokenMasked}</td>
                  <td>{c.chatId}</td>
                  <td>{c.active ? <span className="ok">yes</span> : "no"}</td>
                  <td>
                    <div className="cell-actions">
                      <button className="btn ghost sm" onClick={() => test(c.id)} disabled={testing === c.id}>
                        {testing === c.id ? <Loader2 className="spin" size={14} /> : <Plug size={14} />} TEST
                      </button>
                      <button className="btn danger sm" onClick={() => remove(c.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
                {logs[c.id] && (
                  <tr>
                    <td colSpan={6}><LogPanel logs={logs[c.id]} title={`${c.kind} test`} /></td>
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
