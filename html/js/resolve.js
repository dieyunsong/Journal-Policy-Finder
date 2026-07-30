export function resolveCard(journal, publishers, taSet) {
  const pub = publishers[journal.publisher];
  const covered = taSet.has(journal.issn_l);
  if (pub) {
    return { journal, kind: "curated", publisher: pub, ta: { covered } };
  }
  const issn = journal.issn_l;
  return {
    journal, kind: "fallback", ta: { covered },
    publisher: {
      name: journal.publisher_name || "Publisher",
      homepage: null,
      sherpa: `https://v2.sherpa.ac.uk/cgi/search/publication?issn=${issn}`,
      doaj: `https://doaj.org/search/journals?source=%7B%22query%22:%7B%22query_string%22:%7B%22query%22:%22${issn}%22%7D%7D%7D`,
    },
  };
}
