import { test } from "node:test";
import assert from "node:assert/strict";
import { filterJournals } from "../../html/js/filter.js";
import { TA_SET } from "./fixtures.mjs";

// Tags are interned integer ids at build time (see scripts/build.py).
const JOURNALS = [
  { name: "Widget Science", issn_l: "1111-2222", issns: ["1111-2222"], publisher: "P1", publisher_name: "Wiley", works_count: 1200, tags: [0, 5] },
  { name: "Regional Review", issn_l: "5555-6666", issns: ["5555-6666"], publisher: "P9", publisher_name: "Tiny", works_count: 80, tags: [1] },
];

test("filters by tag OR semantics", () => {
  const { items, total } = filterJournals(JOURNALS, [1], false, TA_SET);
  assert.equal(total, 1);
  assert.equal(items[0].issn_l, "5555-6666");
});

test("taOnly narrows to covered journals", () => {
  const { items } = filterJournals(JOURNALS, [0, 1], true, TA_SET);
  assert.deepEqual(items.map((j) => j.issn_l), ["1111-2222"]);
});

test("no tags and no taOnly returns empty", () => {
  assert.deepEqual(filterJournals(JOURNALS, [], false, TA_SET), { items: [], total: 0 });
});

test("taOnly alone lists every covered journal", () => {
  const { items } = filterJournals(JOURNALS, [], true, TA_SET);
  assert.deepEqual(items.map((j) => j.issn_l), ["1111-2222"]);
});

test("total reports the full match count even when truncated", () => {
  const many = Array.from({ length: 250 }, (_, i) => ({
    name: `J${i}`, issn_l: `0000-${String(i).padStart(4, "0")}`, issns: [], publisher: "P1",
    works_count: i, tags: [0],
  }));
  const { items, total } = filterJournals(many, [0], false, new Set());
  assert.equal(items.length, 200);
  assert.equal(total, 250);
  assert.equal(items[0].works_count, 249); // sorted desc
});
