"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Send, Plus, MessageSquare, ArrowLeft } from "lucide-react";
import { messages } from "@/lib/api/messages";
import type { Message } from "@/lib/api/types";
import { AuthGuard } from "@/components/AuthGuard";
import { AdminShell } from "@/components/AdminShell";
import { featuresMenu } from "@/components/navMenu";
import { useAuth } from "@/context/AuthContext";
import {
  deriveConversations,
  partnerName,
  partnerEmail,
  replyTarget,
  type Conversation,
} from "@/lib/conversations";
import "@/components/dashboard.css";
import "@/components/chat.css";

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const t = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const day = d.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${t}  |  ${day}`;
}

function Avatar({ src, name, size = 40 }: { src?: string | null; name: string; size?: number }) {
  const style = { width: size, height: size };
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="chat-avatar" src={src} alt={name} style={style} />
  ) : (
    <span className="chat-avatar chat-avatar-fallback" style={style}>
      {(name[0] || "?").toUpperCase()}
    </span>
  );
}

/** Synthetic, front-end-only acknowledgement appended after a General Admin Query. */
function makeAutoReply(meId: string): Message {
  const now = new Date().toISOString();
  return {
    id: `auto-${Date.now()}`,
    fromUserId: "system",
    toUserId: meId,
    toAdmin: false,
    subject: null,
    body: "Thanks for reaching out — an admin will contact you surely.",
    readAt: now,
    createdAt: now,
    from: { id: "system", email: "", username: "Admin", name: "Admin", avatarUrl: null, role: "admin" },
    to: null,
  };
}

function MessagesInner() {
  const { user } = useAuth();
  const meId = user?.id ?? "";
  const meRole = user?.role;

  /** True when a message was authored by an admin (own role, or sender role when exposed). */
  const authoredByAdmin = (m: Message) =>
    m.fromUserId === meId ? meRole === "admin" : m.from.role === "admin";

  const [inbox, setInbox] = useState<Message[]>([]);
  const [sent, setSent] = useState<Message[]>([]);
  const [autoReplies, setAutoReplies] = useState<Record<string, Message[]>>({});
  const [loading, setLoading] = useState(true);

  const [selectedKey, setSelectedKey] = useState<string>("admin");
  const [composing, setComposing] = useState(false);

  // compose-new
  const [to, setTo] = useState("");
  const [draftSubject, setDraftSubject] = useState("");
  // thread reply / new body
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

  // Derive threads; always surface a pinned "Admin" contact for first contact.
  const conversations = useMemo(() => {
    const list = deriveConversations(inbox, sent, meId);
    const admin = list.find((c) => c.key === "admin") ?? {
      key: "admin",
      partner: null,
      toAdmin: true,
      messages: [],
      last: null,
      unread: 0,
    };
    const others = list.filter((c) => c.key !== "admin");
    return [admin, ...others];
  }, [inbox, sent, meId]);

  const selected: Conversation | undefined = useMemo(
    () => conversations.find((c) => c.key === selectedKey),
    [conversations, selectedKey],
  );

  // Real messages + any front-end auto-replies for this thread, in time order.
  const threadMessages = useMemo(() => {
    if (!selected) return [] as Message[];
    const autos = autoReplies[selected.key] ?? [];
    return [...selected.messages, ...autos].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [selected, autoReplies]);

  // Mark incoming unread messages as read when a thread is opened.
  useEffect(() => {
    if (!selected || composing) return;
    const unread = selected.messages.filter((m) => m.fromUserId !== meId && !m.readAt);
    if (!unread.length) return;
    const now = new Date().toISOString();
    unread.forEach((m) => messages.markRead(m.id).catch(() => {}));
    setInbox((prev) => prev.map((m) => (unread.some((u) => u.id === m.id) ? { ...m, readAt: now } : m)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, composing, selected?.messages.length]);

  const openThread = (key: string) => {
    setComposing(false);
    setSelectedKey(key);
    setBody("");
    setNote(null);
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !body.trim()) return;
    const target = replyTarget(selected);
    const key = selected.key;
    setBusy(true);
    setNote(null);
    try {
      await messages.send({ ...target, body: body.trim() });
      setBody("");
      await load();
      // Front-end auto-acknowledgement for the "General Admin Query" thread.
      if (target.toAdmin) {
        setAutoReplies((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), makeAutoReply(meId)] }));
      }
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  };

  const sendNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim() || !body.trim()) return;
    setBusy(true);
    setNote(null);
    try {
      await messages.send({ toIdentifier: to.trim(), subject: draftSubject.trim() || undefined, body: body.trim() });
      setTo("");
      setDraftSubject("");
      setBody("");
      setComposing(false);
      await load();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell menu={featuresMenu(user?.role)} breadcrumb={["Features", "Messages"]} title="Messages">
      <div className="chat">
        {/* ---- conversation list ---- */}
        <aside className="chat-list">
          <div className="chat-list-head">
            <span>Conversations</span>
            <button type="button" className="button is-primary is-small" onClick={() => { setComposing(true); setNote(null); setBody(""); }}>
              <Plus size={14} /> New
            </button>
          </div>
          <div className="chat-list-body">
            {loading ? (
              <div className="muted chat-loading"><Loader2 className="spin" size={16} /> loading…</div>
            ) : (
              conversations.map((c) => {
                const name = partnerName(c);
                const preview = c.last ? c.last.body : "No messages yet — say hi 👋";
                return (
                  <button
                    type="button"
                    key={c.key}
                    className={`chat-contact${c.key === selectedKey && !composing ? " active" : ""}`}
                    onClick={() => openThread(c.key)}
                  >
                    <Avatar src={c.partner?.avatarUrl} name={name} />
                    <div className="chat-contact-meta">
                      <div className="chat-contact-top">
                        <span className="chat-contact-name">{name}</span>
                        {c.last && <span className="chat-contact-time">{fmtTime(c.last.createdAt)}</span>}
                      </div>
                      <div className="chat-contact-preview">{preview}</div>
                    </div>
                    {c.unread > 0 && <span className="chat-unread">{c.unread}</span>}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ---- thread / compose ---- */}
        <section className="chat-main">
          {composing ? (
            <>
              <div className="chat-thread-head">
                <button type="button" className="btn ghost sm chat-back" aria-label="Back" onClick={() => setComposing(false)}>
                  <ArrowLeft size={14} />
                </button>
                <div className="chat-thread-who"><span className="chat-thread-name">New message</span></div>
              </div>
              <form className="chat-compose" onSubmit={sendNew}>
                {note && <div className="auth-error">{note}</div>}
                <div className="field">
                  <label>To — email or username</label>
                  <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="someone@example.com" required />
                </div>
                <div className="field">
                  <label>Subject <span className="muted">(optional)</span></label>
                  <input value={draftSubject} onChange={(e) => setDraftSubject(e.target.value)} />
                </div>
                <div className="field">
                  <label>Message</label>
                  <textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} required />
                </div>
                <button className="button is-primary" type="submit" disabled={busy}>
                  {busy ? <Loader2 className="spin" size={16} /> : <Send size={16} />} Send
                </button>
              </form>
            </>
          ) : selected ? (
            <>
              <div className="chat-thread-head">
                <Avatar src={selected.partner?.avatarUrl} name={partnerName(selected)} size={42} />
                <div className="chat-thread-who">
                  <span className="chat-thread-name">{partnerName(selected)}</span>
                  <span className="chat-thread-email">{partnerEmail(selected)}</span>
                </div>
              </div>

              <div className="msg-history">
                {threadMessages.length === 0 ? (
                  <div className="chat-empty">
                    <MessageSquare size={28} />
                    <p>No messages yet. Start the conversation below.</p>
                  </div>
                ) : (
                  threadMessages.map((m) => {
                    const outgoing = m.fromUserId === meId;
                    const admin = authoredByAdmin(m);
                    return outgoing ? (
                      <div key={m.id} className="outgoing_msg">
                        <div className={`sent_msg${admin ? " is-admin" : ""}`}>
                          {admin && <span className="admin-tag">Admin</span>}
                          {m.subject && <div className="msg-subject-line">{m.subject}</div>}
                          <p>{m.body}</p>
                          <span className="time_date">{fmtTime(m.createdAt)}</span>
                        </div>
                      </div>
                    ) : (
                      <div key={m.id} className="incoming_msg">
                        <div className="incoming_msg_img">
                          <Avatar src={m.from.avatarUrl} name={m.from.username || m.from.name || m.from.email} size={36} />
                        </div>
                        <div className="received_msg">
                          <div className={`received_withd_msg${admin ? " is-admin" : ""}`}>
                            {admin && <span className="admin-tag">Admin</span>}
                            <div className="msg-from-line">
                              <span className="msg-from-name">{m.from.username || m.from.name || m.from.email}</span>
                              {m.from.email && <span className="msg-from-email">{m.from.email}</span>}
                            </div>
                            {m.subject && <div className="msg-subject-line">{m.subject}</div>}
                            <p>{m.body}</p>
                            <span className="time_date">{fmtTime(m.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form className="chat-reply" onSubmit={sendReply}>
                {note && <div className="auth-error chat-reply-note">{note}</div>}
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={`Message ${partnerName(selected)}…`}
                  aria-label="Reply"
                />
                <button className="button is-primary" type="submit" aria-label="Send message" disabled={busy || !body.trim()}>
                  {busy ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
                </button>
              </form>
            </>
          ) : (
            <div className="chat-empty chat-empty-full">
              <MessageSquare size={32} />
              <p>Select a conversation or start a new one.</p>
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

export default function MessagesPage() {
  return (
    <AuthGuard>
      <MessagesInner />
    </AuthGuard>
  );
}
