// Turns raw sheet rows into vendor records + individual map points.
// A vendor can have more than one address (e.g. "South Loop: ... | West
// Loop: ..."), each of which becomes its own map point sharing the same
// vendor content (photos, offer, website).

export function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// "South Loop: 1400 S Michigan Ave... | West Loop: 1104 W Madison St..."
// -> [{ label: "South Loop", address: "1400 S Michigan Ave..." }, ...]
export function splitLocations(rawAddress) {
  return rawAddress
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const colonIdx = part.indexOf(":");
      // Only treat "Label: address" as labeled if the label looks like a
      // short place name, not a street address that happens to contain ":".
      if (colonIdx > 0 && colonIdx < 24) {
        return {
          label: part.slice(0, colonIdx).trim(),
          address: part.slice(colonIdx + 1).trim(),
        };
      }
      return { label: null, address: part };
    });
}

// "8 W Gartner Rd Ste 140, Naperville, IL 60540" -> "Naperville"
// US-style addresses end "..., City, ST ZIP" — the city is the second-to-last
// comma-separated segment.
export function parseCityFromAddress(address) {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return parts[parts.length - 2] || null;
}

// Root-absolute so image paths resolve correctly regardless of which page
// (or how deep a path) is loading this data, e.g. /map/.
function toRootAbsolute(path) {
  return path.startsWith("/") ? path : `/${path}`;
}

// "images/vendors/soul-burger/foo.jpg" -> "/images/vendors-web/soul-burger/foo.jpg"
// (accepts either a raw sheet path or one already root-absolute, since
// `images` is root-absolute by the time this runs on it in buildVendors)
export function toWebImagePath(originalPath) {
  return toRootAbsolute(originalPath.replace(/^\/?images\/vendors\//, "images/vendors-web/"));
}

function parseImageList(logoFileCell) {
  return logoFileCell
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);
}

export function buildVendors(rows) {
  return rows
    .map((row, index) => {
      const vendorName = (row.vendor_name || "").trim();
      const rawAddress = (row.address || "").trim();
      if (!vendorName || !rawAddress) return null;

      const images = parseImageList(row.logo_file || "").map(toRootAbsolute);

      const vendor = {
        id: `${slugify(vendorName)}-${index}`,
        slug: slugify(vendorName),
        name: vendorName,
        category: (row.category || "").trim(),
        status: (row.status || "").trim(),
        website: (row.website || "").trim(),
        images,
        webImages: images.map(toWebImagePath),
        menuItems: (row.menu_items || "").trim(),
        offerType: (row.offer_type || "").trim(),
        offerDetails: (row.offer_details || "").trim(),
        locations: splitLocations(rawAddress),
      };

      return vendor;
    })
    .filter(Boolean);
}

// Flattens vendors into one entry per map point (one per location).
export function buildMapPoints(vendors) {
  const points = [];
  for (const vendor of vendors) {
    vendor.locations.forEach((loc, locIndex) => {
      points.push({
        pointId: `${vendor.id}-${locIndex}`,
        vendor,
        label: loc.label,
        address: loc.address,
        city: parseCityFromAddress(loc.address),
      });
    });
  }
  return points;
}
