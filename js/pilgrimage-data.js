import { slugify } from "./vendors.js";

const IMG_BASE = "/images/pilgrimage-web/";

// Nominatim can't be asked live for every visitor (its usage policy isn't
// meant for that), and a handful of rows intentionally have no address at
// all — those get pinned to this general downtown-Chicago point instead.
export const FALLBACK_COORDS = { lat: 41.8827, lon: -87.6233 };

function toRootAbsolute(path) {
  return path.startsWith("/") ? path : `/${path}`;
}

// "jhope-pizza.png" -> "/images/pilgrimage-web/jhope-pizza.jpg" — every
// photo was re-encoded to .jpg on optimize (none of these need transparency).
function resolvePhotoPath(photoFile) {
  const dot = photoFile.lastIndexOf(".");
  const base = dot === -1 ? photoFile : photoFile.slice(0, dot);
  return toRootAbsolute(`${IMG_BASE}${encodeURIComponent(base)}.jpg`);
}

export function buildSpots(rows) {
  return rows
    .map((row, index) => {
      const name = (row.location_name || "").trim();
      if (!name) return null;

      const photoFile = (row.photo_file || "").trim();

      return {
        id: `${slugify(name)}-${index}`,
        order: Number(row.order) || 0,
        group: (row.group || "").trim(),
        color: (row.color || "").trim() || "#4E2A94",
        name,
        address: (row.address || "").trim(),
        content: (row.content || "").trim(),
        photo: photoFile ? resolvePhotoPath(photoFile) : "",
        officialLink: (row.official_link || "").trim(),
        officialLinkText: (row.official_link_text || "").trim(),
        secondaryLink: (row.secondary_link || "").trim(),
        secondaryLinkText: (row.secondary_link_text || "").trim(),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
}
