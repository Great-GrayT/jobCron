"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Ban } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import "@/components/dashboard.css";

// Routes reachable while logged out. Everything else requires a session.
// (Home + the auth flow pages — which must stay open so users CAN log in.)
const PUBLIC_ROUTES = new Set<string>([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
]);

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.has(pathname) || pathname.startsWith("/auth/");
}

// Map a path to its ban key (admin-revokable). Account is never bannable.
function pageKey(pathname: string): string | null {
  if (pathname.startsWith("/dashboard/feeds")) return "feeds";
  if (pathname.startsWith("/dashboard/telegram")) return "telegram";
  if (pathname.startsWith("/dashboard/goat")) return "goat";
  if (pathname.startsWith("/dashboard/schedules")) return "schedules";
  if (pathname.startsWith("/dashboard/account")) return null;
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/stats")) return "stats";
  if (pathname.startsWith("/applied")) return "applied";
  if (pathname.startsWith("/rss")) return "rss";
  if (pathname.startsWith("/messages")) return "messages";
  return null;
}

/**
 * Global auth gate. Logged-out visitors can only see the public routes above;
 * any other path bounces to /login. Wraps the whole app (inside AuthProvider).
 */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, authenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const open = isPublic(pathname);

  useEffect(() => {
    if (!open && !loading && !authenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [open, loading, authenticated, pathname, router]);

  // Public pages render immediately.
  if (open) return <>{children}</>;

  // Gated pages: hold render until we know the user is authenticated.
  if (loading || !authenticated) {
    return (
      <div className="auth-loading">
        <Loader2 className="spin" size={28} />
        <span>AUTHENTICATING…</span>
      </div>
    );
  }

  // Per-user page ban (admin-managed).
  const key = pageKey(pathname);
  if (key && user?.revokedPages?.includes(key)) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1><Ban size={18} /> ACCESS REVOKED</h1>
          <p className="sub">An administrator has removed your access to this page.</p>
          <Link className="btn block" href="/">BACK TO HOME</Link>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
