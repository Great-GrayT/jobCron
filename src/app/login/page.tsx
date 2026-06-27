"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { oauthUrl, resendVerification } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import "@/components/dashboard.css";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [resent, setResent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setUnverified(false);
    try {
      await login(identifier, password);
      router.replace(next);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setUnverified(true);
        setError("Your email isn't verified yet. Check your inbox for the link.");
      } else {
        setError(err instanceof Error ? err.message : "Login failed");
      }
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    // identifier may be a username; only an email works for resend.
    if (identifier.includes("@")) {
      await resendVerification(identifier.trim());
      setResent(true);
    } else {
      setError("Enter your email above to resend the verification link.");
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>SIGN IN</h1>
        <p className="sub">Use your email or username.</p>

        {error && <div className="auth-error">{error}</div>}
        {unverified && (
          <button type="button" className="btn ghost block" onClick={resend} style={{ marginBottom: "1rem" }} disabled={resent}>
            {resent ? "VERIFICATION EMAIL SENT" : "RESEND VERIFICATION EMAIL"}
          </button>
        )}

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="identifier">Email or username</label>
            <input id="identifier" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <button className="btn block" type="submit" disabled={busy}>
            {busy ? <Loader2 className="spin" size={16} /> : <LogIn size={16} />}
            {busy ? "SIGNING IN…" : "SIGN IN"}
          </button>
        </form>

        <p className="auth-foot" style={{ marginTop: "0.75rem" }}>
          <Link href="/forgot-password">Forgot password?</Link>
        </p>

        <div className="divider">— OR —</div>
        <div className="oauth-row">
          <a className="btn ghost block" href={oauthUrl("google")}>Google</a>
          <a className="btn ghost block" href={oauthUrl("github")}>GitHub</a>
        </div>

        <p className="auth-foot">No account? <Link href="/register">Create one</Link></p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-loading"><Loader2 className="spin" size={24} /></div>}>
      <LoginForm />
    </Suspense>
  );
}
