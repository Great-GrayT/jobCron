"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { goat } from "@/lib/api/me";
import type { GoatConfig } from "@/lib/api/types";
import { ChipInput } from "@/components/ChipInput";

const DEFAULTS: GoatConfig = {
  enabled: false,
  requireIndustry: false,
  requireCategory: false,
  categories: [],
  industries: [],
  seniorities: [],
  companyBlacklist: [],
  vipCompanies: [],
  locationTerms: [],
};

const BOOLS: { key: keyof GoatConfig; label: string }[] = [
  { key: "enabled", label: "Enabled" },
  { key: "requireIndustry", label: "Require industry match" },
  { key: "requireCategory", label: "Require category match" },
];

const ARRAYS: { key: keyof GoatConfig; label: string; hint: string }[] = [
  { key: "categories", label: "Categories", hint: "qualifying role categories" },
  { key: "industries", label: "Industries", hint: "e.g. Finance" },
  { key: "seniorities", label: "Seniorities", hint: "e.g. Mid, Entry" },
  { key: "companyBlacklist", label: "Company blacklist", hint: "" },
  { key: "vipCompanies", label: "VIP companies", hint: "" },
  { key: "locationTerms", label: "Location terms", hint: "required location substrings" },
];

export default function GoatPage() {
  const [cfg, setCfg] = useState<GoatConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    goat
      .get()
      .then((r) => setCfg(r.config ?? DEFAULTS))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const setBool = (key: keyof GoatConfig, v: boolean) => setCfg((c) => ({ ...c, [key]: v }));
  const setArr = (key: keyof GoatConfig, v: string[]) => setCfg((c) => ({ ...c, [key]: v }));

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const r = await goat.put(cfg);
      setCfg(r.config);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="muted"><Loader2 className="spin" size={16} /> loading…</div>;

  return (
    <section className="panel">
      <h2>GOAT FILTERS</h2>
      <p className="hint">Rules deciding which top-tier jobs go to your GOAT channel.</p>

      {error && <div className="auth-error">{error}</div>}

      <div className="row" style={{ marginBottom: "1.5rem" }}>
        {BOOLS.map(({ key, label }) => (
          <label key={key} className="switch">
            <input type="checkbox" checked={cfg[key] as boolean} onChange={(e) => setBool(key, e.target.checked)} />
            {label}
          </label>
        ))}
      </div>

      {ARRAYS.map(({ key, label, hint }) => (
        <div className="field" key={key}>
          <label>{label}{hint && <span className="muted"> — {hint}</span>}</label>
          <ChipInput value={cfg[key] as string[]} onChange={(v) => setArr(key, v)} placeholder="type + Enter" />
        </div>
      ))}

      <button className="btn" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} SAVE
        {saved && <span className="ok"> ✓</span>}
      </button>
    </section>
  );
}
