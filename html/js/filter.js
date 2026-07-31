export const BROWSE_LIMIT = 200;

/**
 * Filter journals for browse mode.
 *
 * `tags` are interned integer ids (see scripts/build.py). Passing no tags with
 * `taOnly` set lists every TA-covered journal, which is a question researchers
 * genuinely ask ("what can I publish in under our agreements?"). Passing
 * neither returns nothing, so the UI can prompt for a filter.
 *
 * Returns { items, total } so the caller can say "showing 200 of N" instead of
 * silently truncating.
 */
export function filterJournals(journals, tags, taOnly, taSet, limit = BROWSE_LIMIT) {
  const hasTags = tags && tags.length > 0;
  if (!hasTags && !taOnly) return { items: [], total: 0 };
  const want = new Set(tags || []);
  const out = journals.filter((j) => {
    if (hasTags && !(j.tags || []).some((t) => want.has(t))) return false;
    if (taOnly && !taSet.has(j.issn_l)) return false;
    return true;
  });
  out.sort((a, b) => (b.works_count || 0) - (a.works_count || 0));
  return { items: out.slice(0, limit), total: out.length };
}
