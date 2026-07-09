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

// The provided artwork, traced from the PNGs to compact SVG (public/ornaments).
// Weights mirror the original demo (persian-vine .50 / paisley-color .30 / paisley-line .20).
const MOTIFS = [
  { src: "/ornaments/persian-vine.svg", weight: 0.5 },
  { src: "/ornaments/paisley-color.svg", weight: 0.3 },
  { src: "/ornaments/paisley-line.svg", weight: 0.2 },
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
    if (r < c) return m.src;
  }
  return MOTIFS[MOTIFS.length - 1].src;
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
        corner.innerHTML = `<img src="${pickMotif()}" alt="" />`;
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
