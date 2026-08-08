import { geocodeAddress } from "./geocode-client.js";
import { openPanelForSpot } from "./pilgrimage-panel.js";
import { openMobileSheet } from "./pilgrimage-mobile-sheet.js";
import { isMobileViewport } from "./device.js";
import { FALLBACK_COORDS } from "./pilgrimage-data.js";

const MOBILE_MAX_WIDTH = 860;

// Recolors the shared map-pin.png per group using its alpha channel as a
// CSS mask — an exact hex match per pin, with a single source image
// instead of one pin asset per color.
const pinIconCache = new Map();

function pinIcon(hexColor) {
  if (!pinIconCache.has(hexColor)) {
    pinIconCache.set(
      hexColor,
      L.divIcon({
        className: "pilgrimage-pin",
        html: `<div class="pilgrimage-pin__shape" style="background-color:${hexColor};"></div>`,
        iconSize: [34, 49],
        iconAnchor: [17, 49],
      })
    );
  }
  return pinIconCache.get(hexColor);
}

export function initMap() {
  const map = L.map("map", {
    center: [41.8827, -87.6298],
    zoom: 12,
    zoomControl: false,
    scrollWheelZoom: true,
    tap: true,
  });

  L.control.zoom({ position: "bottomright" }).addTo(map);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  return map;
}

function openSpotDetail(spot) {
  if (isMobileViewport({ MOBILE_MAX_WIDTH })) {
    openMobileSheet(spot);
  } else {
    openPanelForSpot(spot);
  }
}

export async function addSpotMarkers(map, spots) {
  const entries = [];

  await Promise.all(
    spots.map(async (spot) => {
      let latlng;
      if (spot.address) {
        const geo = await geocodeAddress(spot.address);
        if (!geo) {
          console.warn(`[Pilgrimage map] Could not geocode "${spot.name}" ("${spot.address}") — using fallback coordinates.`);
          latlng = L.latLng(FALLBACK_COORDS.lat, FALLBACK_COORDS.lon);
        } else {
          latlng = L.latLng(geo.lat, geo.lon);
        }
      } else {
        latlng = L.latLng(FALLBACK_COORDS.lat, FALLBACK_COORDS.lon);
      }

      const marker = L.marker(latlng, { icon: pinIcon(spot.color) });
      marker.on("click", () => openSpotDetail(spot));
      marker.addTo(map);
      entries.push({ spot, marker, latlng });
    })
  );

  return entries;
}
