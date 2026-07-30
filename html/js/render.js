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
      <li>${link(p.sherpa, "Look up self-archiving policy (Sherpa Romeo)")}</li>
      <li>${link(p.doaj, "Look up in DOAJ")}</li>
    </ul>
  </div>`;
}

export function renderDisambiguation(matches) {
  const items = matches.map((m) =>
    `<li><button class="disambig" data-issn="${escapeHtml(m.issn_l)}">${escapeHtml(m.name)}</button></li>`).join("");
  return `<p>Did you mean:</p><ul class="disambig-list">${items}</ul>`;
}

export function renderList(journals, publishers) {
  if (!journals.length) return `<p>No journals match those filters.</p>`;
  const rows = journals.map((j) => {
    const pubName = (publishers[j.publisher] && publishers[j.publisher].name) || j.publisher_name || "";
    return `<li><button class="result" data-issn="${escapeHtml(j.issn_l)}">${escapeHtml(j.name)}</button>
      <span class="pub">${escapeHtml(pubName)}</span></li>`;
  }).join("");
  return `<ul class="result-list">${rows}</ul>`;
}
