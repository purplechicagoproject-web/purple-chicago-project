import { renderVendorDetailHTML, wireVendorDetailInteractions } from "./vendor-content.js";

// Mobile marker interaction: a bottom sheet that is completely decoupled
// from the map. Unlike a Leaflet popup, nothing here ever reads or changes
// the map's center/zoom — opening or closing this sheet cannot move the map.
const sheetEl = document.getElementById("mobile-sheet");
const contentEl = document.getElementById("mobile-sheet-content");
const closeBtn = document.getElementById("mobile-sheet-close");
const backdropEl = document.getElementById("panel-backdrop");

let activeCarousel = null;

function onKeydown(e) {
  if (!sheetEl.classList.contains("is-open")) return;
  if (e.key === "Escape") closeSheet();
  if (e.key === "ArrowLeft") activeCarousel?.goTo(activeCarousel.index - 1);
  if (e.key === "ArrowRight") activeCarousel?.goTo(activeCarousel.index + 1);
}

export function openMobileSheet(point) {
  contentEl.innerHTML = renderVendorDetailHTML(point, "sheet");
  activeCarousel = wireVendorDetailInteractions(contentEl, point);

  contentEl.scrollTop = 0;
  sheetEl.classList.add("is-open");
  sheetEl.setAttribute("aria-hidden", "false");
  backdropEl.classList.add("is-visible");
}

export function closeSheet() {
  sheetEl.classList.remove("is-open");
  sheetEl.setAttribute("aria-hidden", "true");
  backdropEl.classList.remove("is-visible");
}

export function isSheetOpen() {
  return sheetEl.classList.contains("is-open");
}

export function initMobileSheet() {
  closeBtn.addEventListener("click", closeSheet);
  backdropEl.addEventListener("click", () => {
    if (isSheetOpen()) closeSheet();
  });
  document.addEventListener("keydown", onKeydown);
}
