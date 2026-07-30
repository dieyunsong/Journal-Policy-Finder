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
