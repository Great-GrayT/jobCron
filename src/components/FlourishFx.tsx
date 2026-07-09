"use client";

import { useEffect } from "react";

/**
 * Button 3 — Persian flourish enhancer.
 *
 * Mounted once at the app root. Finds every `.btn-flourish` button, injects
 * four corner-ornament slots + sparkle fields, and re-rolls them on hover
 * (same algorithm as the provided demo): each corner has a 30% chance of
 * showing an ornament, weighted 50/30/20 across three motifs, with sparkles.
 *
 * Ornaments are tiny inline SVGs drawn in `currentColor`, so they inherit the
 * themed gold tint from CSS (--fx-gold) and stay crisp + light-weight.
 */

const FILL_CHANCE = 0.3;

// Small, optimised paisley/flower/vine motifs (stroke = currentColor).
const VINE = `<svg viewBox="0 0 46 64" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M44 62 C34 54 30 44 31 34 C32 24 27 16 16 12"/><path d="M31 34 C24 33 18 36 16 43 C21 44 27 41 31 34Z"/><path d="M16 12 C10 10 6 12 4 18 C10 20 15 18 16 12Z"/><circle cx="19" cy="8" r="4"/><path d="M15 8h8M19 4v8" /><path d="M38 50 C33 49 29 51 28 56"/></svg>`;
const FLOWER = `<svg viewBox="0 0 46 64" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(23 22)"><circle r="4"/><ellipse cx="0" cy="-11" rx="4" ry="7"/><ellipse cx="0" cy="11" rx="4" ry="7"/><ellipse cx="-11" cy="0" rx="7" ry="4"/><ellipse cx="11" cy="0" rx="7" ry="4"/><ellipse cx="-8" cy="-8" rx="6" ry="3.5" transform="rotate(45)"/><ellipse cx="8" cy="8" rx="6" ry="3.5" transform="rotate(45)"/></g><path d="M23 34 C22 44 26 52 34 58" /><path d="M27 46 C31 45 34 47 35 51" /></svg>`;
const PAISLEY = `<svg viewBox="0 0 46 64" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 60 C6 50 6 36 16 28 C26 20 34 26 33 36 C32 44 24 46 22 40 C21 36 24 33 28 34"/><path d="M16 28 C20 22 27 20 33 22" stroke-dasharray="0.5 4"/><circle cx="19" cy="52" r="2.5"/><path d="M30 54 C33 52 36 53 37 57"/></svg>`;

const MOTIFS = [
  { svg: VINE, weight: 0.5 },
  { svg: FLOWER, weight: 0.3 },
  { svg: PAISLEY, weight: 0.2 },
];
const CORNERS = ["tl", "tr", "bl", "br"] as const;

// four sparkle positions per corner field
const SPARKS = [
  { l: "8%", t: "14%" },
  { l: "38%", t: "5%" },
  { l: "20%", t: "34%" },
  { l: "46%", t: "22%" },
];

function pickMotif(): string {
  const r = Math.random();
  let c = 0;
  for (const m of MOTIFS) {
    c += m.weight;
    if (r < c) return m.svg;
  }
  return MOTIFS[MOTIFS.length - 1].svg;
}

function build(btn: HTMLElement) {
  if (btn.dataset.flReady) return;
  btn.dataset.flReady = "1";

  for (const key of CORNERS) {
    const corner = document.createElement("div");
    corner.className = `fl-corner ${key}`;
    btn.appendChild(corner);

    const field = document.createElement("div");
    field.className = `fl-spark-field ${key}`;
    SPARKS.forEach((s, i) => {
      const spark = document.createElement("span");
      spark.className = "fl-spark";
      spark.style.left = s.l;
      spark.style.top = s.t;
      spark.style.setProperty("--i", String(i));
      field.appendChild(spark);
    });
    btn.appendChild(field);
  }

  const roll = () => {
    btn.querySelectorAll<HTMLElement>(".fl-corner").forEach((corner) => {
      if (Math.random() < FILL_CHANCE) {
        corner.innerHTML = pickMotif();
        corner.style.display = "";
      } else {
        corner.innerHTML = "";
        corner.style.display = "none";
      }
    });
  };

  roll();
  btn.addEventListener("mouseenter", roll);
  btn.addEventListener("focus", roll);
}

export function FlourishFx() {
  useEffect(() => {
    const scan = () =>
      document.querySelectorAll<HTMLElement>(".btn-flourish").forEach(build);

    scan();

    // catch buttons rendered later (modals, lists, route changes)
    let raf = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(scan);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return null;
}
