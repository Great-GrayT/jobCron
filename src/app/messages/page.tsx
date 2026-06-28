"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Send, ArrowLeft, Inbox, Mail } from "lucide-react";
import { messages } from "@/lib/api/messages";
import type { Message } from "@/lib/api/types";
import { AuthGuard } from "@/components/AuthGuard";
import "@/components/dashboard.css";

function MessagesInner() {
  const [inbox, setInbox] = useState<Message[]>([]);
  const [sent, setSent] = useState<Message[]>([]);
  const [tab, setTab] = useState<"inbox" | "sent" | "compose">("inbox");
  const [loading, setLoading] = useState(true);

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await messages.list();
      setInbox(r.inbox);
      setSent(r.sent);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const openMsg = async (m: Message) => {
    if (!m.readAt) {
      await messages.markRead(m.id).catch(() => {});
      setInbox((prev) => prev.map((x) => (x.id === m.id ? { ...x, readAt: new Date().toISOString() } : x)));
    }
  };

  const sendMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setNote(null);
    try {
      await messages.send({ toIdentifier: to.trim() || undefined, subject: subject.trim() || undefined, body: body.trim() });
      setTo(""); setSubject(""); setBody("");
      setNote("Message sent.");
      await load();
      setTab("sent");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  };

  const who = (m: Message, dir: "from" | "to") => {
    if (dir === "to") return m.toAdmin ? "Admin" : m.to ? (m.to.username || m.to.name || m.to.email) : "—";
    return m.from.username || m.from.name || m.from.email;
  };

  const renderList = (list: Message[], dir: "from" | "to") => (
    <div className="msg-list">
      {list.length === 0 && <p className="muted">Nothing here.</p>}
      {list.map((m) => (
        <div
          key={m.id}
          className={`msg-item ${dir === "from" && !m.readAt ? "unread" : ""}`}
          onMouseEnter={() => dir === "from" && openMsg(m)}
        >
          <div className="msg-head">
            <span className="msg-who">{dir === "from" ? who(m, "from") : `to ${who(m, "to")}`}</span>
            {m.subject && <span className="msg-subject">{m.subject}</span>}
            <span className="msg-when">{new Date(m.createdAt).toLocaleString()}</span>
          </div>
          <div className="msg-body">{m.body}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="dash">
      <header className="dash-header">
        <Link href="/" className="brand">◆ JOBCRON</Link>
        <Link href="/" className="btn ghost sm"><ArrowLeft size={14} /> HOME</Link>
      </header>
      <div className="dash-body" style={{ display: "block" }}>
        <section className="panel">
          <h2>MESSAGES</h2>
          <div className="tabs">
            <button className={`tab ${tab === "inbox" ? "active" : ""}`} onClick={() => setTab("inbox")}><Inbox size={14} /> Inbox</button>
            <button className={`tab ${tab === "sent" ? "active" : ""}`} onClick={() => setTab("sent")}><Mail size={14} /> Sent</button>
            <button className={`tab ${tab === "compose" ? "active" : ""}`} onClick={() => setTab("compose")}><Send size={14} /> Compose</button>
          </div>

          {loading ? (
            <div className="muted"><Loader2 className="spin" size={16} /> loading…</div>
          ) : tab === "inbox" ? (
            renderList(inbox, "from")
          ) : tab === "sent" ? (
            renderList(sent, "to")
          ) : (
            <form onSubmit={sendMsg}>
              {note && <div className="auth-error">{note}</div>}
              <div className="field">
                <label>To (email or username — leave blank to message Admin)</label>
                <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="admin (default)" />
              </div>
              <div className="field">
                <label>Subject</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="field">
                <label>Message</label>
                <textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} required />
              </div>
              <button className="btn" type="submit" disabled={busy}>
                {busy ? <Loader2 className="spin" size={16} /> : <Send size={16} />} SEND
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <AuthGuard>
      <MessagesInner />
    </AuthGuard>
  );
}
