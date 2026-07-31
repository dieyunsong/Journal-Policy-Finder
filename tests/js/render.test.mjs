import { test } from "node:test";
import assert from "node:assert/strict";
import { renderCard, escapeHtml } from "../../html/js/render.js";
import { JOURNALS, PUBLISHERS, TA_SET } from "./fixtures.mjs";
import { resolveCard } from "../../html/js/resolve.js";

test("escapeHtml neutralizes markup", () => {
  assert.equal(escapeHtml('<b>&"'), "&lt;b&gt;&amp;&quot;");
});

test("curated card shows policy links, verified date, and TA badge", () => {
  const html = renderCard(resolveCard(JOURNALS[0], PUBLISHERS, TA_SET));
  assert.ok(html.includes("authors.wiley.com/self-archiving"));
  assert.ok(html.includes("2026-07-30"));
  assert.match(html, /transformative agreement/i);
});

test("fallback card shows the not-curated flag and Sherpa link", () => {
  const html = renderCard(resolveCard(JOURNALS[1], PUBLISHERS, TA_SET));
  assert.match(html, /not yet curated/i);
  assert.ok(html.includes("sherpa.ac.uk"));
});
