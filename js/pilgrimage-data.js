import { slugify } from "./vendors.js";

// Nominatim can't be asked live for every visitor (its usage policy isn't
// meant for that), and a handful of rows intentionally have no address at
// all — those get pinned to this general downtown-Chicago point instead.
export const FALLBACK_COORDS = { lat: 41.8827, lon: -87.6233 };

export function buildSpots(rows) {
  return rows
    .map((row, index) => {
      const name = (row.location_name || "").trim();
      if (!name) return null;

      return {
        id: `${slugify(name)}-${index}`,
        order: Number(row.order) || 0,
        group: (row.group || "").trim(),
        color: (row.color || "").trim() || "#4E2A94",
        name,
        address: (row.address || "").trim(),
        content: (row.content || "").trim(),
        officialLink: (row.official_link || "").trim(),
        officialLinkText: (row.official_link_text || "").trim(),
        secondaryLink: (row.secondary_link || "").trim(),
        secondaryLinkText: (row.secondary_link_text || "").trim(),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
}
