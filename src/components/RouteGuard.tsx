"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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

/**
 * Global auth gate. Logged-out visitors can only see the public routes above;
 * any other path bounces to /login. Wraps the whole app (inside AuthProvider).
 */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { authenticated, loading } = useAuth();
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
  return <>{children}</>;
}
