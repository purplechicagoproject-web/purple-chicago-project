import { fetchVendorRows } from "./csv.js";
import { buildVendors, buildMapPoints } from "./vendors.js";
import { initMap, addVendorMarkers } from "./map.js";
import { addSoldierFieldOverlay } from "./soldier-field.js";
import { initOffscreenBadges } from "./offscreen-badges.js";
import { initPanel, openPanelWithList } from "./panel.js";
import { initMobileSheet } from "./mobile-sheet.js";
import { initWelcomePopup } from "./welcome-popup.js";
import { isMobileViewport } from "./device.js";

const statusEl = document.getElementById("map-status");
const config = window.PCHIP_CONFIG;

function setStatus(text) {
  if (text) {
    statusEl.hidden = false;
    statusEl.textContent = text;
  } else {
    statusEl.hidden = true;
  }
}

function showWelcomePopup() {
  initWelcomePopup({
    storageKey: "pchip_welcome_map",
    bodyHtml: `
      <h2 class="welcome-popup__title">Welcome to Chicago, ARMY!</h2>
      <p class="welcome-popup__subtitle">Let's celebrate Chicago like a festival!</p>
      <p class="welcome-popup__body">Tap a pin to open its detail page.</p>
    `,
  });
}

async function main() {
  initPanel();
  initMobileSheet();
  const map = initMap(config);
  showWelcomePopup();

  try {
    setStatus("Loading partner info...");
    const rows = await fetchVendorRows(config.CSV_URL);
    const vendors = buildVendors(rows);
    const points = buildMapPoints(vendors);

    // Desktop only — mobile keeps the existing tap-a-pin-only flow, no list
    // view at all. Shown before markers/geocoding finish since the list
    // doesn't depend on either.
    if (!isMobileViewport(config)) {
      openPanelWithList(points);
    }

    const [entries] = await Promise.all([
      addVendorMarkers(map, points, config),
      addSoldierFieldOverlay(map, config),
    ]);

    initOffscreenBadges(map, entries, config);

    setStatus(null);
  } catch (err) {
    console.error(err);
    setStatus("Couldn't load partner info. Please try again shortly.");
  }
}

main();
