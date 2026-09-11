import { parseCsv, rowsToObjects } from "./csv.js";
import { geocodeAddress } from "./geocode-client.js";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQbTSUdat8qkFpjmli-WSPEMNa93h23b8vuhczV0mmWwjDoplbeWNQ0CYyyDFG85hvrXbwTZNfRcmMN/pub?gid=219261712&single=true&output=csv";

// Suburb/airport hotels are still plotted, just excluded from the initial
// fitBounds so the map opens framed on downtown (where the vast majority
// of responses are) instead of zoomed out to fit O'Hare/Naperville too.
const SUBURB_DISTRICT = "교외/공항";

const MIN_RADIUS = 6;
const MAX_RADIUS = 26;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseRows(rows) {
  return rows
    .map((r) => ({
      district: (r["구역"] || "").trim(),
      name: (r["호텔명"] || "").trim(),
      count: Number(r["응답건수"]) || 0,
      address: (r["주소"] || "").trim(),
      brandGroup: (r["브랜드그룹"] || "").trim(),
      walkable: (r["솔저필드도보권"] || "").trim(),
      needsVerification: (r["주소확인필요"] || "").trim().toUpperCase() === "Y",
      notes: (r["비고"] || "").trim(),
    }))
    .filter((r) => r.name && r.address);
}

// radius grows with sqrt(count) so *area* (not radius) scales roughly
// linearly with response count — a flat radius scale would make small
// counts look disproportionately large next to Hilton Chicago's 33.
function radiusFor(count, maxCount) {
  if (maxCount <= 1) return MIN_RADIUS;
  const t = Math.sqrt((count - 1) / (maxCount - 1));
  return MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * t;
}

function initMap() {
  const map = L.map("map", {
    center: [41.8732, -87.629],
    zoom: 13,
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

async function addHotelMarkers(map, hotels) {
  const maxCount = Math.max(...hotels.map((h) => h.count), 1);
  const downtownLatLngs = [];

  await Promise.all(
    hotels.map(async (hotel) => {
      const geo = await geocodeAddress(hotel.address);
      if (!geo) {
        console.warn(`[Survey Hotels] Could not geocode "${hotel.name}" ("${hotel.address}") — skipping.`);
        return;
      }

      const latlng = L.latLng(geo.lat, geo.lon);
      const radius = radiusFor(hotel.count, maxCount);

      const marker = L.circleMarker(latlng, {
        radius,
        color: hotel.needsVerification ? "#8a8a8a" : "#2f1a57",
        weight: 1.5,
        fillColor: hotel.needsVerification ? "#9e9e9e" : "#4e2a94",
        fillOpacity: hotel.needsVerification ? 0.45 : 0.75,
      });

      marker.bindTooltip(`${escapeHtml(hotel.name)} — ${hotel.count}명`, {
        direction: "top",
        offset: [0, -radius],
        sticky: false,
      });

      marker.addTo(map);

      if (hotel.district !== SUBURB_DISTRICT) {
        downtownLatLngs.push(latlng);
      }
    })
  );

  if (downtownLatLngs.length) {
    map.fitBounds(L.latLngBounds(downtownLatLngs), { padding: [30, 30] });
  }
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
  const map = initMap();

  try {
    setStatus("Loading map...");
    const res = await fetch(CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    const text = await res.text();
    const hotels = parseRows(rowsToObjects(parseCsv(text)));
    await addHotelMarkers(map, hotels);
    setStatus(null);
  } catch (err) {
    console.error(err);
    setStatus("Couldn't load the map right now. Please try again shortly.");
  }
}

main();
