import { fetchTripGuideRows, rowsForPage } from "./chicago-trip-guide-data.js";
import { renderTripGuideNav, renderBackLink } from "./chicago-trip-guide-content.js";

const PAGE_NAME = "Safety in Chicago";

const DISCLAIMER =
  "Some of this info comes from local recommendations and may change (hours, prices, closures). Please double-check before you go! Safety info reflects general conditions as of 2026 and isn't a substitute for official advisories.";

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

function splitSemicolons(text) {
  return (text || "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

// A line that's only a label (ends with ":") gets its own bold-label
// treatment, matching the convention used on Essentials & Tips.
function renderLine(line) {
  const m = line.match(/^([^:]{2,40}):\s*(.+)$/);
  if (m) return `<strong>${escapeHtml(m[1])}:</strong> ${escapeHtml(m[2])}`;
  return escapeHtml(line);
}

function renderTextContent(content) {
  const groups = (content || "")
    .split(/\n\s*\n/)
    .map((g) => g.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((g) => g.length > 0);

  return groups
    .map((lines) => {
      if (lines.length === 1) return `<p class="info-text">${renderLine(lines[0])}</p>`;
      return `<ul class="info-list tips-list">${lines.map((l) => `<li>${renderLine(l)}</li>`).join("")}</ul>`;
    })
    .join("");
}

function renderDoDont(dos, donts) {
  const doItems = splitSemicolons(dos);
  const dontItems = splitSemicolons(donts);
  if (doItems.length === 0 && dontItems.length === 0) return "";

  const doCol = doItems.length
    ? `
    <div class="tips-dodont__col tips-dodont__col--do">
      <h3 class="tips-dodont__heading">DO's</h3>
      <ul class="tips-dodont__list">${doItems.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
    </div>`
    : "";
  const dontCol = dontItems.length
    ? `
    <div class="tips-dodont__col tips-dodont__col--dont">
      <h3 class="tips-dodont__heading">DON'Ts</h3>
      <ul class="tips-dodont__list">${dontItems.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
    </div>`
    : "";

  const singleClass = doItems.length === 0 || dontItems.length === 0 ? " tips-dodont--single" : "";
  return `<div class="tips-dodont${singleClass}">${doCol}${dontCol}</div>`;
}

function renderSection(item) {
  const slug = slugify(item.title);
  return `
    <details class="tips-accordion" id="${slug}">
      <summary class="tips-accordion__summary">
        <h2 class="tips-accordion__title">${escapeHtml(item.title)}</h2>
        <span class="tips-accordion__chevron" aria-hidden="true"></span>
      </summary>
      <div class="tips-accordion__body">
        ${renderTextContent(item.content)}
        ${renderDoDont(item.dos, item.donts)}
      </div>
    </details>
  `;
}

function renderHero() {
  return `
    <div class="info-hero">
      <div class="info-hero__text">
        <h1 class="info-hero__title">Safety in Chicago</h1>
        <p class="info-hero__subtitle">Stay safe, have fun</p>
      </div>
    </div>
  `;
}

async function main() {
  const root = document.getElementById("safety-root");
  if (!root) return;

  try {
    const rows = await fetchTripGuideRows();
    const items = rowsForPage(rows, PAGE_NAME);

    root.innerHTML = `
      ${renderHero()}
      ${renderTripGuideNav()}
      <div class="tg-back-wrap">${renderBackLink()}</div>
      <div class="info-sections tips-sections">
        ${items.map(renderSection).join("")}
      </div>
      <p class="tg-safety-disclaimer">${escapeHtml(DISCLAIMER)}</p>
      <div class="tg-back-wrap">${renderBackLink()}</div>
    `;
  } catch (err) {
    console.error(err);
    root.innerHTML = `
      ${renderHero()}
      <p class="info-error">Couldn't load safety info right now. Please try again shortly.</p>
    `;
  }
}

main();
