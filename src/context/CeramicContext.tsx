"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";

// User-selectable ceramic pattern colour. "auto" keeps the theme default
// (navy on light, gold on dark); any other value overrides --ceramic-pattern
// globally, so every ceramic surface (chat, empty panels, auth, sidebar-independent)
// re-tints at once.

export type CeramicTint = "auto" | "navy" | "teal" | "gold" | "cream";

export const CERAMIC_TINTS: { key: CeramicTint; label: string; swatch: string }[] = [
  { key: "auto", label: "Auto (theme)", swatch: "linear-gradient(135deg,#22347c 50%,#d3ab63 50%)" },
  { key: "navy", label: "Porcelain navy", swatch: "#22347c" },
  { key: "teal", label: "Teal", swatch: "#2bb6c4" },
  { key: "gold", label: "Gold", swatch: "#d3ab63" },
  { key: "cream", label: "Cream", swatch: "#e9dcc0" },
];

interface CeramicContextType {
  tint: CeramicTint;
  setTint: (t: CeramicTint) => void;
}

const CeramicContext = createContext<CeramicContextType | undefined>(undefined);
const STORAGE_KEY = "ceramic-tint-v1";

export function CeramicProvider({ children }: { children: ReactNode }) {
  const [tint, setTintState] = useState<CeramicTint>("auto");

  // Load saved choice on mount.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as CeramicTint | null;
    if (saved && CERAMIC_TINTS.some((t) => t.key === saved)) setTintState(saved);
  }, []);

  // Apply: override the CSS var globally, or clear it to fall back to the theme.
  useEffect(() => {
    const root = document.documentElement;
    if (tint === "auto") root.style.removeProperty("--ceramic-pattern");
    else root.style.setProperty("--ceramic-pattern", `url("/ornate/premium-ceramic-${tint}.png")`);
  }, [tint]);

  const setTint = useCallback((t: CeramicTint) => {
    setTintState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ tint, setTint }), [tint, setTint]);
  return <CeramicContext.Provider value={value}>{children}</CeramicContext.Provider>;
}

export function useCeramic() {
  const ctx = useContext(CeramicContext);
  if (ctx === undefined) throw new Error("useCeramic must be used within a CeramicProvider");
  return ctx;
}
