"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { forgotPassword } from "@/lib/api/auth";
import "@/components/dashboard.css";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await forgotPassword(identifier.trim());
    } catch {
      /* always show the same confirmation (no account enumeration) */
    } finally {
      setBusy(false);
      setSent(true);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>FORGOT PASSWORD</h1>
        {sent ? (
          <>
            <p className="sub">
              If an account exists for <b>{identifier}</b>, a password-reset link is on its way. The link expires in 1 hour.
            </p>
            <Link className="btn block" href="/login">BACK TO SIGN IN</Link>
          </>
        ) : (
          <>
            <p className="sub">Enter your email or username and we&apos;ll send a reset link.</p>
            <form onSubmit={submit}>
              <div className="field">
                <label htmlFor="id">Email or username</label>
                <input id="id" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" />
              </div>
              <button className="btn block" type="submit" disabled={busy}>
                {busy ? <Loader2 className="spin" size={16} /> : <Mail size={16} />}
                {busy ? "SENDING…" : "SEND RESET LINK"}
              </button>
            </form>
            <p className="auth-foot"><Link href="/login">Back to sign in</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
