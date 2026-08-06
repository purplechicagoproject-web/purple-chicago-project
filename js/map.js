import { geocodeAddress } from "./geocode-client.js";
import { openPanelForPoint } from "./panel.js";
import { openMobileSheet } from "./mobile-sheet.js";
import { isMobileViewport } from "./device.js";

const vendorPinIcon = L.icon({
  iconUrl: "/images/site/map-pin.png",
  iconSize: [34, 49],
  iconAnchor: [17, 49],
  className: "vendor-pin",
});

export function initMap(config) {
  const map = L.map("map", {
    center: config.MAP_CENTER,
    zoom: config.MAP_INITIAL_ZOOM,
    zoomControl: false,
    scrollWheelZoom: true,
    tap: true, // pinch/drag on touch devices is on by default in Leaflet
  });

  L.control.zoom({ position: "bottomright" }).addTo(map);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  return map;
}

export function openVendorDetail(config, point) {
  if (isMobileViewport(config)) {
    openMobileSheet(point);
  } else {
    openPanelForPoint(point);
  }
}

// Geocodes + drops a pin for every vendor map point. Returns the resolved
// {point, marker, latlng} entries so callers (the off-screen badge system)
// can reason about which vendors are currently visible.
export async function addVendorMarkers(map, points, config) {
  const entries = [];

  await Promise.all(
    points.map(async (point) => {
      const geo = await geocodeAddress(point.address);
      if (!geo) {
        console.warn(`[PChiP map] Skipping "${point.vendor.name}" — could not geocode "${point.address}".`);
        return;
      }
      const latlng = L.latLng(geo.lat, geo.lon);
      const marker = L.marker(latlng, { icon: vendorPinIcon });
      marker.on("click", () => openVendorDetail(config, point));
      marker.addTo(map);
      entries.push({ point, marker, latlng });
    })
  );

  return entries;
}
