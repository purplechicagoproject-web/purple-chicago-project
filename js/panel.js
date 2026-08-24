import { renderVendorDetailHTML, wireVendorDetailInteractions } from "./vendor-content.js";
import { renderPartnerListHTML, wirePartnerListInteractions } from "./partner-list.js";

const panelEl = document.getElementById("detail-panel");
const contentEl = document.getElementById("detail-panel-content");
const closeBtn = document.getElementById("detail-panel-close");
const backdropEl = document.getElementById("panel-backdrop");
const listBtn = document.getElementById("map-list-btn");

let activeCarousel = null;

// The full partner list, set once by openPanelWithList() (desktop only —
// mobile never calls it, so this stays null there and the vendor detail
// view never grows a "Go to List" button on mobile).
let listPoints = null;

function onKeydown(e) {
  if (!panelEl.classList.contains("is-open")) return;
  if (e.key === "Escape") closePanel();
  if (e.key === "ArrowLeft") activeCarousel?.goTo(activeCarousel.index - 1);
  if (e.key === "ArrowRight") activeCarousel?.goTo(activeCarousel.index + 1);
}

function showList() {
  activeCarousel = null;
  contentEl.innerHTML = renderPartnerListHTML(listPoints || []);
  wirePartnerListInteractions(contentEl, listPoints || [], openPanelForPoint);
  contentEl.scrollTop = 0;
}

// Shared "open the panel" chrome (used whether it's opening on a vendor or
// on the list) — keeps openPanelForPoint/openPanelWithList/openPartnerList
// from drifting out of sync on the classList/aria/backdrop/event steps.
function openPanelChrome() {
  panelEl.classList.add("is-open");
  panelEl.setAttribute("aria-hidden", "false");
  backdropEl.classList.add("is-visible");
  window.dispatchEvent(new CustomEvent("pchip:panel-open"));
}

export function openPanelForPoint(point) {
  const goToListHtml = listPoints
    ? `<button type="button" class="panel-body__go-to-list" data-go-to-list>&larr; Go to List</button>`
    : "";

  contentEl.innerHTML = renderVendorDetailHTML(point, "panel") + goToListHtml;
  activeCarousel = wireVendorDetailInteractions(contentEl, point);
  contentEl.querySelector("[data-go-to-list]")?.addEventListener("click", showList);

  contentEl.scrollTop = 0;
  openPanelChrome();
}

// Desktop-only default view: the panel opens showing every partner before
// any pin has been clicked. Called once on page load (app.js) — since
// listPoints is only ever set here, the vendor detail view's "Go to List"
// button naturally has something to return to from that point on.
export function openPanelWithList(points) {
  listPoints = points;
  showList();
  openPanelChrome();
}

// Reopens the "All Partners" list on demand (the always-visible map button)
// after the panel has been closed. Only does anything once listPoints has
// been set by openPanelWithList — i.e. desktop only, same as the "Go to
// List" button inside a vendor's detail view.
export function openPartnerList() {
  if (!listPoints) return;
  showList();
  openPanelChrome();
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
  listBtn?.addEventListener("click", openPartnerList);
}
