import { buildMatchIndex, findMatches } from "./match.js";
import { resolveCard, buildPublisherLookup } from "./resolve.js";
import { filterJournals } from "./filter.js";
import { renderCard, renderDisambiguation, renderList, escapeHtml } from "./render.js";
import { isIssn } from "./normalize.js";

const MAX_TAGS = 3;
const state = { ready: false };

const el = (id) => document.getElementById(id);
const resultsEl = () => el("results");

function setStatus(html) {
  resultsEl().innerHTML = html;
}

async function boot() {
  // The index is a couple of MB gzipped. Until it lands the controls cannot do
  // anything useful, so say so rather than looking idle-but-broken.
  setStatus(`<p class="status loading">Loading the journal index…</p>`);
  el("search-submit").disabled = true;
  el("browse").disabled = true;

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
  state.taxonomy = taxonomy;
  state.homepages = taxonomy.publisher_homepages || {};
  state.index = buildMatchIndex(journals);
  state.ready = true;

  wireSearch();
  wireBrowse();
  el("search-submit").disabled = false;
  el("browse").disabled = false;
  setStatus(`<p class="status">Ready — ${journals.length.toLocaleString()} journals indexed.</p>`);
}

function showJournalByIssn(issnl) {
  const j = state.journals.find((x) => x.issn_l === issnl);
  if (j) resultsEl().innerHTML = renderCard(resolveCard(j, state.publishers, state.taSet, state.homepages));
}

function wireSearch() {
  el("search").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.ready) return;
    const raw = el("q").value;
    if (!raw.trim()) {
      setStatus(`<p class="status">Type a journal title or ISSN to begin.</p>`);
      return;
    }
    const { tier, matches } = findMatches(state.index, raw);

    if (tier === "none") {
      // Suggesting "try the ISSN" to someone who just typed one is noise.
      setStatus(
        isIssn(raw)
          ? `<p class="status">No journal in the index has ISSN <strong>${escapeHtml(raw.trim())}</strong>. It may be too new, or below the 25-article threshold.</p>`
          : `<p class="status">No journal found for “${escapeHtml(raw.trim())}”. Try the ISSN, or check the spelling.</p>`
      );
      return;
    }
    if (tier === "issn" || (tier === "title" && matches.length === 1)) {
      resultsEl().innerHTML = renderCard(resolveCard(matches[0], state.publishers, state.taSet, state.homepages));
      return;
    }
    resultsEl().innerHTML = renderDisambiguation(
      matches,
      state.publishers,
      tier === "fuzzy" ? "No exact match. Closest matches:" : "Did you mean:"
    );
    bindResultButtons(".disambig");
  });
}

function selectedTags() {
  return [...document.querySelectorAll("#tags input:checked")]
    .map((c) => Number(c.value))
    .slice(0, MAX_TAGS);
}

function wireBrowse() {
  const tagsEl = el("tags");
  const { areas, tag_list: tagList, tag_counts: tagCounts } = state.taxonomy;
  const idOf = new Map(tagList.map((slug, i) => [slug, i]));

  // Only render chips that actually match journals: 127 of 299 taxonomy
  // subcategories have no journals, and 41 labels are duplicated across areas,
  // so a flat list produced identical chips where one worked and one silently
  // returned nothing. Grouping under the area heading disambiguates them.
  for (const [areaSlug, area] of Object.entries(areas)) {
    const live = Object.entries(area.subcategories)
      .map(([subSlug, label]) => ({ label, id: idOf.get(`${areaSlug}/${subSlug}`) }))
      .filter((c) => c.id !== undefined && tagCounts[String(c.id)])
      .sort((a, b) => a.label.localeCompare(b.label));
    if (!live.length) continue;

    const group = document.createElement("fieldset");
    group.className = "tag-group";
    group.innerHTML =
      `<legend>${area.label}</legend>` +
      live
        .map(
          (c) =>
            `<label class="tag-chip"><input type="checkbox" value="${c.id}"> ${c.label}
             <span class="tag-count">${tagCounts[String(c.id)].toLocaleString()}</span></label>`
        )
        .join("");
    tagsEl.appendChild(group);
  }

  tagsEl.addEventListener("change", (e) => {
    const checked = tagsEl.querySelectorAll("input:checked");
    if (checked.length > MAX_TAGS) {
      e.target.checked = false;
      const hint = el("tag-hint");
      if (hint) {
        hint.textContent = `Pick up to ${MAX_TAGS} disciplines.`;
        setTimeout(() => (hint.textContent = ""), 2500);
      }
    }
  });

  el("browse").addEventListener("click", () => {
    if (!state.ready) return;
    const tags = selectedTags();
    const taOnly = el("ta-only").checked;
    if (!tags.length && !taOnly) {
      setStatus(`<p class="status">Pick at least one discipline (or tick “Only journals under a Northwestern agreement”).</p>`);
      return;
    }
    const { items, total } = filterJournals(state.journals, tags, taOnly, state.taSet);
    resultsEl().innerHTML = renderList(items, state.publishers, total);
    bindResultButtons(".result");
  });
}

function bindResultButtons(sel) {
  document.querySelectorAll(sel).forEach((b) =>
    b.addEventListener("click", () => showJournalByIssn(b.dataset.issn))
  );
}

boot();
