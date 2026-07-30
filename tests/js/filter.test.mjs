import { test } from "node:test";
import assert from "node:assert/strict";
import { filterJournals } from "../../html/js/filter.js";
import { JOURNALS, TA_SET } from "./fixtures.mjs";

test("filters by tag OR semantics", () => {
  const out = filterJournals(JOURNALS, ["humanities-literature-arts/history"], false, TA_SET);
  assert.equal(out.length, 1);
  assert.equal(out[0].issn_l, "5555-6666");
});

test("taOnly narrows to covered journals", () => {
  const out = filterJournals(JOURNALS, ["engineering-computer-science/electrical-electronic-engineering", "humanities-literature-arts/history"], true, TA_SET);
  assert.deepEqual(out.map((j) => j.issn_l), ["1111-2222"]);
});

test("no tags returns empty", () => {
  assert.deepEqual(filterJournals(JOURNALS, [], false, TA_SET), []);
});
