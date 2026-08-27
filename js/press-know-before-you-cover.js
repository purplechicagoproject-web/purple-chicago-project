import { parseCsv, rowsToObjects } from "./csv.js";
import { renderPressToc, renderBackLink } from "./press-content.js";
import { initAnchorToc } from "./partner-toolkit-content.js";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRo5FzKSOfq28_knpnsQudqO0BOhSl9Ygl2jxp-Kb-kQxIKQ2br2193qCwxJ476aGsBOrh_hT_1Pt4M/pub?gid=0&single=true&output=csv";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function renderHero() {
  return `
    <div class="info-hero">
      <img class="info-hero__art" src="/images/press/pen.png" alt="Illustration of a hand holding a pen" />
      <div class="info-hero__text">
        <h1 class="info-hero__title">Know Before You Cover</h1>
        <p class="info-hero__subtitle">Prior coverage and context on Purple Chicago Project, by category.</p>
      </div>
    </div>
  `;
}

function renderNewsItem(row) {
  const titleHtml = row.url
    ? `<a class="press-news-item__title" href="${escapeHtml(row.url)}" target="_blank" rel="noopener">${escapeHtml(row.title)}</a>`
    : `<span class="press-news-item__title">${escapeHtml(row.title)}</span>`;
  const metaParts = [row.source, row.date].filter(Boolean).map(escapeHtml);

  return `
    <li class="press-news-item">
      <div class="press-news-item__head">
        ${titleHtml}
        ${metaParts.length ? `<span class="press-news-item__meta">${metaParts.join(" &middot; ")}</span>` : ""}
      </div>
      ${row.summary ? `<p class="press-news-item__summary">${escapeHtml(row.summary)}</p>` : ""}
    </li>
  `;
}

// `rows` is already sorted by sheet order, so grouping by category in a
// single pass (Map preserves insertion order) keeps the sheet's own
// category ordering with no hardcoded list to maintain.
function groupByCategory(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = row.category || "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return Array.from(groups.entries());
}

function renderCategoryGroup(category, rows) {
  const heading = category || "Other";
  return `
    <div class="info-section" id="${slugify(heading)}">
      <div class="info-section__heading"><h2>${escapeHtml(heading)}</h2></div>
      <ul class="press-news-list">${rows.map(renderNewsItem).join("")}</ul>
    </div>
  `;
}

async function main() {
  const root = document.getElementById("know-before-you-cover-root");
  if (!root) return;

  try {
    const res = await fetch(CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    const text = await res.text();
    const rows = rowsToObjects(parseCsv(text))
      .map((r) => ({
        category: (r.category || "").trim(),
        title: (r.title || "").trim(),
        source: (r.source || "").trim(),
        date: (r.date || "").trim(),
        summary: (r.summary || "").trim(),
        url: (r.url || "").trim(),
      }))
      // Leftover blank sheet rows (no title, no link) carry nothing worth
      // rendering — drop them rather than showing an empty list item.
      .filter((r) => r.title || r.url);

    const groups = groupByCategory(rows);
    const tocLinks = groups.map(([category]) => ({
      slug: slugify(category || "Other"),
      label: category || "Other",
    }));

    root.innerHTML = `
      ${renderHero()}
      ${renderPressToc(tocLinks)}
      <div class="tg-back-wrap">${renderBackLink()}</div>
      <div class="info-sections">
        ${groups.map(([category, catRows]) => renderCategoryGroup(category, catRows)).join("")}
      </div>
      <div class="tg-back-wrap">${renderBackLink()}</div>
    `;

    initAnchorToc(root);
  } catch (err) {
    console.error(err);
    root.innerHTML = `
      ${renderHero()}
      <p class="info-error">Couldn't load this page right now. Please try again shortly.</p>
    `;
  }
}

main();
