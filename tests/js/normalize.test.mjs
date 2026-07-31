import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeTitle, normalizeIssn, isIssn } from "../../html/js/normalize.js";

test("normalizeTitle lowercases, strips article and punctuation", () => {
  assert.equal(normalizeTitle("The Journal of Widget-Science!"), "journal of widget science");
  assert.equal(normalizeTitle("Études Économiques"), "etudes economiques");
});

test("normalizeIssn reformats and validates", () => {
  assert.equal(normalizeIssn("15437221"), "1543-7221");
  assert.equal(normalizeIssn("1543-722x"), "1543-722X");
  assert.equal(normalizeIssn("nope"), null);
});

test("isIssn", () => {
  assert.equal(isIssn("1543-7221"), true);
  assert.equal(isIssn("Journal of X"), false);
});

test("normalizeTitle preserves non-Latin scripts (Greek/Cyrillic/CJK)", () => {
  // A Latin-only character class would erase these to "", making the journals
  // unsearchable and turning the empty key into a match-everything wildcard.
  assert.notEqual(normalizeTitle("Έρευνα στην Εκπαίδευση"), "");
  assert.notEqual(normalizeTitle("Вопросы философии"), "");
  assert.notEqual(normalizeTitle("日本物理学会誌"), "");
});

test("normalizeTitle still collapses punctuation-only titles to empty", () => {
  assert.equal(normalizeTitle("--- !!! ---"), "");
});
