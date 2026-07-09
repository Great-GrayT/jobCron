"use client";

import { useState } from "react";
import { Loader2, KeyRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/** Set (OAuth-only accounts) or change the current user's password. */
export function PasswordForm({ onDone }: { onDone?: () => void }) {
  const { user, setPassword } = useAuth();
  const hasPw = Boolean(user?.hasPassword);
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(false);
    if (pw.length < 8) return setErr("Password must be at least 8 characters.");
    if (pw !== confirm) return setErr("Passwords do not match.");
    setBusy(true);
    try {
      await setPassword({ password: pw, currentPassword: hasPw ? current : undefined });
      setOk(true);
      setPw("");
      setConfirm("");
      setCurrent("");
      onDone?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to set password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      {err && <div className="auth-error">{err}</div>}
      {hasPw && (
        <div className="field">
          <label>Current password</label>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
        </div>
      )}
      <div className="field">
        <label>{hasPw ? "New password" : "Password"}</label>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required />
      </div>
      <div className="field">
        <label>Confirm password</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
      </div>
      <button className={`btn btn-sub ${busy ? "is-loading" : ""} ${ok ? "is-done" : ""}`} type="submit" disabled={busy}>
        {busy ? <Loader2 className="spin" size={16} /> : <KeyRound size={16} />} {hasPw ? "Change password" : "Set password"}
        {ok && <span className="ok"> ✓</span>}
      </button>
    </form>
  );
}
