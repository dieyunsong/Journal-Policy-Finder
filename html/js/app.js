import { buildMatchIndex, findMatches } from "./match.js";
import { resolveCard } from "./resolve.js";
import { filterJournals } from "./filter.js";
import { renderCard, renderDisambiguation, renderList } from "./render.js";

const state = {};

async function boot() {
  const [journals, publishers, ta, taxonomy] = await Promise.all(
    ["journals-index", "publishers", "ta-agreements", "taxonomy"].map((n) =>
      fetch(`data/${n}.json`).then((r) => r.json()))
  );
  state.journals = journals;
  state.publishers = publishers;
  state.taSet = new Set(Object.keys(ta));
  state.taxonomy = taxonomy;
  state.index = buildMatchIndex(journals);
  wireSearch();
  wireBrowse();
}

const resultsEl = () => document.getElementById("results");

function showJournalByIssn(issnl) {
  const j = state.journals.find((x) => x.issn_l === issnl);
  if (j) resultsEl().innerHTML = renderCard(resolveCard(j, state.publishers, state.taSet));
}

function wireSearch() {
  document.getElementById("search").addEventListener("submit", (e) => {
    e.preventDefault();
    const { tier, matches } = findMatches(state.index, document.getElementById("q").value);
    if (tier === "none") {
      resultsEl().innerHTML = "<p>No journal found. Try the ISSN.</p>";
      return;
    }
    if (tier === "issn" || (tier === "title" && matches.length === 1)) {
      resultsEl().innerHTML = renderCard(resolveCard(matches[0], state.publishers, state.taSet));
      return;
    }
    if (tier === "fuzzy") {
      resultsEl().innerHTML = `<p>No exact match. Closest matches:</p>${renderDisambiguation(matches)}`;
    } else {
      resultsEl().innerHTML = renderDisambiguation(matches);
    }
    bindResultButtons(".disambig");
  });
}

function selectedTags() {
  return [...document.querySelectorAll("#tags input:checked")].map((c) => c.value).slice(0, 3);
}

function wireBrowse() {
  const tagsEl = document.getElementById("tags");
  for (const [areaSlug, area] of Object.entries(state.taxonomy)) {
    for (const [subSlug, label] of Object.entries(area.subcategories)) {
      const id = `${areaSlug}/${subSlug}`;
      const el = document.createElement("label");
      el.className = "tag-chip";
      el.innerHTML = `<input type="checkbox" value="${id}"> ${label}`;
      tagsEl.appendChild(el);
    }
  }
  tagsEl.addEventListener("change", (e) => {
    const checked = tagsEl.querySelectorAll("#tags input:checked");
    if (checked.length > 3) e.target.checked = false;
  });
  document.getElementById("browse").addEventListener("click", () => {
    const list = filterJournals(state.journals, selectedTags(),
      document.getElementById("ta-only").checked, state.taSet);
    resultsEl().innerHTML = renderList(list, state.publishers);
    bindResultButtons(".result");
  });
}

function bindResultButtons(sel) {
  document.querySelectorAll(sel).forEach((b) =>
    b.addEventListener("click", () => showJournalByIssn(b.dataset.issn)));
}

boot();
