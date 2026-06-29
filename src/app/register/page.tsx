"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, UserPlus, MailCheck, ArrowLeft } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { useAuth } from "@/context/AuthContext";
import { oauthUrl, resendVerification } from "@/lib/api/auth";
import { COUNTRY_NAMES, SPECIALITIES, UNIQUE_DIAL_CODES } from "@/lib/profile-options";
import "@/components/dashboard.css";

// Optional profile fields — empty ones trigger the "are you a spy?" saga.
const OPTIONAL = [
  "firstName", "lastName", "phoneDialCode", "phoneNumber",
  "mobileDialCode", "mobileNumber", "speciality", "country", "city",
] as const;

type Form = {
  firstName: string; lastName: string; username: string; email: string; password: string;
  phoneDialCode: string; phoneNumber: string; mobileDialCode: string; mobileNumber: string;
  speciality: string; country: string; city: string;
};

const EMPTY: Form = {
  firstName: "", lastName: "", username: "", email: "", password: "",
  phoneDialCode: "", phoneNumber: "", mobileDialCode: "", mobileNumber: "",
  speciality: "", country: "", city: "",
};

type SagaStep = null | "warn" | "spy" | "mockYes" | "mockNo";

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [saga, setSaga] = useState<SagaStep>(null);
  const [bypassOptional, setBypassOptional] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validateEssentials = (): Set<string> => {
    const e = new Set<string>();
    if (form.username.trim().length < 3) e.add("username");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) e.add("email");
    if (form.password.length < 8) e.add("password");
    return e;
  };

  const missingOptional = (): string[] => OPTIONAL.filter((k) => !form[k].trim());

  const doSubmit = async () => {
    setBusy(true);
    setError(null);
    try {
      await register({
        email: form.email.trim(),
        password: form.password,
        username: form.username.trim() || undefined,
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        phoneDialCode: form.phoneDialCode || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
        mobileDialCode: form.mobileDialCode || undefined,
        mobileNumber: form.mobileNumber.trim() || undefined,
        speciality: form.speciality.trim() || undefined,
        country: form.country.trim() || undefined,
        city: form.city.trim() || undefined,
      });
      setRegisteredEmail(form.email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const essential = validateEssentials();
    if (essential.size) {
      setErrors(essential);
      return;
    }
    const missing = missingOptional();
    if (missing.length && !bypassOptional) {
      // First attempt with blanks → red fields + the spy saga.
      setErrors(new Set(missing));
      setSaga("warn");
      return;
    }
    setErrors(new Set());
    await doSubmit();
  };

  const cls = (k: string) => (errors.has(k) ? "field err" : "field");

  // ---- registered: check-your-email screen ----------------------------------
  if (registeredEmail) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1><MailCheck size={18} /> CHECK YOUR EMAIL</h1>
          <p className="sub">
            We sent a verification link to <b>{registeredEmail}</b>. Click it to activate your account —
            you can&apos;t log in until your email is verified. Unverified accounts are removed after 7 days.
          </p>
          <button className="btn block" onClick={() => resendVerification(registeredEmail)}>
            RESEND EMAIL
          </button>
          <p className="auth-foot"><Link href="/login">Back to sign in</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card wide">
        <h1>CREATE ACCOUNT</h1>
        <p className="sub">Email, username and password are required. The rest helps us tailor your feed.</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="grid2">
            <div className={cls("firstName")}>
              <label>First name</label>
              <input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
              {errors.has("firstName") && <span className="err-label">required</span>}
            </div>
            <div className={cls("lastName")}>
              <label>Last name</label>
              <input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
              {errors.has("lastName") && <span className="err-label">required</span>}
            </div>
          </div>

          <div className="grid2">
            <div className={cls("username")}>
              <label>Username *</label>
              <input value={form.username} onChange={(e) => set("username", e.target.value)} autoComplete="username" />
              {errors.has("username") && <span className="err-label">min 3 chars, required</span>}
            </div>
            <div className={cls("email")}>
              <label>Email *</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
              {errors.has("email") && <span className="err-label">valid email required</span>}
            </div>
          </div>

          <div className={cls("password")}>
            <label>Password *</label>
            <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" />
            {errors.has("password") && <span className="err-label">min 8 characters</span>}
          </div>

          <div className="grid2">
            <div className={cls("phoneNumber")}>
              <label>Phone</label>
              <div className="phone-row">
                <select aria-label="Phone dial code" value={form.phoneDialCode} onChange={(e) => set("phoneDialCode", e.target.value)}>
                  <option value="">+</option>
                  {UNIQUE_DIAL_CODES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <input inputMode="tel" value={form.phoneNumber} onChange={(e) => set("phoneNumber", e.target.value)} />
              </div>
              {errors.has("phoneNumber") && <span className="err-label">missing</span>}
            </div>
            <div className={cls("mobileNumber")}>
              <label>Mobile</label>
              <div className="phone-row">
                <select aria-label="Mobile dial code" value={form.mobileDialCode} onChange={(e) => set("mobileDialCode", e.target.value)}>
                  <option value="">+</option>
                  {UNIQUE_DIAL_CODES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <input inputMode="tel" value={form.mobileNumber} onChange={(e) => set("mobileNumber", e.target.value)} />
              </div>
              {errors.has("mobileNumber") && <span className="err-label">missing</span>}
            </div>
          </div>

          <div className={cls("speciality")}>
            <label>Speciality</label>
            <input list="speciality-list" value={form.speciality} onChange={(e) => set("speciality", e.target.value)} placeholder="start typing…" />
            <datalist id="speciality-list">
              {SPECIALITIES.map((s) => <option key={s} value={s} />)}
            </datalist>
            {errors.has("speciality") && <span className="err-label">missing</span>}
          </div>

          <div className="grid2">
            <div className={cls("country")}>
              <label>Country</label>
              <input list="country-list" value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="start typing…" />
              <datalist id="country-list">
                {COUNTRY_NAMES.map((c) => <option key={c} value={c} />)}
              </datalist>
              {errors.has("country") && <span className="err-label">missing</span>}
            </div>
            <div className={cls("city")}>
              <label>City</label>
              <input value={form.city} onChange={(e) => set("city", e.target.value)} />
              {errors.has("city") && <span className="err-label">missing</span>}
            </div>
          </div>

          <button className="btn block" type="submit" disabled={busy} style={{ marginTop: 8 }}>
            {busy ? <Loader2 className="spin" size={16} /> : <UserPlus size={16} />}
            {busy ? "CREATING…" : "CREATE ACCOUNT"}
          </button>
        </form>

        <div className="divider">— OR —</div>
        <div className="oauth-row">
          <a className="btn ghost block" href={oauthUrl("google")}><FcGoogle size={16} /> Google</a>
          <a className="btn ghost block" href={oauthUrl("github")}><FaGithub size={16} /> GitHub</a>
        </div>

        <p className="auth-foot">Already have an account? <Link href="/login">Sign in</Link></p>
        <p className="auth-foot"><Link href="/"><ArrowLeft size={13} /> Back to home</Link></p>
      </div>

      {/* ---- the "are you a spy?" saga ---- */}
      {saga === "warn" && (
        <Modal emoji="⚠️" title="The information is not provided. Are you sure you want to proceed?">
          <button className="btn ghost" onClick={() => setSaga(null)}>No</button>
          <button className="btn" onClick={() => setSaga("spy")}>Yes</button>
        </Modal>
      )}
      {saga === "spy" && (
        <Modal emoji="🫥" title="What are you hiding? Are you a Spy?">
          <button className="btn ghost" onClick={() => setSaga("mockNo")}>No</button>
          <button className="btn" onClick={() => setSaga("mockYes")}>Yes</button>
        </Modal>
      )}
      {saga === "mockYes" && (
        <Modal emoji="🤣" title="Ha Ha, very funny. Now go back and fill out the form, good boy/girl.">
          <button className="btn" onClick={() => { setSaga(null); setBypassOptional(true); }}>
            On my eyes, Kind Master
          </button>
        </Modal>
      )}
      {saga === "mockNo" && (
        <Modal emoji="🤣" title="That's what I thought. Now go back and fill out the form.">
          <button className="btn" onClick={() => { setSaga(null); setBypassOptional(true); }}>
            On my eyes, Kind Master
          </button>
        </Modal>
      )}
    </div>
  );
}

function Modal({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-emoji">{emoji}</div>
        <p className="modal-title">{title}</p>
        <div className="modal-actions">{children}</div>
      </div>
    </div>
  );
}
