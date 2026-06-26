"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { oauthUrl } from "@/lib/api/auth";
import "@/components/dashboard.css";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(email, password, name || undefined);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>CREATE ACCOUNT</h1>
        <p className="sub">Manage your own feeds, channels, and schedules.</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="name">Name (optional)</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <button className="btn block" type="submit" disabled={busy}>
            {busy ? <Loader2 className="spin" size={16} /> : <UserPlus size={16} />}
            {busy ? "CREATING…" : "CREATE ACCOUNT"}
          </button>
        </form>

        <div className="divider">— OR —</div>
        <div className="oauth-row">
          <a className="btn ghost block" href={oauthUrl("google")}>Google</a>
          <a className="btn ghost block" href={oauthUrl("github")}>GitHub</a>
        </div>

        <p className="auth-foot">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
