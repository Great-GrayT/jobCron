import { api } from "./client";
import type { Message } from "./types";

export const messages = {
  list: () =>
    api.get<{ inbox: Message[]; sent: Message[]; unread: number; isAdmin: boolean }>(
      "/api/me/messages",
    ),
  send: (body: { toIdentifier?: string; toAdmin?: boolean; subject?: string; body: string }) =>
    api.post<{ message: Message }>("/api/me/messages", body),
  markRead: (id: string) => api.patch<{ ok: boolean }>(`/api/me/messages/${id}`),
};
