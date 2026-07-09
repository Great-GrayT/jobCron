"use client";

import { useEffect, useRef, useState } from "react";
import { dictionaries } from "@/lib/api/me";

/**
 * Server-side dictionary type-ahead (same source as the JFS builder).
 * Searches `/api/dictionaries/{field}` and shows matches; a "Load more"
 * row at the end of the list fetches the next 30 (limit grows by 30).
 */
export function DictionaryTypeahead({
  field,
  value,
  onChange,
  placeholder,
}: {
  field: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState(value);
  const [opts, setOpts] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const termRef = useRef(value);

  useEffect(() => setQ(value), [value]);

  const run = (term: string, lim: number) => {
    setLoading(true);
    dictionaries
      .search(field, term, lim)
      .then((vals) => {
        setOpts(vals);
        setHasMore(vals.length >= lim); // a full page probably means there's more
        setOpen(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const search = (term: string) => {
    termRef.current = term;
    setLimit(30);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => run(term, 30), 200);
  };

  const loadMore = () => {
    const next = limit + 30;
    setLimit(next);
    run(termRef.current, next);
  };

  return (
    <div className="jfs-typeahead">
      <input
        className="jfs-val"
        value={q}
        placeholder={placeholder ?? "search…"}
        onFocus={() => { setOpen(true); search(q); }}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        onChange={(e) => { setQ(e.target.value); onChange(e.target.value); search(e.target.value); }}
      />
      {open && (opts.length > 0 || loading) && (
        <ul className="jfs-options">
          {opts.map((o) => (
            <li key={o}>
              <button type="button" onMouseDown={() => { onChange(o); setQ(o); setOpen(false); }}>{o}</button>
            </li>
          ))}
          {hasMore && (
            <li className="jfs-loadmore">
              <button type="button" onMouseDown={(e) => { e.preventDefault(); loadMore(); }}>
                {loading ? "Loading…" : "Load more"}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
