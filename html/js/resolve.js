/** Map every alias id onto its curated entry.
 *
 * One publisher can hold several OpenAlex ids (Springer Nature journals sit
 * under two). Without this, ~900 journals render "not yet curated" directly
 * under their publisher's own name. Aliases are only ever added for ids whose
 * OpenAlex publisher name is identical, so no journal inherits another
 * publisher's policy.
 */
export function buildPublisherLookup(publishers) {
  const byId = new Map();
  for (const [id, p] of Object.entries(publishers)) {
    byId.set(id, p);
    for (const alias of p.aliases || []) byId.set(alias, p);
  }
  return byId;
}

export function resolveCard(journal, publishers, taSet, homepages = null) {
  // Accepts either the raw publishers object or a prebuilt alias lookup.
  const pub = publishers instanceof Map
    ? publishers.get(journal.publisher)
    : publishers[journal.publisher];
  const covered = taSet.has(journal.issn_l);
  if (pub) {
    return { journal, kind: "curated", publisher: pub, ta: { covered } };
  }
  const issn = journal.issn_l;
  return {
    journal, kind: "fallback", ta: { covered },
    publisher: {
      name: journal.publisher_name || "Publisher",
      // From OpenAlex, so an uncurated publisher is still reachable in one click.
      homepage: (homepages && homepages[journal.publisher]) || null,
      sherpa: `https://v2.sherpa.ac.uk/cgi/search/publication?issn=${issn}`,
      doaj: `https://doaj.org/search/journals?source=%7B%22query%22:%7B%22query_string%22:%7B%22query%22:%22${issn}%22%7D%7D%7D`,
    },
  };
}
