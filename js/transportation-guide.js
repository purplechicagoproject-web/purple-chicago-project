import { parseCsv, rowsToObjects } from "./csv.js";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRDjz9I2fK0c9NdVsGHP8rePWlbfhYQ1lvVMgDpwR_dwm8UVr-MdbCqUMSa8PcmBMkchkfCMojfsoZY/pub?gid=0&single=true&output=csv";

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

// The sheet stores line breaks as a literal "\n" (backslash + n) rather
// than an actual newline character, so it survives being typed into a
// single spreadsheet cell — unescape it before splitting.
function unescapeNewlines(text) {
  return (text || "").replace(/\\n/g, "\n");
}

function splitSemicolons(text) {
  return unescapeNewlines(text)
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
  const groups = unescapeNewlines(content)
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

function renderButton(buttonText, buttonLink) {
  if (!buttonText || !buttonLink) return "";
  return `<a class="info-link-btn" href="${escapeHtml(buttonLink)}" target="_blank" rel="noopener">${escapeHtml(buttonText)}</a>`;
}

function renderSection(row) {
  const slug = slugify(row.section_title);

  return `
    <details class="tips-accordion" id="${slug}">
      <summary class="tips-accordion__summary">
        <h2 class="tips-accordion__title">${escapeHtml(row.section_title)}</h2>
        <span class="tips-accordion__chevron" aria-hidden="true"></span>
      </summary>
      <div class="tips-accordion__body">
        ${renderTextContent(row.content)}
        ${renderDoDont(row.dos, row.donts)}
        ${renderButton(row.button_text, row.button_link)}
      </div>
    </details>
  `;
}

function renderBanner() {
  return `
    <div class="info-hero">
      <img class="info-hero__art" src="/images/transportation-guide-web/subway.png" alt="Illustration of a CTA train rounding a curve" />
      <div class="info-hero__text">
        <h1 class="info-hero__title">TRANSPORTATION GUIDE</h1>
        <p class="info-hero__subtitle">How to get to Soldier Field — CTA trains and buses, driving and parking, rideshare, and airport transit.</p>
      </div>
    </div>
  `;
}

async function main() {
  const root = document.getElementById("transportation-guide-root");
  if (!root) return;

  try {
    const res = await fetch(CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    const text = await res.text();
    const rows = rowsToObjects(parseCsv(text)).sort((a, b) => Number(a.order) - Number(b.order));

    root.innerHTML = `
      ${renderBanner()}
      <div class="info-sections tips-sections">
        ${rows.map(renderSection).join("")}
      </div>
    `;
  } catch (err) {
    console.error(err);
    root.innerHTML = `
      ${renderBanner()}
      <p class="info-error">Couldn't load the transportation guide right now. Please try again shortly.</p>
    `;
  }
}

main();
