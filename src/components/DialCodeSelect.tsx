"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { DIAL_CODES } from "@/lib/dictionaries/dial-codes";
import { Flag } from "@/components/Flag";

// Country dial-code picker with SVG flags. Replaces a native <select> (which
// can't render flag images inside <option>). Stores/returns the dial string
// (e.g. "+44") so it's a drop-in for the existing form fields.
export function DialCodeSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (dial: string) => void;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = useMemo(() => DIAL_CODES.find((d) => d.dial === value) ?? null, [value]);
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return DIAL_CODES;
    return DIAL_CODES.filter(
      (d) => d.country.toLowerCase().includes(n) || d.dial.includes(n) || d.iso.toLowerCase() === n,
    );
  }, [q]);

  return (
    <div className="dial-select" ref={ref}>
      <button
        type="button"
        className="dial-select-btn"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {current ? <Flag code={current.iso} /> : <span className="flag-blank" />}
        <span className="dial-code">{value || "+"}</span>
        <ChevronDown size={12} className="dial-chevron" />
      </button>

      {open && (
        <div className="dial-dropdown" role="listbox" aria-label={ariaLabel}>
          <input
            className="dial-search"
            autoFocus
            placeholder="Search country…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            spellCheck={false}
          />
          <div className="dial-list">
            {filtered.map((d) => (
              <button
                type="button"
                key={`${d.iso}${d.dial}`}
                className={`dial-option ${d.dial === value ? "active" : ""}`}
                role="option"
                aria-selected={d.dial === value}
                onClick={() => { onChange(d.dial); setOpen(false); setQ(""); }}
              >
                <Flag code={d.iso} />
                <span className="dial-option-name">{d.country}</span>
                <span className="dial-option-code">{d.dial}</span>
                {d.dial === value && <Check size={12} className="dial-check" />}
              </button>
            ))}
            {filtered.length === 0 && <div className="dial-empty">No match</div>}
          </div>
        </div>
      )}
    </div>
  );
}
