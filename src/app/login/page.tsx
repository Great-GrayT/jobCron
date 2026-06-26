"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { oauthUrl } from "@/lib/api/auth";
import "@/components/dashboard.css";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>SIGN IN</h1>
        <p className="sub">Access your job-monitoring dashboard.</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
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

        <div className="divider">— OR —</div>
        <div className="oauth-row">
          <a className="btn ghost block" href={oauthUrl("google")}>Google</a>
          <a className="btn ghost block" href={oauthUrl("github")}>GitHub</a>
        </div>

        <p className="auth-foot">
          No account? <Link href="/register">Create one</Link>
        </p>
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
