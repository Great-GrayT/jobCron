// Compare a CV against the live market (the same facets the Stats page uses) and
// score how well it aligns. All client-side | the CV text never leaves the browser.

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
  items: ItemMatch[]; // top items for display
  missing: ItemMatch[]; // highest-demand items absent from the CV
  score: number; // 0-100 (100 = covering FULL_COVERAGE of the section's demand)
  coverage: number; // raw % of the section's total demand the CV covers
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

// Covering this fraction of a section's TOTAL demand counts as a full (100%) match
// | e.g. if certs total 100 postings and CFA alone is 60, having CFA = 100%.
const FULL_COVERAGE = 0.6;

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
  // Score over the WHOLE section (every returned item), demand-weighted.
  const all: ItemMatch[] = Object.entries(facet ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([name, demand]) => {
      const count = mentions(text, name);
      return { name, demand, count, matched: count > 0, category: label };
    });

  const totalDemand = all.reduce((s, i) => s + i.demand, 0) || 1;
  const matchedDemand = all.filter((i) => i.matched).reduce((s, i) => s + i.demand, 0);
  const coverage = matchedDemand / totalDemand; // 0..1 of the market's demand your CV covers
  const score = Math.min(100, Math.round((coverage / FULL_COVERAGE) * 100));

  return {
    key,
    label,
    items: all.slice(0, topN), // top items for display
    missing: all.filter((i) => !i.matched).slice(0, 25),
    score,
    matchedCount: all.filter((i) => i.matched).length,
    total: all.length,
    coverage: Math.round(coverage * 100),
  };
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
    .flatMap((c) => c.missing)
    .sort((a, b) => b.demand - a.demand)
    .slice(0, 12);

  return { categories, overall, suggestions };
}
