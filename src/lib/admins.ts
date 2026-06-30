// The messages API doesn't expose a sender's role, so admins are recognised by:
//   1. an explicit `role === "admin"` (used when the API ever does send it), or
//   2. a configurable allowlist of admin emails/usernames.
//
// Set NEXT_PUBLIC_ADMIN_EMAILS to a comma-separated list of admin emails and/or
// usernames (case-insensitive), e.g. "cronjobwebbot@gmail.com,siza".

const ADMIN_IDS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isAdminUser(
  u: { email?: string | null; username?: string | null; role?: string | null } | null | undefined,
): boolean {
  if (!u) return false;
  if (u.role === "admin") return true;
  const email = (u.email || "").toLowerCase();
  const username = (u.username || "").toLowerCase();
  return (!!email && ADMIN_IDS.includes(email)) || (!!username && ADMIN_IDS.includes(username));
}
