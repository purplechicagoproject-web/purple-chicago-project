import { renderSpotDetailHTML } from "./pilgrimage-content.js";

const panelEl = document.getElementById("detail-panel");
const contentEl = document.getElementById("detail-panel-content");
const closeBtn = document.getElementById("detail-panel-close");
const backdropEl = document.getElementById("panel-backdrop");

function onKeydown(e) {
  if (!panelEl.classList.contains("is-open")) return;
  if (e.key === "Escape") closePanel();
}

export function openPanelForSpot(spot) {
  contentEl.innerHTML = renderSpotDetailHTML(spot);

  contentEl.scrollTop = 0;
  panelEl.classList.add("is-open");
  panelEl.setAttribute("aria-hidden", "false");
  backdropEl.classList.add("is-visible");
}

export function closePanel() {
  panelEl.classList.remove("is-open");
  panelEl.setAttribute("aria-hidden", "true");
  backdropEl.classList.remove("is-visible");
}

export function isPanelOpen() {
  return panelEl.classList.contains("is-open");
}

export function initPanel() {
  closeBtn.addEventListener("click", closePanel);
  backdropEl.addEventListener("click", closePanel);
  document.addEventListener("keydown", onKeydown);
}
