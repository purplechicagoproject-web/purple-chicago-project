import { renderSpotDetailHTML } from "./pilgrimage-content.js";

// Fully independent of the map, like map.js's mobile-sheet counterpart:
// opening/closing this must never pan/zoom the map.
const sheetEl = document.getElementById("mobile-sheet");
const contentEl = document.getElementById("mobile-sheet-content");
const closeBtn = document.getElementById("mobile-sheet-close");
const backdropEl = document.getElementById("panel-backdrop");

function onKeydown(e) {
  if (!sheetEl.classList.contains("is-open")) return;
  if (e.key === "Escape") closeSheet();
}

export function openMobileSheet(spot) {
  contentEl.innerHTML = renderSpotDetailHTML(spot);

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
