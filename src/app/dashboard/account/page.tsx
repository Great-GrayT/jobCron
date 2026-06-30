"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, ShieldCheck, ShieldAlert, Camera } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AvatarPicker } from "@/components/AvatarPicker";
import { PasswordForm } from "@/components/PasswordForm";
import { COUNTRY_NAMES, SPECIALITIES, UNIQUE_DIAL_CODES } from "@/lib/profile-options";
import type { ProfileInput } from "@/lib/api/types";

export default function AccountPage() {
  const { user, updateProfile, logout } = useAuth();
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const onPickAvatar = async (value: string, kind: "url" | "data") => {
    setAvatarBusy(true);
    try {
      // Save the chosen field and clear the other so there's a single source of truth.
      await updateProfile(kind === "url" ? { avatarUrl: value, avatarData: "" } : { avatarData: value, avatarUrl: "" });
      setPickerOpen(false);
    } catch {
      /* ignore */
    } finally {
      setAvatarBusy(false);
    }
  };
  const [form, setForm] = useState<ProfileInput & { name?: string }>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setForm({
      username: user.username ?? "",
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      phoneDialCode: user.phoneDialCode ?? "",
      phoneNumber: user.phoneNumber ?? "",
      mobileDialCode: user.mobileDialCode ?? "",
      mobileNumber: user.mobileNumber ?? "",
      speciality: user.speciality ?? "",
      country: user.country ?? "",
      city: user.city ?? "",
    });
  }, [user]);

  if (!user) return null;
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await updateProfile(form);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <section className="panel">
      <h2>ACCOUNT</h2>

      <div className="row acct-id-row">
        <div className="avatar-wrap">
          {user.avatarData || user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="avatar-img" src={user.avatarData || user.avatarUrl || ""} alt="avatar" />
          ) : (
            <div className="avatar-img avatar-fallback">{(user.name || user.email)[0]?.toUpperCase()}</div>
          )}
          <button type="button" className="btn ghost sm" onClick={() => setPickerOpen((v) => !v)} disabled={avatarBusy}>
            {avatarBusy ? <Loader2 className="spin" size={14} /> : <Camera size={14} />} {pickerOpen ? "CLOSE" : "CHANGE"}
          </button>
        </div>
        <div>
          {user.emailVerified ? (
            <span className="ok"><ShieldCheck size={14} /> {user.email} — verified</span>
          ) : (
            <span className="warn-text"><ShieldAlert size={14} /> {user.email} — not verified</span>
          )}
          <div className="muted">role: {user.role}</div>
        </div>
      </div>

      {pickerOpen && (
        <div className="acct-avatar-picker">
          <AvatarPicker current={user.avatarData || user.avatarUrl} onPick={onPickAvatar} busy={avatarBusy} />
        </div>
      )}

      {error && <div className="auth-error">{error}</div>}

      <div className="grid2">
        <div className="field"><label>First name</label><input value={form.firstName ?? ""} onChange={(e) => set("firstName", e.target.value)} /></div>
        <div className="field"><label>Last name</label><input value={form.lastName ?? ""} onChange={(e) => set("lastName", e.target.value)} /></div>
      </div>

      <div className="field">
        <label>Username</label>
        <input value={form.username ?? ""} onChange={(e) => set("username", e.target.value)} />
      </div>

      <div className="grid2">
        <div className="field">
          <label>Phone</label>
          <div className="phone-row">
            <select aria-label="Phone dial code" value={form.phoneDialCode ?? ""} onChange={(e) => set("phoneDialCode", e.target.value)}>
              <option value="">+</option>
              {UNIQUE_DIAL_CODES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <input inputMode="tel" value={form.phoneNumber ?? ""} onChange={(e) => set("phoneNumber", e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Mobile</label>
          <div className="phone-row">
            <select aria-label="Mobile dial code" value={form.mobileDialCode ?? ""} onChange={(e) => set("mobileDialCode", e.target.value)}>
              <option value="">+</option>
              {UNIQUE_DIAL_CODES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <input inputMode="tel" value={form.mobileNumber ?? ""} onChange={(e) => set("mobileNumber", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="field">
        <label>Speciality</label>
        <input list="acc-spec" value={form.speciality ?? ""} onChange={(e) => set("speciality", e.target.value)} />
        <datalist id="acc-spec">{SPECIALITIES.map((s) => <option key={s} value={s} />)}</datalist>
      </div>

      <div className="grid2">
        <div className="field">
          <label>Country</label>
          <input list="acc-country" value={form.country ?? ""} onChange={(e) => set("country", e.target.value)} />
          <datalist id="acc-country">{COUNTRY_NAMES.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div className="field"><label>City</label><input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} /></div>
      </div>

      <div className="row" style={{ marginTop: "1rem" }}>
        <button className="btn" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="spin" size={16} /> : <Save size={16} />} SAVE
          {saved && <span className="ok"> ✓</span>}
        </button>
        <button className="btn danger" onClick={logout}>LOG OUT</button>
      </div>
    </section>

    <section className="panel">
      <h2>{user.hasPassword ? "CHANGE PASSWORD" : "SET A PASSWORD"}</h2>
      <p className="hint">
        {user.hasPassword
          ? "Update your account password."
          : "You signed in without a local password — set one so you can log in with email/username too."}
      </p>
      <PasswordForm />
    </section>
    </>
  );
}
