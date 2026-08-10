import { parseCsv, rowsToObjects } from "./csv.js";

export const PARTNER_TOOLKIT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXJMYpUvf2tREc9DRr6AtgAhGBFAQsKPKuejqLWEYF8IcjfrMu0ZIxZXYLdJOqSGSpbNTRjtfb-q39/pub?gid=0&single=true&output=csv";

export async function fetchPartnerToolkitRows() {
  const res = await fetch(PARTNER_TOOLKIT_CSV_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
  const text = await res.text();
  return rowsToObjects(parseCsv(text));
}

// Both Partner Toolkit sub-pages share one CSV, filtered down to their own
// "page" value.
export function rowsForPage(rows, pageName) {
  return rows
    .filter((r) => (r.page || "").trim() === pageName)
    .map((r) => ({
      order: Number(r.order) || 0,
      page: (r.page || "").trim(),
      title: (r.section_title || "").trim(),
      contentType: (r.content_type || "").trim().toLowerCase(),
      content: (r.content || "").trim(),
      dos: (r.dos || "").trim(),
      donts: (r.donts || "").trim(),
      buttonText: (r.button_text || "").trim(),
      buttonLink: (r.button_link || "").trim(),
      instagramLink: (r.instagram_link || "").trim(),
      photoFile: (r.photo_file || "").trim(),
      category: (r.category || "").trim(),
    }))
    .sort((a, b) => a.order - b.order);
}
