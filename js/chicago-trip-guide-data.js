import { parseCsv, rowsToObjects } from "./csv.js";

export const TRIP_GUIDE_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQnZcimZ8o8suoNkh0zDztptqF5pD1caMVTqMSc6sjFy1hmVwDMiQSTMVEFVBWyBQPmz7qVZ4p2qBmR/pub?gid=0&single=true&output=csv";

export async function fetchTripGuideRows() {
  const res = await fetch(TRIP_GUIDE_CSV_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
  const text = await res.text();
  return rowsToObjects(parseCsv(text));
}

// Every sub-page shares one CSV, filtered down to its own "page" value.
export function rowsForPage(rows, pageName) {
  return rows
    .filter((r) => (r.page || "").trim() === pageName)
    .map((r) => ({
      order: Number(r.order) || 0,
      page: (r.page || "").trim(),
      title: (r.section_title || "").trim(),
      address: (r.address || "").trim(),
      content: (r.content || "").trim(),
      dos: (r.dos || "").trim(),
      donts: (r.donts || "").trim(),
      instagramLink: (r.instagram_link || "").trim(),
    }))
    .sort((a, b) => a.order - b.order);
}
