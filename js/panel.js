import { renderVendorDetailHTML, wireVendorDetailInteractions } from "./vendor-content.js";

const panelEl = document.getElementById("detail-panel");
const contentEl = document.getElementById("detail-panel-content");
const closeBtn = document.getElementById("detail-panel-close");
const backdropEl = document.getElementById("panel-backdrop");

let activeCarousel = null;

function onKeydown(e) {
  if (!panelEl.classList.contains("is-open")) return;
  if (e.key === "Escape") closePanel();
  if (e.key === "ArrowLeft") activeCarousel?.goTo(activeCarousel.index - 1);
  if (e.key === "ArrowRight") activeCarousel?.goTo(activeCarousel.index + 1);
}

export function openPanelForPoint(point) {
  contentEl.innerHTML = renderVendorDetailHTML(point, "panel");
  activeCarousel = wireVendorDetailInteractions(contentEl, point);

  contentEl.scrollTop = 0;
  panelEl.classList.add("is-open");
  panelEl.setAttribute("aria-hidden", "false");
  backdropEl.classList.add("is-visible");
  window.dispatchEvent(new CustomEvent("pchip:panel-open"));
}

export function closePanel() {
  panelEl.classList.remove("is-open");
  panelEl.setAttribute("aria-hidden", "true");
  backdropEl.classList.remove("is-visible");
  window.dispatchEvent(new CustomEvent("pchip:panel-close"));
}

export function isPanelOpen() {
  return panelEl.classList.contains("is-open");
}

export function initPanel() {
  closeBtn.addEventListener("click", closePanel);
  backdropEl.addEventListener("click", closePanel);
  document.addEventListener("keydown", onKeydown);
}
