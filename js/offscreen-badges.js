// Generic "vendors are off-screen" indicator. Replaces the old
// Naperville-only pin+dashed-line/badge hack with a system that works for
// any vendor, in any city, in any direction:
//
//   1. On every map move/zoom, check each vendor point against the current
//      viewport bounds.
//   2. Group the off-screen ones by city.
//   3. For each city group, snap the direction from the map center to the
//      group's on-screen-projected centroid to one of 8 compass buckets,
//      and render a "{City} +{count}" chip in that bucket.
//   4. Bucket positions are fixed via CSS (a "ring" of 8 slots around the
//      map), so multiple badges in one bucket simply stack — no manual
//      pixel collision math — and the bottom-right bucket is pre-offset
//      above the zoom control so the two can never collide.
//   5. While the desktop slide panel is open, badges that would sit under
//      it (west-ish buckets) are pushed right by the panel's actual width.
//   6. A city's badge disappears the moment any of its vendors re-enters
//      the viewport, and reappears the moment none of them are visible.

import { openVendorDetail } from "./map.js";

const DIRECTIONS = ["e", "se", "s", "sw", "w", "nw", "n", "ne"];

function bucketDirection(dx, dy) {
  if (dx === 0 && dy === 0) return "n";
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI; // 0=E, 90=S, 180/-180=W, -90=N
  angle = (angle + 360) % 360;
  const index = Math.round(angle / 45) % 8;
  return DIRECTIONS[index];
}

function groupByCity(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const city = entry.point.city || "Nearby";
    if (!groups.has(city)) groups.set(city, []);
    groups.get(city).push(entry);
  }
  return groups;
}

export function initOffscreenBadges(map, entries, config) {
  const stageEl = document.getElementById("map-stage");

  const ring = document.createElement("div");
  ring.className = "badge-ring";
  const slots = {};
  for (const dir of DIRECTIONS) {
    const slot = document.createElement("div");
    slot.className = `badge-slot slot-${dir}`;
    ring.appendChild(slot);
    slots[dir] = slot;
  }
  stageEl.appendChild(ring);

  function openGroup(group) {
    if (group.length === 1) {
      const { marker, point } = group[0];
      // Bring the pin into view (instantly, no animation) before showing its
      // detail — the panel/sheet itself never touches the map view.
      map.setView(marker.getLatLng(), map.getZoom(), { animate: false });
      openVendorDetail(config, point);
      return;
    }
    const bounds = L.latLngBounds(group.map((e) => e.latlng));
    map.fitBounds(bounds, { padding: [64, 64] });
  }

  function render() {
    // Padded slightly so a marker sitting right at the pixel edge of the
    // viewport doesn't flicker between "visible" and "off-screen".
    const bounds = map.getBounds().pad(0.05);
    const outOfView = entries.filter((e) => !bounds.contains(e.latlng));

    for (const dir of DIRECTIONS) {
      slots[dir].innerHTML = "";
    }

    if (outOfView.length === 0) return;

    const size = map.getSize();
    const centerPt = { x: size.x / 2, y: size.y / 2 };

    const cityGroups = groupByCity(outOfView);
    const cities = [...cityGroups.keys()].sort();

    for (const city of cities) {
      const group = cityGroups.get(city);

      let sumX = 0;
      let sumY = 0;
      for (const entry of group) {
        const pt = map.latLngToContainerPoint(entry.latlng);
        sumX += pt.x;
        sumY += pt.y;
      }
      const centroid = { x: sumX / group.length, y: sumY / group.length };
      const dir = bucketDirection(centroid.x - centerPt.x, centroid.y - centerPt.y);

      const badge = document.createElement("button");
      badge.type = "button";
      badge.className = "offscreen-badge";
      badge.innerHTML = `<span class="offscreen-badge__label">${city} +${group.length}</span>`;
      badge.addEventListener("click", () => openGroup(group));
      slots[dir].appendChild(badge);
    }
  }

  function updatePanelOffset() {
    const panel = document.getElementById("detail-panel");
    const stageRect = stageEl.getBoundingClientRect();
    const isOpen = panel.classList.contains("is-open");
    const offset = isOpen ? Math.max(0, panel.getBoundingClientRect().right - stageRect.left + 12) : 0;
    stageEl.style.setProperty("--panel-offset", `${offset}px`);
  }

  // The panel's width is only reliable to measure once its slide-in/out CSS
  // transition (see .detail-panel in main.css) has finished.
  const PANEL_TRANSITION_MS = 300;

  map.on("moveend zoomend", render);
  window.addEventListener("pchip:panel-open", () => setTimeout(updatePanelOffset, PANEL_TRANSITION_MS));
  window.addEventListener("pchip:panel-close", () => stageEl.style.setProperty("--panel-offset", "0px"));
  window.addEventListener("resize", updatePanelOffset);

  render();
  updatePanelOffset();
}
