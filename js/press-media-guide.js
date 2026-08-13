import { parseCsv, rowsToObjects } from "./csv.js";
import { renderPressToc, renderBackLink } from "./press-content.js";
import { initAnchorToc } from "./partner-toolkit-content.js";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRxl7cj4aybEiP29zzmLSQGSxQWLdBLkux1tH6nw4ITqhfa7x-1TnI0EDbi9fHZazqxj0xrcs2Rg2Yb/pub?gid=0&single=true&output=csv";

// Fixed heading slugs/labels for the TOC — the sections themselves are
// always these three (only which rows fall under them is CSV-driven).
const TOC_LINKS = [
  { slug: "quick-background", label: "Quick Background" },
  { slug: "for-official-partner-accounts", label: "For Official & Partner Accounts" },
  { slug: "for-news-media-on-air-talent", label: "For News Media & On-Air Talent" },
];

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
        <h1 class="info-hero__title">Media Guide</h1>
        <p class="info-hero__subtitle">Background, terminology, and guidance for covering Purple Chicago Project.</p>
      </div>
    </div>
  `;
}

function renderIntro(rows) {
  return rows.map((r) => `<blockquote class="press-quote">${escapeHtml(r.content)}</blockquote>`).join("");
}

function renderLabelList(rows) {
  return `
    <ul class="info-list press-label-list">
      ${rows.map((r) => `<li><strong>${escapeHtml(r.label)}:</strong> ${escapeHtml(r.content)}</li>`).join("")}
    </ul>
  `;
}

function renderBackground(rows) {
  if (rows.length === 0) return "";
  return `
    <div class="info-section" id="quick-background">
      <div class="info-section__heading"><h2>Quick Background</h2></div>
      ${renderLabelList(rows)}
    </div>
  `;
}

// `rows` is already sorted by the sheet's "order" column, so grouping by
// subsection in a single pass (Map preserves insertion order) naturally
// keeps the sheet's own subsection ordering with no hardcoded list to
// maintain — same technique as Idea Reference's category grouping.
function groupBySubsection(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = row.subsection || "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return Array.from(groups.entries());
}

function renderSection1(rows) {
  if (rows.length === 0) return "";
  const groups = groupBySubsection(rows);
  const body = groups
    .map(
      ([subsection, items]) => `
      ${subsection ? `<p class="tips-subhead">${escapeHtml(subsection)}</p>` : ""}
      ${renderLabelList(items)}
    `
    )
    .join("");

  return `
    <div class="info-section" id="for-official-partner-accounts">
      <div class="info-section__heading"><h2>For Official & Partner Accounts</h2></div>
      ${body}
    </div>
  `;
}

function renderSection2(rows) {
  if (rows.length === 0) return "";
  return `
    <div class="info-section" id="for-news-media-on-air-talent">
      <div class="info-section__heading"><h2>For News Media & On-Air Talent</h2></div>
      ${renderLabelList(rows)}
    </div>
  `;
}

function renderClosing(rows) {
  if (rows.length === 0) return "";
  return `<p class="tg-note">${rows.map((r) => escapeHtml(r.content)).join(" ")}</p>`;
}

async function main() {
  const root = document.getElementById("media-guide-root");
  if (!root) return;

  try {
    const res = await fetch(CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    const text = await res.text();
    const rows = rowsToObjects(parseCsv(text))
      .map((r) => ({
        order: Number(r.order) || 0,
        section: (r.section || "").trim().toLowerCase(),
        subsection: (r.subsection || "").trim(),
        label: (r.label || "").trim(),
        content: (r.content || "").trim(),
      }))
      .sort((a, b) => a.order - b.order);

    const bySection = (name) => rows.filter((r) => r.section === name);

    root.innerHTML = `
      ${renderHero()}
      ${renderPressToc(TOC_LINKS)}
      <div class="tg-back-wrap">${renderBackLink()}</div>
      ${renderIntro(bySection("intro"))}
      <div class="info-sections">
        ${renderBackground(bySection("background"))}
        ${renderSection1(bySection("section1"))}
        ${renderSection2(bySection("section2"))}
      </div>
      ${renderClosing(bySection("closing"))}
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
