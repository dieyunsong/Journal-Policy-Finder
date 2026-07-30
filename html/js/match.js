import { normalizeTitle, normalizeIssn, isIssn } from "./normalize.js";

export function buildMatchIndex(journals) {
  const byIssn = new Map();
  const byTitle = new Map();
  for (const j of journals) {
    for (const i of j.issns) byIssn.set(normalizeIssn(i), j);
    const key = normalizeTitle(j.name);
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push(j);
  }
  return { byIssn, byTitle, list: journals };
}

function editDistanceLE(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return false;
  const prev = Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0], best = (prev[0] = i);
    for (let j = 1; j <= b.length; j++) {
      const cur = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = prev[j];
      prev[j] = cur;
      best = Math.min(best, cur);
    }
    if (best > max) return false;
  }
  return prev[b.length] <= max;
}

export function findMatches(index, query) {
  const q = (query || "").trim();
  if (!q) return { tier: "none", matches: [] };
  if (isIssn(q)) {
    const hit = index.byIssn.get(normalizeIssn(q));
    return hit ? { tier: "issn", matches: [hit] } : { tier: "none", matches: [] };
  }
  const nq = normalizeTitle(q);
  if (index.byTitle.has(nq)) return { tier: "title", matches: index.byTitle.get(nq) };
  const fuzzy = [];
  for (const [key, arr] of index.byTitle) {
    if (key.startsWith(nq) || nq.startsWith(key) || editDistanceLE(key, nq, 2)) {
      fuzzy.push(...arr);
      if (fuzzy.length >= 8) break;
    }
  }
  return fuzzy.length ? { tier: "fuzzy", matches: fuzzy.slice(0, 8) } : { tier: "none", matches: [] };
}
