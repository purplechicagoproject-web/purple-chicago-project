import { geocodeAddress } from "./geocode-client.js";

// Soldier Field's real-world footprint, in meters. Anchoring the icon to
// actual ground coordinates (via L.imageOverlay) is what makes it grow/shrink
// with zoom exactly like a real map feature, instead of a fixed-pixel marker.
const FOOTPRINT_WIDTH_M = 300;
const IMAGE_ASPECT = 1744 / 1281; // width / height of soldier-field.png

function metersToLatLngBounds(centerLat, centerLon, widthM, heightM) {
  const metersPerDegLat = 111320;
  const metersPerDegLon = 111320 * Math.cos((centerLat * Math.PI) / 180);

  const dLat = heightM / 2 / metersPerDegLat;
  const dLon = widthM / 2 / metersPerDegLon;

  return [
    [centerLat - dLat, centerLon - dLon],
    [centerLat + dLat, centerLon + dLon],
  ];
}

export async function addSoldierFieldOverlay(map, config) {
  const geo = await geocodeAddress(config.SOLDIER_FIELD.address);
  if (!geo) {
    console.warn("[PChiP map] Could not geocode Soldier Field; skipping venue icon.");
    return null;
  }

  const heightM = FOOTPRINT_WIDTH_M / IMAGE_ASPECT;
  const bounds = metersToLatLngBounds(geo.lat, geo.lon, FOOTPRINT_WIDTH_M, heightM);

  const overlay = L.imageOverlay("/images/site/soldier-field.png", bounds, {
    interactive: false,
    zIndex: 350,
    alt: config.SOLDIER_FIELD.name,
  });
  overlay.addTo(map);
  return overlay;
}
