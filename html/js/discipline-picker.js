import { escapeHtml } from "./render.js";
import { topicLabels } from "./discipline-options.js";

/**
 * Two-level discipline picker.
 *
 * Closed, it reads as a text box holding the chosen topics as removable pills.
 * Opening shows the eight broad areas; choosing one drills into its topics.
 * 172 topics in a flat list is unreadable, and it was the flat 172-checkbox
 * grid that pushed results off the screen entirely.
 *
 * Owns its own keyboard and screen-reader behaviour because a custom panel gets
 * none of it for free: Escape closes and returns focus, arrows move between
 * rows, and the trigger reports aria-expanded.
 */
export function createDisciplinePicker(container, groups, { max = 3, onChange } = {}) {
  const labels = topicLabels(groups);
  const selected = [];
  let area = null; // null = showing the area list

  container.innerHTML = `
    <div class="picker-control">
      <span class="picker-pills"></span>
      <button type="button" class="picker-open" aria-expanded="false" aria-haspopup="listbox">
        <span class="picker-open-text">Select disciplines and topics</span>
        <span class="picker-caret" aria-hidden="true">▾</span>
      </button>
    </div>
    <div class="picker-panel" hidden></div>
    <p class="picker-hint" role="status" aria-live="polite"></p>`;

  const control = container.querySelector(".picker-control");
  const pillsEl = container.querySelector(".picker-pills");
  const openBtn = container.querySelector(".picker-open");
  const openText = container.querySelector(".picker-open-text");
  const panel = container.querySelector(".picker-panel");
  const hintEl = container.querySelector(".picker-hint");

  const isOpen = () => !panel.hidden;

  function hint(msg) {
    hintEl.textContent = msg;
    if (msg) setTimeout(() => (hintEl.textContent = ""), 3000);
  }

  function renderPills() {
    pillsEl.innerHTML = selected
      .map(
        (id) =>
          `<span class="pill">${escapeHtml(labels.get(id) || "")}<button type="button"
             class="pill-x" data-id="${id}"
             aria-label="Remove ${escapeHtml(labels.get(id) || "")}">×</button></span>`
      )
      .join("");
    openText.textContent = selected.length
      ? selected.length >= max
        ? `${max} selected`
        : "Add another"
      : "Select disciplines and topics";
    control.classList.toggle("has-pills", selected.length > 0);
  }

  function renderPanel() {
    if (!area) {
      panel.innerHTML =
        `<ul class="picker-list" role="list">` +
        groups
          .map(
            (g) =>
              `<li><button type="button" class="picker-area" data-area="${escapeHtml(g.areaId)}">
                 <span>${escapeHtml(g.areaLabel)}</span>
                 <span class="picker-meta">${g.topics.length} topics ›</span>
               </button></li>`
          )
          .join("") +
        `</ul>`;
      return;
    }
    const g = groups.find((x) => x.areaId === area);
    const atMax = selected.length >= max;
    panel.innerHTML =
      `<div class="picker-crumb">
         <button type="button" class="picker-back">‹ All areas</button>
         <span class="picker-crumb-area">${escapeHtml(g.areaLabel)}</span>
       </div>
       <ul class="picker-list" role="list">` +
      g.topics
        .map((t) => {
          const on = selected.includes(t.id);
          const dis = atMax && !on;
          return `<li><label class="picker-topic${dis ? " is-disabled" : ""}">
              <input type="checkbox" value="${t.id}" ${on ? "checked" : ""} ${dis ? "disabled" : ""}>
              <span>${escapeHtml(t.label)}</span>
              <span class="picker-meta">${t.count.toLocaleString()}</span>
            </label></li>`;
        })
        .join("") +
      `</ul>`;
  }

  function open() {
    panel.hidden = false;
    openBtn.setAttribute("aria-expanded", "true");
    renderPanel();
    const first = panel.querySelector("button, input:not([disabled])");
    if (first) first.focus();
  }

  function close({ focusTrigger = false } = {}) {
    panel.hidden = true;
    openBtn.setAttribute("aria-expanded", "false");
    area = null;
    if (focusTrigger) openBtn.focus();
  }

  function toggle(id, on) {
    const i = selected.indexOf(id);
    if (on && i === -1) {
      if (selected.length >= max) {
        hint(`Up to ${max} — remove one to add another.`);
        return false;
      }
      selected.push(id);
    } else if (!on && i !== -1) {
      selected.splice(i, 1);
    }
    renderPills();
    renderPanel();
    if (onChange) onChange(getSelected());
    return true;
  }

  openBtn.addEventListener("click", () => (isOpen() ? close() : open()));

  pillsEl.addEventListener("click", (e) => {
    const x = e.target.closest(".pill-x");
    if (x) toggle(Number(x.dataset.id), false);
  });

  panel.addEventListener("click", (e) => {
    const areaBtn = e.target.closest(".picker-area");
    if (areaBtn) {
      area = areaBtn.dataset.area;
      renderPanel();
      const f = panel.querySelector(".picker-back");
      if (f) f.focus();
      return;
    }
    if (e.target.closest(".picker-back")) {
      area = null;
      renderPanel();
      const f = panel.querySelector(".picker-area");
      if (f) f.focus();
    }
  });

  panel.addEventListener("change", (e) => {
    const box = e.target.closest("input[type=checkbox]");
    if (!box) return;
    if (!toggle(Number(box.value), box.checked)) box.checked = false;
  });

  // Escape closes from anywhere inside; arrows walk the rows.
  container.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) {
      e.stopPropagation();
      close({ focusTrigger: true });
      return;
    }
    if (!isOpen() || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
    const items = [...panel.querySelectorAll("button, input:not([disabled])")];
    if (!items.length) return;
    e.preventDefault();
    const at = items.indexOf(document.activeElement);
    const next = e.key === "ArrowDown" ? at + 1 : at - 1;
    items[(next + items.length) % items.length].focus();
  });

  document.addEventListener("mousedown", (e) => {
    if (isOpen() && !container.contains(e.target)) close();
  });

  const getSelected = () => [...selected];

  renderPills();
  return {
    getSelected,
    clear() {
      selected.length = 0;
      renderPills();
      if (isOpen()) renderPanel();
    },
  };
}
