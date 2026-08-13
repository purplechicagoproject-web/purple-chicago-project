import { parseCsv, rowsToObjects } from "./csv.js";
import { renderTripGuideNav, renderBackLink } from "./chicago-trip-guide-content.js";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTk6lkRtgvxAzf32G4G0vcwqg6ortxyGYZYdnWn-vnfmcD7LYWFJE4BQC8KVs0xehI7HQGa99pFphdG/pub?gid=0&single=true&output=csv";

const DEFAULT_SUBTEXT = "We're putting together a list of the best K-pop stores in Chicago, check back soon!";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderHero() {
  return `
    <div class="info-hero">
      <div class="info-hero__text">
        <h1 class="info-hero__title">K-pop Store List</h1>
        <p class="info-hero__subtitle">Where to find K-pop merch and albums around Chicago.</p>
      </div>
    </div>
  `;
}

function renderStoreCard(store) {
  return `
    <div class="kpop-store-card">
      <h2 class="kpop-store-card__name">${escapeHtml(store.name)}</h2>
      ${store.address ? `<p class="kpop-store-card__address">${escapeHtml(store.address)}</p>` : ""}
      ${
        store.instagramUrl
          ? `<a class="kpop-store-card__link" href="${escapeHtml(store.instagramUrl)}" target="_blank" rel="noopener">Instagram</a>`
          : ""
      }
    </div>
  `;
}

function renderFallback() {
  return `<p class="kpop-store-fallback">${escapeHtml(DEFAULT_SUBTEXT)}</p>`;
}

async function main() {
  const root = document.getElementById("kpop-stores-root");
  if (!root) return;

  let bodyHtml = renderFallback();

  try {
    const res = await fetch(CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    const text = await res.text();
    const stores = rowsToObjects(parseCsv(text))
      .map((r) => ({
        name: (r.name || "").trim(),
        address: (r.address || "").trim(),
        instagramUrl: (r.instagram_url || "").trim(),
      }))
      .filter((s) => s.name);

    if (stores.length > 0) {
      bodyHtml = `<div class="kpop-store-grid">${stores.map(renderStoreCard).join("")}</div>`;
    }
  } catch (err) {
    console.error(err);
    // bodyHtml stays the fallback set above.
  }

  root.innerHTML = `
    ${renderHero()}
    ${renderTripGuideNav()}
    <div class="tg-back-wrap">${renderBackLink()}</div>
    ${bodyHtml}
    <div class="tg-back-wrap">${renderBackLink()}</div>
  `;
}

main();
