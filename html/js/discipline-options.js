/**
 * Shape the taxonomy into the two-level structure the discipline picker shows:
 * broad areas first, each holding the topics that actually have journals.
 *
 * Pure — no DOM — so the grouping rules stay testable.
 */
export function buildDisciplineOptions(taxonomy) {
  const areas = taxonomy.areas || {};
  const tagList = taxonomy.tag_list || [];
  const counts = taxonomy.tag_counts || {};
  const idOf = new Map(tagList.map((slug, i) => [slug, i]));

  const groups = [];
  for (const [areaId, area] of Object.entries(areas)) {
    const topics = Object.entries(area.subcategories || {})
      .map(([subSlug, label]) => ({ id: idOf.get(`${areaId}/${subSlug}`), label }))
      // Drop topics no journal carries: 127 of 299 taxonomy subcategories match
      // nothing, and offering them means clicking a topic that returns nothing.
      .filter((t) => t.id !== undefined && counts[String(t.id)] > 0)
      .map((t) => ({ ...t, count: counts[String(t.id)] }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    if (!topics.length) continue;
    groups.push({ areaId, areaLabel: area.label, topics });
  }
  groups.sort((a, b) => a.areaLabel.localeCompare(b.areaLabel));
  return groups;
}

/** Look up a topic's label by tag id, for rendering the selected pills. */
export function topicLabels(groups) {
  const byId = new Map();
  for (const g of groups) {
    for (const t of g.topics) byId.set(t.id, t.label);
  }
  return byId;
}
