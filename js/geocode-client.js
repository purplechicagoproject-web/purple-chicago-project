// Resolves an address to {lat, lon}. Primary source is the prebuilt
// data/geocode-cache.json (produced by scripts/geocode.py — see that file
// for why we don't geocode client-side by default: Nominatim's usage policy
// isn't meant for a live per-visitor lookup on every page load).
//
// If an address shows up that isn't in the static cache yet (a vendor was
// added to the sheet but nobody re-ran the geocode script), we fall back to
// a single live Nominatim request, cached in localStorage so the same
// browser never asks twice, and we log a warning telling the site owner to
// rebuild the static cache.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const LOCAL_STORAGE_KEY = "pchip_geocode_fallback_cache_v1";

let staticCachePromise = null;

function loadLocalFallbackCache() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveLocalFallbackCache(cache) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota / private-mode errors
  }
}

function loadStaticCache() {
  if (!staticCachePromise) {
    staticCachePromise = fetch("/data/geocode-cache.json", { cache: "force-cache" })
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => ({}));
  }
  return staticCachePromise;
}

// Must never throw: a rejected result here gets chained onto the shared
// fallbackQueue below with no .catch(), which would otherwise permanently
// poison it (every later call in the same page session would reject too,
// even for unrelated addresses) — this is what caused survey-hotels'
// intermittent "Couldn't load the map" error, where one flaky network
// request for an already-known-bad address broke geocoding for the rest
// of the page's marker batch.
async function liveGeocode(address) {
  try {
    const params = new URLSearchParams({
      q: address,
      format: "jsonv2",
      limit: "1",
      countrycodes: "us",
    });
    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: { "Accept-Language": "en" },
    });
    if (!res.ok) return null;
    const results = await res.json();
    if (!results.length) return null;
    return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
  } catch (err) {
    console.warn(`[PChiP map] Live geocode request failed for "${address}":`, err);
    return null;
  }
}

// Serializes fallback live requests so we never fire more than one at a
// time (Nominatim policy: max ~1 req/sec).
let fallbackQueue = Promise.resolve();

// For pages with a large, mostly-static address list (e.g. survey-hotels'
// 90+ hotels) — looks up the prebuilt cache only, never falling back to a
// live per-visitor Nominatim request. A handful of addresses that fail to
// geocode even at build time (scripts/geocode.py) are expected to just be
// skipped by the caller rather than retried live from every browser.
export async function geocodeAddressStaticOnly(address) {
  const cache = await loadStaticCache();
  if (cache[address]) {
    return { lat: cache[address].lat, lon: cache[address].lon, source: "static-cache" };
  }
  return null;
}

export async function geocodeAddress(address) {
  const cache = await loadStaticCache();
  if (cache[address]) {
    return { lat: cache[address].lat, lon: cache[address].lon, source: "static-cache" };
  }

  const localCache = loadLocalFallbackCache();
  if (localCache[address]) {
    return { ...localCache[address], source: "local-fallback-cache" };
  }

  console.warn(
    `[PChiP map] "${address}" is not in data/geocode-cache.json — falling back to a ` +
      "live Nominatim lookup. Run `python3 scripts/geocode.py` to update the static cache."
  );

  const result = await (fallbackQueue = fallbackQueue.then(() => liveGeocode(address)));
  if (!result) return null;

  localCache[address] = result;
  saveLocalFallbackCache(localCache);
  return { ...result, source: "live-fallback" };
}
