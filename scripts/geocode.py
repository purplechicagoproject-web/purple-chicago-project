#!/usr/bin/env python3
"""
Geocodes vendor addresses from the PChiP partner Google Sheet (+ Soldier Field)
via OpenStreetMap Nominatim, and writes/updates data/geocode-cache.json.

Run manually whenever a new vendor/address is added to the sheet:
    python3 scripts/geocode.py

Respects Nominatim's usage policy: max 1 request/sec, custom User-Agent,
and results are cached to disk so an address is only ever looked up once.
"""
import csv
import io
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_PATH = ROOT / "data" / "geocode-cache.json"
CONFIG_PATH = ROOT / "js" / "config.js"

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "PChiP-Partner-Map/1.0 (contact: slwlsumi@gmail.com)"
REQUEST_DELAY_SEC = 1.1

SOLDIER_FIELD_ADDRESS = "1410 Special Olympics Dr, Chicago, IL 60605"

# Pilgrimage (BTS Chicago spots) sheet — a second, independent data source
# geocoded into the same shared cache (keyed by address string, so it
# doesn't matter which page/sheet an address came from).
PILGRIMAGE_CSV_URL = (
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQylaZwldd8KohFXnT0ASwF4HLe6vE3RnvqqxwU-XQ7_J186xRfG_WxfF3yYJCB6lbUPshzccWao9yZ/pub?gid=0&single=true&output=csv"
)

# Nominatim can't resolve some addresses literally (e.g. a venue's official
# street address vs. how OSM has it mapped). Give it a friendlier query to
# try as a last resort, keyed by the exact address string used elsewhere.
QUERY_OVERRIDES = {
    SOLDIER_FIELD_ADDRESS: "Soldier Field, Chicago, IL",
    # No city/state in the sheet's address for this intersection — without
    # it, Nominatim matched a same-named street pair in San Diego instead.
    "Jackson Dr & Lake Shore Dr": "Jackson Drive & DuSable Lake Shore Drive, Chicago, IL",
}


def load_cache():
    if CACHE_PATH.exists():
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    return {}


def save_cache(cache):
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(
        json.dumps(cache, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8"
    )


def get_csv_url():
    if not CONFIG_PATH.exists():
        return None
    text = CONFIG_PATH.read_text(encoding="utf-8")
    marker = "CSV_URL:"
    if marker not in text:
        return None
    after = text.split(marker, 1)[1]
    quote = after.strip()[0]
    start = after.index(quote) + 1
    end = after.index(quote, start)
    return after[start:end]


def split_multi_location(raw_address):
    """Splits 'Label: addr | Label2: addr2' into [(label_or_None, addr), ...]."""
    parts = [p.strip() for p in raw_address.split("|") if p.strip()]
    out = []
    for part in parts:
        if ":" in part:
            label, addr = part.split(":", 1)
            out.append((label.strip(), addr.strip()))
        else:
            out.append((None, part))
    return out


def fetch_csv_rows(csv_url):
    req = urllib.request.Request(csv_url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read().decode("utf-8")
    return list(csv.DictReader(io.StringIO(raw)))


def fetch_vendor_addresses(csv_url):
    addresses = []
    for row in fetch_csv_rows(csv_url):
        raw_address = (row.get("address") or "").strip()
        if not raw_address:
            continue
        for _label, addr in split_multi_location(raw_address):
            addresses.append(addr)
    return addresses


def fetch_pilgrimage_addresses(csv_url):
    # One address per row (no "Label: addr | Label2: addr2" splitting) — a
    # row with an empty address is intentionally skipped here; the page
    # falls back to an approximate downtown coordinate for those instead.
    addresses = []
    for row in fetch_csv_rows(csv_url):
        raw_address = (row.get("address") or "").strip()
        if raw_address:
            addresses.append(raw_address)
    return addresses


def simplify(address):
    """Progressively strips suite/unit-level detail for a retry query."""
    import re

    variants = [address]
    stripped = re.sub(r"#\s*\S+", "", address)
    stripped = re.sub(r"\b(ste|suite|unit|lower level)\b\.?\s*\S*", "", stripped, flags=re.I)
    stripped = re.sub(r"\s{2,}", " ", stripped).strip(" ,")
    if stripped != address:
        variants.append(stripped)
    return variants


def geocode_one(address):
    queries = simplify(address)
    if address in QUERY_OVERRIDES:
        # Tried first, not as a last resort — some addresses (e.g. missing
        # city/state) return a plausible-looking but wrong match elsewhere
        # in the US, so we can't wait for the plain query to "fail" first.
        queries.insert(0, QUERY_OVERRIDES[address])
    for query in queries:
        params = {
            "q": query,
            "format": "jsonv2",
            "limit": 1,
            "countrycodes": "us",
        }
        url = f"{NOMINATIM_URL}?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                results = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            print(f"  ! request failed for '{query}': {e}", file=sys.stderr)
            results = []
        if results:
            r = results[0]
            return {
                "lat": float(r["lat"]),
                "lon": float(r["lon"]),
                "display_name": r.get("display_name", ""),
                "query_used": query,
            }
        time.sleep(REQUEST_DELAY_SEC)
    return None


def main():
    csv_url = get_csv_url()
    if not csv_url:
        print("Could not find CSV_URL in js/config.js", file=sys.stderr)
        sys.exit(1)

    print(f"Fetching vendor sheet: {csv_url}")
    addresses = fetch_vendor_addresses(csv_url)
    addresses.append(SOLDIER_FIELD_ADDRESS)

    print(f"Fetching Pilgrimage sheet: {PILGRIMAGE_CSV_URL}")
    addresses.extend(fetch_pilgrimage_addresses(PILGRIMAGE_CSV_URL))

    cache = load_cache()
    to_fetch = [a for a in addresses if a not in cache]

    if not to_fetch:
        print("All addresses already cached. Nothing to do.")
        return

    print(f"{len(to_fetch)} new address(es) to geocode (of {len(addresses)} total):")
    for addr in to_fetch:
        print(f"  - {addr}")

    for i, address in enumerate(to_fetch):
        print(f"[{i+1}/{len(to_fetch)}] Geocoding: {address}")
        result = geocode_one(address)
        if result:
            cache[address] = result
            print(f"  -> {result['lat']}, {result['lon']}")
        else:
            print(f"  ! FAILED to geocode: {address}", file=sys.stderr)
        save_cache(cache)
        time.sleep(REQUEST_DELAY_SEC)

    print(f"\nDone. Cache written to {CACHE_PATH}")


if __name__ == "__main__":
    main()
