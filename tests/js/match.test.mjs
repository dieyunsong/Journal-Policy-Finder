import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMatchIndex, findMatches } from "../../html/js/match.js";
import { JOURNALS } from "./fixtures.mjs";

const idx = buildMatchIndex(JOURNALS);

test("ISSN query resolves via any issn", () => {
  const r = findMatches(idx, "3333-4444");
  assert.equal(r.tier, "issn");
  assert.equal(r.matches[0].issn_l, "1111-2222");
});

test("exact title match", () => {
  const r = findMatches(idx, "the journal of widget science");
  assert.equal(r.tier, "title");
  assert.equal(r.matches.length, 1);
});

test("fuzzy match on typo", () => {
  const r = findMatches(idx, "journal of widget scince");
  assert.equal(r.tier, "fuzzy");
  assert.ok(r.matches.some((m) => m.issn_l === "1111-2222"));
});

test("no match returns none", () => {
  assert.equal(findMatches(idx, "zzzzz nonexistent").tier, "none");
});

test("a title that normalizes to empty never becomes a match-all wildcard", () => {
  const idx = buildMatchIndex([
    { name: "!!! ---", issn_l: "0000-0001", issns: ["0000-0001"], publisher: "P1", works_count: 10, tags: [] },
    { name: "Real Journal", issn_l: "0000-0002", issns: ["0000-0002"], publisher: "P1", works_count: 10, tags: [] },
  ]);
  assert.equal(findMatches(idx, "zzzq nonexistent xyz").tier, "none");
});

test("non-Latin titles are findable by their own title", () => {
  const idx = buildMatchIndex([
    { name: "Έρευνα στην Εκπαίδευση", issn_l: "0000-0003", issns: ["0000-0003"], publisher: "P1", works_count: 10, tags: [] },
  ]);
  assert.equal(findMatches(idx, "Έρευνα στην Εκπαίδευση").tier, "title");
});
