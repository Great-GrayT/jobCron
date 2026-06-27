"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, KeyRound } from "lucide-react";
import { resetPassword } from "@/lib/api/auth";
import "@/components/dashboard.css";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setBusy(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.replace("/login"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-card">
        <h1>RESET PASSWORD</h1>
        <div className="auth-error">Missing or invalid reset link.</div>
        <Link className="btn block" href="/forgot-password">REQUEST A NEW LINK</Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h1>RESET PASSWORD</h1>
      {done ? (
        <p className="sub ok">Password updated. Redirecting to sign in…</p>
      ) : (
        <>
          <p className="sub">Choose a new password.</p>
          {error && <div className="auth-error">{error}</div>}
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="pw">New password</label>
              <input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="field">
              <label htmlFor="cf">Confirm password</label>
              <input id="cf" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </div>
            <button className="btn block" type="submit" disabled={busy}>
              {busy ? <Loader2 className="spin" size={16} /> : <KeyRound size={16} />}
              {busy ? "UPDATING…" : "UPDATE PASSWORD"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-wrap">
      <Suspense fallback={<div className="auth-loading"><Loader2 className="spin" size={24} /></div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
