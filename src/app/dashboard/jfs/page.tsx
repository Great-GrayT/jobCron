"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Trash2, Save, Pencil, Play, Pause, X } from "lucide-react";
import { filters, dictionaries } from "@/lib/api/me";
import type { Connector, FieldMeta, FilterCondition, FilterSet } from "@/lib/api/types";

const OP_LABEL: Record<string, string> = { is: "is", has: "has", contains: "contains", gte: "≥", lte: "≤" };

/** AND/OR segmented toggle shown between two conditions. */
function ConnectorToggle({ value, onChange }: { value: Connector; onChange: (v: Connector) => void }) {
  return (
    <div className="jfs-connector" role="group" aria-label="connector">
      <button type="button" className={value === "AND" ? "on" : ""} onClick={() => onChange("AND")}>AND</button>
      <button type="button" className={value === "OR" ? "on" : ""} onClick={() => onChange("OR")}>OR</button>
    </div>
  );
}

/** Value input: dictionary type-ahead (server-side search), free text, or number. */
function ValueInput({ field, value, onChange }: { field: FieldMeta; value: string; onChange: (v: string) => void }) {
  const [q, setQ] = useState(value);
  const [opts, setOpts] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setQ(value), [value]);

  if (field.kind === "number") {
    return <input type="number" className="jfs-val" value={value} onChange={(e) => onChange(e.target.value)} placeholder="number" />;
  }
  if (field.kind === "text") {
    return <input className="jfs-val" value={value} onChange={(e) => onChange(e.target.value)} placeholder="type a value" />;
  }

  const search = (term: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const vals = await dictionaries.search(field.field, term).catch(() => []);
      setOpts(vals);
      setOpen(true);
    }, 200);
  };

  return (
    <div className="jfs-typeahead">
      <input
        className="jfs-val"
        value={q}
        placeholder={`search ${field.label.toLowerCase()}…`}
        onFocus={() => { setOpen(true); search(q); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => { setQ(e.target.value); onChange(e.target.value); search(e.target.value); }}
      />
      {open && opts.length > 0 && (
        <ul className="jfs-options">
          {opts.map((o) => (
            <li key={o}>
              <button type="button" onMouseDown={() => { onChange(o); setQ(o); setOpen(false); }}>{o}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface Draft {
  id?: string;
  name: string;
  enabled: boolean;
  conditions: FilterCondition[];
}

export default function JfsPage() {
  const [sets, setSets] = useState<FilterSet[]>([]);
  const [fields, setFields] = useState<FieldMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    filters
      .list()
      .then((r) => { setSets(r.filterSets); setFields(r.fields); })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const fieldMeta = (name: string): FieldMeta => fields.find((f) => f.field === name) ?? fields[0];

  const newSet = () =>
    setDraft({ name: "", enabled: true, conditions: [{ field: fields[0]?.field ?? "industry", op: fields[0]?.ops[0] ?? "is", value: "", connector: "AND" }] });
  const editSet = (fs: FilterSet) => setDraft({ id: fs.id, name: fs.name, enabled: fs.enabled, conditions: fs.conditions.map((c) => ({ ...c })) });

  // ---- draft condition edits ----
  const patchCond = (i: number, patch: Partial<FilterCondition>) =>
    setDraft((d) => (d ? { ...d, conditions: d.conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) } : d));
  const changeField = (i: number, field: string) => {
    const meta = fieldMeta(field);
    patchCond(i, { field, op: meta.ops[0], value: "" }); // reset op + value on field change
  };
  const addCond = () =>
    setDraft((d) => (d ? { ...d, conditions: [...d.conditions, { field: fields[0]?.field ?? "industry", op: fields[0]?.ops[0] ?? "is", value: "", connector: "AND" }] } : d));
  const removeCond = (i: number) =>
    setDraft((d) => (d ? { ...d, conditions: d.conditions.filter((_, idx) => idx !== i) } : d));

  const valid = useMemo(
    () => !!draft && draft.name.trim().length > 0 && draft.conditions.length > 0 && draft.conditions.every((c) => c.value.trim().length > 0),
    [draft],
  );

  const save = async () => {
    if (!draft || !valid) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: draft.name.trim(),
        enabled: draft.enabled,
        conditions: draft.conditions.map((c) => ({ field: c.field, op: c.op, value: c.value.trim(), connector: c.connector })),
      };
      if (draft.id) await filters.update(draft.id, body);
      else await filters.create(body);
      setDraft(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const togglePause = async (fs: FilterSet) => {
    setBusy(fs.id);
    setSets((p) => p.map((s) => (s.id === fs.id ? { ...s, enabled: !s.enabled } : s)));
    try { await filters.update(fs.id, { enabled: !fs.enabled }); } catch { await load(); } finally { setBusy(null); }
  };
  const remove = async (fs: FilterSet) => {
    if (!confirm(`Delete filter set "${fs.name}"?`)) return;
    setBusy(fs.id);
    setSets((p) => p.filter((s) => s.id !== fs.id));
    try { await filters.remove(fs.id); } catch { await load(); } finally { setBusy(null); }
  };

  if (loading) return <div className="muted"><Loader2 className="spin" size={16} /> loading…</div>;

  // ---- builder view ----
  if (draft) {
    return (
      <section className="panel">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>{draft.id ? "EDIT FILTER SET" : "NEW FILTER SET"}</h2>
          <button type="button" className="btn ghost sm" onClick={() => setDraft(null)}><X size={14} /> Cancel</button>
        </div>
        <p className="hint">
          A job is sent to your <b>Filtered</b> Telegram channel if it matches this set. Conditions are
          combined left-to-right using the AND/OR between them.
        </p>
        {error && <div className="auth-error">{error}</div>}

        <div className="field">
          <label htmlFor="fname">Name</label>
          <input id="fname" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. UK Finance – Entry/Mid" />
        </div>

        <div className="jfs-builder">
          {draft.conditions.map((c, i) => {
            const meta = fieldMeta(c.field);
            return (
              <Fragment key={i}>
                <div className="jfs-cond">
                  <select value={c.field} onChange={(e) => changeField(i, e.target.value)} aria-label="field">
                    {fields.map((f) => <option key={f.field} value={f.field}>{f.label}</option>)}
                  </select>
                  {meta.ops.length > 1 && (
                    <select value={c.op} onChange={(e) => patchCond(i, { op: e.target.value })} aria-label="operator" className="jfs-op">
                      {meta.ops.map((op) => <option key={op} value={op}>{OP_LABEL[op] ?? op}</option>)}
                    </select>
                  )}
                  <ValueInput field={meta} value={c.value} onChange={(v) => patchCond(i, { value: v })} />
                  <button type="button" className="btn danger sm" onClick={() => removeCond(i)} aria-label="remove condition" disabled={draft.conditions.length === 1}>
                    <Trash2 size={14} />
                  </button>
                </div>
                {i < draft.conditions.length - 1 && (
                  <ConnectorToggle value={c.connector} onChange={(v) => patchCond(i, { connector: v })} />
                )}
              </Fragment>
            );
          })}
          <button type="button" className="btn ghost sm" onClick={addCond}><Plus size={14} /> add condition</button>
        </div>

        <div className="row" style={{ marginTop: "1rem" }}>
          <label className="switch">
            <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} /> Enabled
          </label>
          <button type="button" className="btn" onClick={save} disabled={!valid || saving}>
            {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} SAVE
          </button>
        </div>
      </section>
    );
  }

  // ---- list view ----
  return (
    <section className="panel">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2>JOB FILTERING SYSTEM</h2>
        <button type="button" className="btn" onClick={newSet}><Plus size={16} /> New filter set</button>
      </div>
      <p className="hint">
        Build one or more filter sets. A job matching <b>any</b> enabled set is posted to your <b>Filtered</b> Telegram channel.
      </p>
      {error && <div className="auth-error">{error}</div>}

      {sets.length === 0 ? (
        <div className="empty-panel"><p>No filter sets yet. Create one to start routing matches to your filtered channel.</p></div>
      ) : (
        <div className="jfs-set-list">
          {sets.map((fs) => (
            <div key={fs.id} className={`jfs-set-card ${fs.enabled ? "" : "paused"}`}>
              <div className="jfs-set-head">
                <span className="jfs-set-name">{fs.name}</span>
                <span className={`jfs-pill ${fs.enabled ? "on" : ""}`}>{fs.enabled ? "active" : "paused"}</span>
              </div>
              <div className="jfs-set-summary">
                {fs.conditions.map((c, i) => (
                  <span key={i}>
                    <span className="jfs-chip">{fieldMeta(c.field)?.label ?? c.field} {OP_LABEL[c.op] ?? c.op} <b>{c.value}</b></span>
                    {i < fs.conditions.length - 1 && <span className="jfs-conn-word"> {c.connector} </span>}
                  </span>
                ))}
              </div>
              <div className="cell-actions cell-actions-end">
                <button type="button" className="btn ghost sm" disabled={busy === fs.id} onClick={() => togglePause(fs)}>
                  {fs.enabled ? <><Pause size={13} /> pause</> : <><Play size={13} /> resume</>}
                </button>
                <button type="button" className="btn sm" onClick={() => editSet(fs)}><Pencil size={13} /> edit</button>
                <button type="button" className="btn danger sm" disabled={busy === fs.id} onClick={() => remove(fs)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
