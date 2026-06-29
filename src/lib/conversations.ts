import type { Message, MessageUser } from "@/lib/api/types";

/**
 * A chat thread with one counterpart, derived purely client-side from the
 * inbox + sent lists the API already returns (no extra endpoint needed).
 *
 * `key` is `u:<userId>` for a real person, or `"admin"` for the catch-all
 * "message the admins" thread (messages sent with toAdmin / no recipient).
 */
export interface Conversation {
  key: string;
  partner: MessageUser | null; // null === the Admin catch-all thread
  toAdmin: boolean; // replies on this thread go to the admin team
  messages: Message[]; // ascending by createdAt
  last: Message | null;
  unread: number; // incoming + unread
}

const ts = (s: string | null | undefined) => (s ? new Date(s).getTime() : 0);

export function deriveConversations(
  inbox: Message[],
  sent: Message[],
  meId: string,
): Conversation[] {
  const map = new Map<string, Conversation>();

  const add = (key: string, partner: MessageUser | null, toAdmin: boolean, m: Message) => {
    let c = map.get(key);
    if (!c) {
      c = { key, partner, toAdmin, messages: [], last: null, unread: 0 };
      map.set(key, c);
    }
    if (!c.partner && partner) c.partner = partner;
    c.messages.push(m);
  };

  // Received: counterpart is the sender.
  for (const m of inbox) add(`u:${m.from.id}`, m.from, false, m);
  // Sent: counterpart is the recipient, or the admin catch-all.
  for (const m of sent) {
    if (m.to) add(`u:${m.to.id}`, m.to, false, m);
    else add("admin", null, true, m);
  }

  const list = [...map.values()];
  for (const c of list) {
    c.messages.sort((a, b) => ts(a.createdAt) - ts(b.createdAt));
    c.last = c.messages[c.messages.length - 1] ?? null;
    c.unread = c.messages.filter((m) => m.fromUserId !== meId && !m.readAt).length;
  }
  list.sort((a, b) => ts(b.last?.createdAt) - ts(a.last?.createdAt));
  return list;
}

/** Display name for a counterpart (Admin thread when partner is null). */
export function partnerName(c: Conversation): string {
  if (!c.partner) return "Admin";
  return c.partner.username || c.partner.name || c.partner.email;
}

export function partnerEmail(c: Conversation): string {
  return c.partner?.email || "the admin team";
}

/** Identifier to send a reply to on this thread. */
export function replyTarget(c: Conversation): { toAdmin?: boolean; toIdentifier?: string } {
  if (c.toAdmin || !c.partner) return { toAdmin: true };
  return { toIdentifier: c.partner.username || c.partner.email };
}
