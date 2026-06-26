"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setToken } from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";
import "@/components/dashboard.css";

// OAuth landing page. The server redirects here with the JWT (or an error) in
// the URL fragment: /auth/callback#token=<jwt>  or  #error=<msg>.
export default function OAuthCallbackPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);
    const token = params.get("token");
    const err = params.get("error");

    if (token) {
      setToken(token);
      refresh().finally(() => router.replace("/dashboard"));
      return;
    }
    setError(err || "Authentication failed");
  }, [router, refresh]);

  if (error) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>SIGN-IN FAILED</h1>
          <div className="auth-error">{error}</div>
          <a className="btn block" href="/login">BACK TO LOGIN</a>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-loading">
      <Loader2 className="spin" size={28} />
      <span>COMPLETING SIGN-IN…</span>
    </div>
  );
}
