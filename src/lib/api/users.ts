import { api } from "./client";

/** Public contact card (see server /api/users/[id]). */
export interface UserCard {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  country: string | null;
  city: string | null;
  speciality: string | null;
  avatarUrl: string | null;
  avatarData: string | null;
  role: string;
}

export const users = {
  card: (id: string) => api.get<{ user: UserCard }>(`/api/users/${id}`).then((r) => r.user),
};
