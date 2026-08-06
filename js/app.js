import { fetchVendorRows } from "./csv.js";
import { buildVendors, buildMapPoints } from "./vendors.js";
import { initMap, addVendorMarkers } from "./map.js";
import { addSoldierFieldOverlay } from "./soldier-field.js";
import { initOffscreenBadges } from "./offscreen-badges.js";
import { initPanel } from "./panel.js";
import { initMobileSheet } from "./mobile-sheet.js";

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

async function main() {
  initPanel();
  initMobileSheet();
  const map = initMap(config);

  try {
    setStatus("Loading partner info...");
    const rows = await fetchVendorRows(config.CSV_URL);
    const vendors = buildVendors(rows);
    const points = buildMapPoints(vendors);

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
