export function filterJournals(journals, tags, taOnly, taSet) {
  if (!tags || tags.length === 0) return [];
  const want = new Set(tags);
  const out = journals.filter((j) => {
    const hasTag = (j.tags || []).some((t) => want.has(t));
    if (!hasTag) return false;
    if (taOnly && !taSet.has(j.issn_l)) return false;
    return true;
  });
  out.sort((a, b) => (b.works_count || 0) - (a.works_count || 0));
  return out.slice(0, 200);
}
