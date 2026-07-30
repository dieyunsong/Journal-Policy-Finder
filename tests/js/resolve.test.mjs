import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCard } from "../../html/js/resolve.js";
import { JOURNALS, PUBLISHERS, TA_SET } from "./fixtures.mjs";

test("curated publisher with TA coverage", () => {
  const r = resolveCard(JOURNALS[0], PUBLISHERS, TA_SET);
  assert.equal(r.kind, "curated");
  assert.equal(r.publisher.name, "Wiley");
  assert.equal(r.ta.covered, true);
});

test("uncurated publisher falls back with link-outs and no TA", () => {
  const r = resolveCard(JOURNALS[1], PUBLISHERS, TA_SET);
  assert.equal(r.kind, "fallback");
  assert.ok(r.publisher.sherpa.includes("5555-6666"));
  assert.ok(r.publisher.doaj.includes("5555-6666"));
  assert.equal(r.ta.covered, false);
});
