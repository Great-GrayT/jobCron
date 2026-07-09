"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Send, Plus, MessageSquare, ArrowLeft, Reply, Copy, Trash2, X } from "lucide-react";
import { messages } from "@/lib/api/messages";
import { users } from "@/lib/api/users";
import type { Message } from "@/lib/api/types";
import { AuthGuard } from "@/components/AuthGuard";
import { AdminShell } from "@/components/AdminShell";
import { PageGuide } from "@/components/PageGuide";
import { MessagesGuide } from "@/components/guides";
import { featuresMenu } from "@/components/navMenu";
import { useAuth } from "@/context/AuthContext";
import { useTimezone } from "@/context/TimezoneContext";
import { formatInZoneFmt } from "@/lib/timezone";
import { isAdminUser } from "@/lib/admins";
import { UserInfoModal } from "@/components/UserInfoModal";
import {
  deriveConversations,
  partnerName,
  partnerEmail,
  replyTarget,
  type Conversation,
} from "@/lib/conversations";
import "@/components/dashboard.css";
import "@/components/chat.css";

function fmtTime(iso: string, zone: string): string {
  // "14:05  |  Jul 07" rendered in the user's global timezone.
  return formatInZoneFmt(new Date(iso), zone, "HH:mm  '|'  LLL dd");
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
    body: "Thanks for reaching out | an admin will contact you surely.",
    readAt: now,
    createdAt: now,
    from: { id: "system", email: "", username: "Admin", name: "Admin", avatarUrl: null, role: "admin" },
    to: null,
  };
}

function MessagesInner() {
  const { user } = useAuth();
  const { timezone } = useTimezone();
  const meId = user?.id ?? "";

  /** True when a message was authored by an admin (role from the API, else allowlist). */
  const authoredByAdmin = (m: Message) =>
    m.fromUserId === meId ? isAdminUser(user) : isAdminUser(m.from);

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

  // Info popup + avatar resolution (uploaded avatars live in avatarData, which the
  // messages payload omits | resolve those once per partner via the card endpoint).
  const [infoUser, setInfoUser] = useState<{ id: string; name: string; avatar?: string | null } | null>(null);
  const [avatarCache, setAvatarCache] = useState<Record<string, string>>({});
  const viewerIsAdmin = isAdminUser(user);

  // Right-click context menu + quoted reply.
  const [ctx, setCtx] = useState<{ x: number; y: number; m: Message } | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  // Thread key currently showing the admin "typing…" indicator.
  const [typingKey, setTypingKey] = useState<string | null>(null);

  const resolvedAvatar = (u?: { id: string; avatarUrl: string | null } | null) =>
    (u && (u.avatarUrl || avatarCache[u.id])) || null;

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

  // Resolve avatars for partners who have no avatarUrl (i.e. an uploaded base64
  // avatar) | one card fetch per unique partner, cached.
  useEffect(() => {
    const need = new Map<string, void>();
    const collect = (u: { id: string; avatarUrl: string | null } | null) => {
      if (u && u.id && u.id !== "system" && !u.avatarUrl && !avatarCache[u.id]) need.set(u.id);
    };
    inbox.forEach((m) => collect(m.from));
    sent.forEach((m) => collect(m.to));
    const ids = [...need.keys()];
    if (!ids.length) return;
    let alive = true;
    Promise.all(
      ids.map((id) =>
        users
          .card(id)
          .then((c) => [id, c.avatarData || c.avatarUrl || ""] as const)
          .catch(() => [id, ""] as const),
      ),
    ).then((pairs) => {
      if (!alive) return;
      const next: Record<string, string> = {};
      for (const [id, src] of pairs) if (src) next[id] = src;
      if (Object.keys(next).length) setAvatarCache((prev) => ({ ...prev, ...next }));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inbox, sent]);

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
    setReplyingTo(null);
  };

  // Close the context menu on any outside click / scroll / Escape.
  useEffect(() => {
    if (!ctx) return;
    const close = () => setCtx(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCtx(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [ctx]);

  const openCtx = (e: React.MouseEvent, m: Message) => {
    e.preventDefault();
    setCtx({ x: e.clientX, y: e.clientY, m });
  };
  const doCopy = (m: Message) => {
    navigator.clipboard?.writeText(m.body).catch(() => {});
    setCtx(null);
  };
  const doReply = (m: Message) => {
    setReplyingTo(m);
    setComposing(false);
    setCtx(null);
  };
  const doDelete = async (m: Message) => {
    setCtx(null);
    if (m.id.startsWith("auto-")) {
      // Front-end-only auto message | just drop it locally.
      setAutoReplies((prev) => {
        const next: Record<string, Message[]> = {};
        for (const k of Object.keys(prev)) next[k] = prev[k].filter((x) => x.id !== m.id);
        return next;
      });
      return;
    }
    if (!confirm("Delete this message for everyone?")) return;
    try {
      await messages.remove(m.id);
      await load();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !body.trim()) return;
    const target = replyTarget(selected);
    const key = selected.key;
    const quote = replyingTo
      ? `> ${replyingTo.body.replace(/\s+/g, " ").slice(0, 140)}\n\n`
      : "";
    setBusy(true);
    setNote(null);
    try {
      await messages.send({ ...target, body: quote + body.trim() });
      setBody("");
      setReplyingTo(null);
      await load();
      // Front-end auto-acknowledgement for the "General Admin Query" thread:
      // show a "typing…" indicator for 3-6s, then drop in the reply.
      if (target.toAdmin) {
        setTypingKey(key);
        const delay = 3000 + Math.random() * 3000;
        window.setTimeout(() => {
          setAutoReplies((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), makeAutoReply(meId)] }));
          setTypingKey((t) => (t === key ? null : t));
        }, delay);
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
    <AdminShell menu={featuresMenu(user?.role)} breadcrumb={["Features", "Messages"]} title="Messages" titleGuide={<PageGuide>{MessagesGuide}</PageGuide>}>
      <div className="chat">
        {/* ---- conversation list ---- */}
        <aside className="chat-list">
          <div className="chat-list-head">
            <span>Conversations</span>
            <button type="button" className="button is-primary is-small btn-fx-fill-up" onClick={() => { setComposing(true); setNote(null); setBody(""); }}>
              <Plus size={14} /> New
            </button>
          </div>
          <div className="chat-list-body">
            {loading ? (
              <div className="muted chat-loading"><Loader2 className="spin" size={16} /> loading…</div>
            ) : (
              conversations.map((c) => {
                const name = partnerName(c);
                const preview = c.last ? c.last.body : "No messages yet | say hi";
                return (
                  <button
                    type="button"
                    key={c.key}
                    className={`chat-contact${c.key === selectedKey && !composing ? " active" : ""}`}
                    onClick={() => openThread(c.key)}
                  >
                    <Avatar src={resolvedAvatar(c.partner)} name={name} />
                    <div className="chat-contact-meta">
                      <div className="chat-contact-top">
                        <span className="chat-contact-name">{name}</span>
                        {c.last && <span className="chat-contact-time">{fmtTime(c.last.createdAt, timezone)}</span>}
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
                <button type="button" className="btn ghost sm chat-back btn-fx-lift" aria-label="Back" onClick={() => setComposing(false)}>
                  <ArrowLeft size={14} />
                </button>
                <div className="chat-thread-who"><span className="chat-thread-name">New message</span></div>
              </div>
              <form className="chat-compose" onSubmit={sendNew}>
                {note && <div className="auth-error">{note}</div>}
                <div className="field">
                  <label>To | email or username</label>
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
                <button className="button is-primary btn-fx-shine" type="submit" disabled={busy}>
                  {busy ? <Loader2 className="spin" size={16} /> : <Send size={16} />} Send
                </button>
              </form>
            </>
          ) : selected ? (
            <>
              {selected.partner ? (
                <button
                  type="button"
                  className="chat-thread-head chat-thread-head-btn"
                  onClick={() => setInfoUser({ id: selected.partner!.id, name: partnerName(selected), avatar: resolvedAvatar(selected.partner) })}
                  title="View profile"
                >
                  <Avatar src={resolvedAvatar(selected.partner)} name={partnerName(selected)} size={42} />
                  <div className="chat-thread-who">
                    <span className="chat-thread-name">{partnerName(selected)}</span>
                    <span className="chat-thread-email">{partnerEmail(selected)}</span>
                  </div>
                </button>
              ) : (
                <div className="chat-thread-head">
                  <Avatar src={null} name={partnerName(selected)} size={42} />
                  <div className="chat-thread-who">
                    <span className="chat-thread-name">{partnerName(selected)}</span>
                    <span className="chat-thread-email">{partnerEmail(selected)}</span>
                  </div>
                </div>
              )}

              <div className="msg-history">
                {threadMessages.length === 0 && typingKey !== selected.key ? (
                  <div className="chat-empty">
                    <MessageSquare size={28} />
                    <p>No messages yet. Start the conversation below.</p>
                  </div>
                ) : (
                  <>
                  {threadMessages.map((m) => {
                    const outgoing = m.fromUserId === meId;
                    const admin = authoredByAdmin(m);
                    return outgoing ? (
                      <div key={m.id} className="outgoing_msg">
                        <div className={`sent_msg${admin ? " is-admin" : ""}`} onContextMenu={(e) => openCtx(e, m)}>
                          {admin && <span className="admin-tag">Admin</span>}
                          {m.subject && <div className="msg-subject-line">{m.subject}</div>}
                          <p>{m.body}</p>
                          <span className="time_date">{fmtTime(m.createdAt, timezone)}</span>
                        </div>
                      </div>
                    ) : (
                      <div key={m.id} className="incoming_msg">
                        {m.from.id && m.from.id !== "system" ? (
                          <button
                            type="button"
                            className="incoming_msg_img incoming_msg_img-btn"
                            onClick={() => setInfoUser({ id: m.from.id, name: m.from.username || m.from.name || m.from.email, avatar: resolvedAvatar(m.from) })}
                            title="View profile"
                          >
                            <Avatar src={resolvedAvatar(m.from)} name={m.from.username || m.from.name || m.from.email} size={36} />
                          </button>
                        ) : (
                          <div className="incoming_msg_img">
                            <Avatar src={resolvedAvatar(m.from)} name={m.from.username || m.from.name || m.from.email} size={36} />
                          </div>
                        )}
                        <div className="received_msg">
                          <div className={`received_withd_msg${admin ? " is-admin" : ""}`} onContextMenu={(e) => openCtx(e, m)}>
                            {admin && <span className="admin-tag">Admin</span>}
                            <div className="msg-from-line">
                              <span className="msg-from-name">{m.from.username || m.from.name || m.from.email}</span>
                              {m.from.email && <span className="msg-from-email">{m.from.email}</span>}
                            </div>
                            {m.subject && <div className="msg-subject-line">{m.subject}</div>}
                            <p>{m.body}</p>
                            <span className="time_date">{fmtTime(m.createdAt, timezone)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {typingKey === selected.key && (
                    <div className="incoming_msg">
                      <div className="incoming_msg_img"><Avatar src={null} name="Admin" size={36} /></div>
                      <div className="received_msg">
                        <div className="received_withd_msg is-admin typing-bubble">
                          <span className="admin-tag">Admin</span>
                          <span className="typing-dots"><i /><i /><i /></span>
                        </div>
                      </div>
                    </div>
                  )}
                  </>
                )}
              </div>

              <form className="chat-reply" onSubmit={sendReply}>
                {note && <div className="auth-error chat-reply-note">{note}</div>}
                {replyingTo && (
                  <div className="chat-reply-quote">
                    <Reply size={13} />
                    <span className="chat-reply-quote-text">{replyingTo.body}</span>
                    <button type="button" aria-label="Cancel reply" onClick={() => setReplyingTo(null)}><X size={13} /></button>
                  </div>
                )}
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={replyingTo ? "Type your reply…" : `Message ${partnerName(selected)}…`}
                  aria-label="Reply"
                />
                <button className="button is-primary btn-fx-shine" type="submit" aria-label="Send message" disabled={busy || !body.trim()}>
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

      {infoUser && (
        <UserInfoModal
          userId={infoUser.id}
          fallbackName={infoUser.name}
          fallbackAvatar={infoUser.avatar}
          viewerIsAdmin={viewerIsAdmin}
          onClose={() => setInfoUser(null)}
        />
      )}

      {ctx && (
        <div className="ctx-menu" style={{ top: ctx.y, left: ctx.x }} onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => doReply(ctx.m)}><Reply size={14} /> Reply</button>
          <button type="button" onClick={() => doCopy(ctx.m)}><Copy size={14} /> Copy text</button>
          {viewerIsAdmin && (
            <button type="button" className="ctx-danger" onClick={() => doDelete(ctx.m)}><Trash2 size={14} /> Delete</button>
          )}
        </div>
      )}
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
