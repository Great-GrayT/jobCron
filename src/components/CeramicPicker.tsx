"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Palette } from "lucide-react";
import { useCeramic, CERAMIC_TINTS } from "@/context/CeramicContext";

// Top-bar control to pick the ceramic pattern colour (applies app-wide).
export function CeramicPicker() {
  const { tint, setTint } = useCeramic();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = CERAMIC_TINTS.find((t) => t.key === tint) ?? CERAMIC_TINTS[0];

  return (
    <div className="ceramic-picker" ref={ref}>
      <button
        className="terminal-btn ceramic-picker-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Pattern colour"
        aria-expanded={open}
        title={`Pattern: ${current.label}`}
      >
        <Palette size={14} />
        <span className="ceramic-swatch" style={{ background: current.swatch }} aria-hidden="true" />
      </button>

      {open && (
        <div className="ceramic-dropdown" role="listbox" aria-label="Pattern colour">
          {CERAMIC_TINTS.map((t) => (
            <button
              key={t.key}
              className={`ceramic-option ${t.key === tint ? "active" : ""}`}
              role="option"
              aria-selected={t.key === tint}
              onClick={() => { setTint(t.key); setOpen(false); }}
            >
              <span className="ceramic-swatch" style={{ background: t.swatch }} aria-hidden="true" />
              <span className="ceramic-option-label">{t.label}</span>
              {t.key === tint && <Check size={13} className="ceramic-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
