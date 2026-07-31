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
  assert.equal(r.publisher.name, "Tiny Society Press");
  assert.equal(r.ta.covered, false);
});

import { buildPublisherLookup } from "../../html/js/resolve.js";

test("aliases resolve a second OpenAlex id to the same curated publisher", () => {
  // Springer Nature journals carry two host_organization ids; without aliasing,
  // ~900 of them render "not yet curated" under their own publisher's name.
  const pubs = { P1: { ...PUBLISHERS.P1, aliases: ["P99"] } };
  const lookup = buildPublisherLookup(pubs);
  const j = { ...JOURNALS[0], publisher: "P99" };
  const r = resolveCard(j, lookup, TA_SET);
  assert.equal(r.kind, "curated");
  assert.equal(r.publisher.name, "Wiley");
});

test("lookup still falls back for a genuinely uncurated publisher", () => {
  const lookup = buildPublisherLookup(PUBLISHERS);
  assert.equal(resolveCard(JOURNALS[1], lookup, TA_SET).kind, "fallback");
});

test("fallback card links the publisher homepage when OpenAlex has one", () => {
  const lookup = buildPublisherLookup(PUBLISHERS);
  const r = resolveCard(JOURNALS[1], lookup, TA_SET, { P9: "https://tiny.example.org" });
  assert.equal(r.publisher.homepage, "https://tiny.example.org");
});

test("fallback homepage is null when unknown, never invented", () => {
  const lookup = buildPublisherLookup(PUBLISHERS);
  assert.equal(resolveCard(JOURNALS[1], lookup, TA_SET, {}).publisher.homepage, null);
});
