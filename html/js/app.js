import { buildMatchIndex, findMatches } from "./match.js";
import { resolveCard, buildPublisherLookup } from "./resolve.js";
import { filterJournals } from "./filter.js";
import { renderCard, renderDisambiguation, renderList, escapeHtml } from "./render.js";
import { isIssn } from "./normalize.js";
import { buildDisciplineOptions } from "./discipline-options.js";
import { createDisciplinePicker } from "./discipline-picker.js";

const MAX_TAGS = 3;
const state = { ready: false, mode: "title" };

const el = (id) => document.getElementById(id);
const resultsEl = () => el("results");
const setStatus = (html) => (resultsEl().innerHTML = html);

const EMPTY_STATE = `<p class="status intro">
  Enter a journal to see its publisher's open-access, embargo, sharing, and APC policies —
  or browse by discipline to find candidate journals.
  Journals covered by a Northwestern agreement are flagged; see
  <a href="https://dieyunsong.github.io/TA-Finder/" target="_blank" rel="noopener">TA-Finder</a>
  for the waiver and discount details.</p>`;

async function boot() {
  setStatus(`<p class="status loading">Loading the journal index…</p>`);
  el("search-submit").disabled = true;

  let data;
  try {
    data = await Promise.all(
      ["journals-index", "publishers", "ta-agreements", "taxonomy"].map((n) =>
        fetch(`data/${n}.json`).then((r) => {
          if (!r.ok) throw new Error(`${n}.json: HTTP ${r.status}`);
          return r.json();
        })
      )
    );
  } catch (err) {
    setStatus(
      `<p class="status error">Could not load the journal data (${escapeHtml(err.message)}).
       Check your connection and reload the page.</p>`
    );
    return;
  }

  const [journals, publishers, ta, taxonomy] = data;
  state.journals = journals;
  state.publishers = buildPublisherLookup(publishers);
  state.taSet = new Set(Object.keys(ta));
  state.homepages = taxonomy.publisher_homepages || {};
  state.index = buildMatchIndex(journals);
  state.picker = createDisciplinePicker(el("discipline-picker"), buildDisciplineOptions(taxonomy), {
    max: MAX_TAGS,
  });
  state.ready = true;

  wireModes();
  wireSearch();
  el("search-submit").disabled = false;
  setStatus(EMPTY_STATE);
}

function wireModes() {
  for (const input of document.querySelectorAll("input[name=mode]")) {
    input.addEventListener("change", () => {
      state.mode = input.value;
      el("title-field").hidden = state.mode !== "title";
      el("discipline-field").hidden = state.mode !== "discipline";
      setStatus(EMPTY_STATE);
      const focusTarget =
        state.mode === "title" ? el("q") : el("discipline-picker").querySelector(".picker-open");
      if (focusTarget) focusTarget.focus();
    });
  }
}

function showJournalByIssn(issnl) {
  const j = state.journals.find((x) => x.issn_l === issnl);
  if (j) {
    resultsEl().innerHTML = renderCard(
      resolveCard(j, state.publishers, state.taSet, state.homepages)
    );
  }
}

function bindResultButtons(sel) {
  document
    .querySelectorAll(sel)
    .forEach((b) => b.addEventListener("click", () => showJournalByIssn(b.dataset.issn)));
}

function runTitleSearch() {
  const raw = el("q").value;
  if (!raw.trim()) {
    setStatus(`<p class="status">Type a journal title or ISSN to begin.</p>`);
    return;
  }
  const { tier, matches } = findMatches(state.index, raw);
  if (tier === "none") {
    setStatus(
      isIssn(raw)
        ? `<p class="status">No journal in the index has ISSN <strong>${escapeHtml(raw.trim())}</strong>. It may be too new, or below the 25-article threshold.</p>`
        : `<p class="status">No journal found for “${escapeHtml(raw.trim())}”. Try the ISSN, or check the spelling.</p>`
    );
    return;
  }
  if (tier === "issn" || (tier === "title" && matches.length === 1)) {
    resultsEl().innerHTML = renderCard(
      resolveCard(matches[0], state.publishers, state.taSet, state.homepages)
    );
    return;
  }
  resultsEl().innerHTML = renderDisambiguation(
    matches,
    state.publishers,
    tier === "fuzzy" ? "No exact match. Closest matches:" : "Did you mean:"
  );
  bindResultButtons(".disambig");
}

function runDisciplineSearch() {
  const tags = state.picker.getSelected();
  const taOnly = el("ta-only").checked;
  if (!tags.length && !taOnly) {
    setStatus(
      `<p class="status">Pick at least one discipline or topic — or tick the Northwestern agreement filter.</p>`
    );
    return;
  }
  const { items, total } = filterJournals(state.journals, tags, taOnly, state.taSet);
  resultsEl().innerHTML = renderList(items, state.publishers, total);
  bindResultButtons(".result");
}

function wireSearch() {
  el("search").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.ready) return;
    if (state.mode === "title") runTitleSearch();
    else runDisciplineSearch();
  });
}

boot();
