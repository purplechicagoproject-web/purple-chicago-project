import { fetchVendorRows } from "./csv.js";
import { buildSpots } from "./pilgrimage-data.js";
import { initMap, addSpotMarkers } from "./pilgrimage-map.js";
import { initPanel } from "./pilgrimage-panel.js";
import { initMobileSheet } from "./pilgrimage-mobile-sheet.js";
import { initWelcomePopup } from "./welcome-popup.js";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQylaZwldd8KohFXnT0ASwF4HLe6vE3RnvqqxwU-XQ7_J186xRfG_WxfF3yYJCB6lbUPshzccWao9yZ/pub?gid=0&single=true&output=csv";

const LEGEND = [
  { color: "#E74C3C", label: "2022 Lollapalooza" },
  { color: "#2ECC71", label: "2023 SUGA Solo D-DAY Tour" },
  { color: "#FF6B9D", label: "2019 Love Yourself: Speak Yourself Tour" },
  { color: "#9B59B6", label: "2018 Love Yourself World Tour" },
  { color: "#3498DB", label: "2017 Wings Tour" },
  { color: "#F1C40F", label: "BTS NOW3: Dreaming Days" },
];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function showWelcomePopup() {
  const legendItems = LEGEND.map(
    (g) => `<li><span class="welcome-popup__swatch" style="background:${g.color}"></span>${escapeHtml(g.label)}</li>`
  ).join("");

  initWelcomePopup({
    storageKey: "pchip_welcome_pilgrimage",
    bodyHtml: `
      <h2 class="welcome-popup__title">Follow BTS's footsteps in Chicago!</h2>
      <p class="welcome-popup__body">Tap a pin for details. Pin colors show which visit each spot is from.</p>
      <ul class="welcome-popup__legend">${legendItems}</ul>
    `,
  });
}

const statusEl = document.getElementById("map-status");

function setStatus(text) {
  if (text) {
    statusEl.hidden = false;
    statusEl.textContent = text;
  } else {
    statusEl.hidden = true;
  }
}

async function main() {
  initPanel();
  initMobileSheet();
  const map = initMap();
  showWelcomePopup();

  try {
    setStatus("Loading pilgrimage spots...");
    const rows = await fetchVendorRows(CSV_URL);
    const spots = buildSpots(rows);
    await addSpotMarkers(map, spots);
    setStatus(null);
  } catch (err) {
    console.error(err);
    setStatus("Couldn't load pilgrimage spots. Please try again shortly.");
  }
}

main();
