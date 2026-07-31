const ARTICLES = /^(the|a|an)\s+/;

export function normalizeTitle(s) {
  return (s || "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(ARTICLES, "")
    // Keep letters/digits of ANY script: a Latin-only class would erase Greek,
    // Cyrillic, and CJK titles to "", making them unsearchable and turning that
    // empty key into a wildcard that matches every query.
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function normalizeIssn(s) {
  const raw = (s || "").toUpperCase().replace(/[^0-9X]/g, "");
  if (raw.length !== 8) return null;
  return raw.slice(0, 4) + "-" + raw.slice(4);
}

export function isIssn(s) {
  return normalizeIssn(s) !== null;
}
