"use client";

import { useState } from "react";
import { X } from "lucide-react";

// Tag/chip input for string[] fields. Enter or comma commits a value.
export function ChipInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  // Add one or many comma-separated values, de-duped.
  const add = (raw: string) => {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const merged = [...value];
    for (const p of parts) if (!merged.includes(p)) merged.push(p);
    onChange(merged);
  };

  const commit = () => {
    add(draft);
    setDraft("");
  };

  // Split on every comma as the user types or pastes "a, b, c".
  const handleChange = (text: string) => {
    if (text.includes(",")) {
      const lastComma = text.lastIndexOf(",");
      add(text.slice(0, lastComma));
      setDraft(text.slice(lastComma + 1).trimStart());
    } else {
      setDraft(text);
    }
  };

  return (
    <div className="chip-input">
      {value.map((v) => (
        <span key={v} className="chip">
          {v}
          <button type="button" title={`Remove ${v}`} aria-label={`Remove ${v}`} onClick={() => onChange(value.filter((x) => x !== v))}>
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
      />
    </div>
  );
}
