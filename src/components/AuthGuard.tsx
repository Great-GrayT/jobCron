"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// Wrap authenticated areas. Redirects to /login when there's no valid session.
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { authenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !authenticated) {
      const next = typeof window !== "undefined" ? window.location.pathname : "/dashboard";
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [loading, authenticated, router]);

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
