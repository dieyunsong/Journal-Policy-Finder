import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDisciplineOptions, topicLabels } from "../../html/js/discipline-options.js";

const TAX = {
  areas: {
    "zed-area": { label: "Zed Area", subcategories: { t1: "Topic One", dead: "Dead Topic" } },
    "alpha-area": { label: "Alpha Area", subcategories: { t2: "Topic Two", t3: "Topic Three" } },
    "empty-area": { label: "Empty Area", subcategories: { gone: "Gone" } },
  },
  tag_list: ["zed-area/t1", "alpha-area/t2", "alpha-area/t3", "zed-area/dead", "empty-area/gone"],
  tag_counts: { 0: 500, 1: 10, 2: 900 }, // ids 3 and 4 have no journals
};

test("drops topics no journal carries", () => {
  const g = buildDisciplineOptions(TAX);
  const zed = g.find((x) => x.areaId === "zed-area");
  assert.deepEqual(zed.topics.map((t) => t.label), ["Topic One"]);
});

test("drops an area left with no live topics", () => {
  assert.equal(buildDisciplineOptions(TAX).some((g) => g.areaId === "empty-area"), false);
});

test("areas sort alphabetically, topics by journal count", () => {
  const g = buildDisciplineOptions(TAX);
  assert.deepEqual(g.map((x) => x.areaLabel), ["Alpha Area", "Zed Area"]);
  assert.deepEqual(g[0].topics.map((t) => t.label), ["Topic Three", "Topic Two"]);
});

test("topics carry their id and count for the pills and UI", () => {
  const g = buildDisciplineOptions(TAX);
  assert.deepEqual(g[0].topics[0], { id: 2, label: "Topic Three", count: 900 });
});

test("topicLabels maps tag id back to its label", () => {
  assert.equal(topicLabels(buildDisciplineOptions(TAX)).get(0), "Topic One");
});

test("empty taxonomy yields no groups", () => {
  assert.deepEqual(buildDisciplineOptions({}), []);
});
