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
    <p class="flag">This publisher is not yet curated — confirm policy on the publisher's site.</p>
    <ul class="policy-links">
      ${p.homepage ? `<li>${link(p.homepage, "Publisher website")}</li>` : ""}
      <li>${link(p.sherpa, "Look up self-archiving policy (Sherpa Romeo)")}</li>
      <li>${link(p.doaj, "Look up in DOAJ")}</li>
    </ul>
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

export function renderList(journals, publishers, total = null) {
  if (!journals.length) return `<p>No journals match those filters.</p>`;
  const rows = journals.map((j) =>
    `<li><button class="result" data-issn="${escapeHtml(j.issn_l)}">${escapeHtml(j.name)}</button>
      <span class="pub">${escapeHtml(publisherName(j, publishers))}</span></li>`
  ).join("");
  const note = total !== null && total > journals.length
    ? `<p class="result-count">Showing the ${journals.length} largest of ${total} matching journals — add a discipline to narrow it down.</p>`
    : `<p class="result-count">${journals.length} journal${journals.length === 1 ? "" : "s"}</p>`;
  return `${note}<ul class="result-list">${rows}</ul>`;
}
