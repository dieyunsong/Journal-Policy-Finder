export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function link(url, label) {
  return url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>` : "";
}

function taBadge(ta) {
  return ta.covered
    ? `<div class="ta-badge">✓ Northwestern has a transformative agreement covering this journal — see <a href="https://dieyunsong.github.io/TA-Finder/" target="_blank" rel="noopener">TA-Finder</a> for waiver/discount details.</div>`
    : "";
}

export function renderCard(vm) {
  const j = vm.journal;
  const head = `<h2>${escapeHtml(j.name)}</h2><p class="issn">ISSN ${escapeHtml(j.issn_l)}</p>`;
  if (vm.kind === "curated") {
    const p = vm.publisher;
    return `<div class="card curated">${head}
      <p class="publisher">Publisher: <strong>${escapeHtml(p.name)}</strong></p>
      ${taBadge(vm.ta)}
      <ul class="policy-links">
        <li>${link(p.homepage, "Publisher website")}</li>
        <li>${link(p.oa_options, "Open access options")}</li>
        <li>${link(p.embargo_sharing, "Embargo & sharing policy")}</li>
        <li>${link(p.apc, "APC information")}</li>
      </ul>
      <p class="note">${escapeHtml(p.note)}</p>
      <p class="verified">Links verified ${escapeHtml(p.verified)}. Always confirm current terms on the publisher page.</p>
    </div>`;
  }
  const p = vm.publisher;
  return `<div class="card fallback">${head}
    <p class="publisher">Publisher: <strong>${escapeHtml(p.name)}</strong></p>
    ${taBadge(vm.ta)}
    <p class="flag">We haven't compiled this publisher's policies yet. Check their site for
      open-access options, embargo and sharing rules, and article processing charges.</p>
    ${p.homepage ? `<ul class="policy-links"><li>${link(p.homepage, "Publisher website")}</li></ul>` : ""}
  </div>`;
}

function publisherName(journal, publishers) {
  const p = publishers instanceof Map
    ? publishers.get(journal.publisher)
    : publishers && publishers[journal.publisher];
  return (p && p.name) || journal.publisher_name || "";
}

/** 575 journals share an exact display name with another (Clinical Science
 *  appears five times), so the title alone cannot identify a choice. Show the
 *  publisher and ISSN too. */
export function renderDisambiguation(matches, publishers, heading = "Did you mean:") {
  const items = matches.map((m) =>
    `<li><button class="disambig" data-issn="${escapeHtml(m.issn_l)}">${escapeHtml(m.name)}</button>
      <span class="meta">${escapeHtml(publisherName(m, publishers))} · ISSN ${escapeHtml(m.issn_l)}</span></li>`
  ).join("");
  return `<p>${escapeHtml(heading)}</p><ul class="disambig-list">${items}</ul>`;
}

/** Compact agreement marker for list rows — the full explanation lives on the card. */
function taCheck(covered) {
  return covered
    ? `<span class="ta-check" title="Covered by a Northwestern Open Access and Transformative Agreement"
         aria-label="Covered by a Northwestern agreement">✓</span>`
    : "";
}

export function renderList(journals, publishers, total = null, taSet = null) {
  if (!journals.length) return `<p>No journals match those filters.</p>`;
  const rows = journals.map((j) =>
    `<li>${taCheck(taSet ? taSet.has(j.issn_l) : false)}<button class="result" data-issn="${escapeHtml(j.issn_l)}">${escapeHtml(j.name)}</button>
      <span class="pub">${escapeHtml(publisherName(j, publishers))}</span></li>`
  ).join("");
  // Say how the list is ordered and how many carry an agreement, because with
  // agreement-first ranking a truncated view can be entirely covered journals —
  // the uncovered ones are still in `total`, just below the cut.
  const covered = taSet ? journals.filter((j) => taSet.has(j.issn_l)).length : 0;
  const coveredNote = taSet
    ? ` <span class="ta-note">✓ ${covered} under a Northwestern agreement, listed first.</span>`
    : "";
  const note = total !== null && total > journals.length
    ? `<p class="result-count">Showing ${journals.length} of ${total.toLocaleString()} matching journals.${coveredNote}</p>`
    : `<p class="result-count">${journals.length} journal${journals.length === 1 ? "" : "s"}.${coveredNote}</p>`;
  return `${note}<ul class="result-list">${rows}</ul>`;
}
