// Compare a CV against the live market (the same facets the Stats page uses) and
// score how well it aligns. All client-side — the CV text never leaves the browser.

export type Facet = Record<string, number>;

export interface MarketFacets {
  keywords: Facet;
  programming: Facet;
  software: Facet;
  certificates: Facet;
}

export interface ItemMatch {
  name: string;
  demand: number; // how many market postings mention it
  count: number; //  times it appears in the CV
  matched: boolean;
  category: string;
}

export interface CategoryResult {
  key: string;
  label: string;
  items: ItemMatch[];
  score: number; // 0-100, demand-weighted coverage
  matchedCount: number;
  total: number;
}

export interface CvAnalysis {
  categories: CategoryResult[];
  overall: number;
  suggestions: ItemMatch[]; // highest-demand items missing from the CV
}

/** Count how many times `term` appears in `text` as a whole token (handles C++, C#, .NET, Node.js). */
export function mentions(text: string, term: string): number {
  const t = term.trim().toLowerCase();
  if (!t) return 0;
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // token boundary = start/end or a char that isn't part of a tech token
  const re = new RegExp(`(?:^|[^a-z0-9+#.])${esc}(?:[^a-z0-9+#.]|$)`, "gi");
  const m = text.match(re);
  return m ? m.length : 0;
}

const CATEGORY_META: { key: keyof MarketFacets; label: string; topN: number; weight: number }[] = [
  { key: "keywords", label: "In-demand skills", topN: 30, weight: 0.4 },
  { key: "programming", label: "Programming languages", topN: 20, weight: 0.25 },
  { key: "software", label: "Software & tools", topN: 20, weight: 0.25 },
  { key: "certificates", label: "Top certificates", topN: 15, weight: 0.1 },
];

function analyzeCategory(
  key: string,
  label: string,
  facet: Facet,
  text: string,
  topN: number,
): CategoryResult {
  const items: ItemMatch[] = Object.entries(facet ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name, demand]) => {
      const count = mentions(text, name);
      return { name, demand, count, matched: count > 0, category: label };
    });

  const totalDemand = items.reduce((s, i) => s + i.demand, 0) || 1;
  const matchedDemand = items.filter((i) => i.matched).reduce((s, i) => s + i.demand, 0);
  const score = Math.round((matchedDemand / totalDemand) * 100);
  return { key, label, items, score, matchedCount: items.filter((i) => i.matched).length, total: items.length };
}

export function analyzeCv(cvText: string, facets: MarketFacets): CvAnalysis {
  const text = cvText.toLowerCase();
  const categories = CATEGORY_META.map((m) => analyzeCategory(m.key, m.label, facets[m.key], text, m.topN));

  // Demand-weighted overall score across categories (only categories that have
  // market data contribute, so a filter with no certs data doesn't tank the score).
  let wSum = 0;
  let acc = 0;
  categories.forEach((c, i) => {
    if (c.total === 0) return;
    const w = CATEGORY_META[i].weight;
    acc += c.score * w;
    wSum += w;
  });
  const overall = wSum ? Math.round(acc / wSum) : 0;

  const suggestions = categories
    .flatMap((c) => c.items.filter((i) => !i.matched))
    .sort((a, b) => b.demand - a.demand)
    .slice(0, 12);

  return { categories, overall, suggestions };
}
