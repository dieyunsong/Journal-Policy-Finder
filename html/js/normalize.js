const ARTICLES = /^(the|a|an)\s+/;

export function normalizeTitle(s) {
  return (s || "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(ARTICLES, "")
    .replace(/[^a-z0-9]+/g, " ")
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
