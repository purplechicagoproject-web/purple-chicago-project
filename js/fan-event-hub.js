import { parseCsv, rowsToObjects } from "./csv.js";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRoL-mzaTKZMa-7QwEYfKWap_AE9MhaXLLu2VsjTjR77gindAMUIGnwSb3_5XGhf-R9H7b4o8_NMMiE/pub?gid=0&single=true&output=csv";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Cells like "Hosts: @a, @b\n\nDJ: @c" — split into trimmed, non-empty lines.
function splitLines(text) {
  return (text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Strips a leading "- " bullet marker, if present.
function stripBullet(line) {
  return line.replace(/^-+\s*/, "");
}

// Pulls the first "YYYY.MM.DD" found in a "Date & Time" cell (e.g.
// "2026.08.29 (Sun) 12:00 - 17:00") — used both for the date badge and for
// sorting, so only ever parsed in one place.
function parseEventDate(dateTime) {
  const m = (dateTime || "").match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!m) return null;
  return { year: parseInt(m[1], 10), month: parseInt(m[2], 10), day: parseInt(m[3], 10) };
}

// "2026.08.09 (일) 12:00 - 16:00" -> "AUG 9" (first date found in the cell;
// the source data's formats vary a lot — multi-date, ranges, sub-schedules —
// so only the big top-left badge is parsed out; the rest is shown as-is.
function extractDateBadge(dateTime) {
  const d = parseEventDate(dateTime);
  if (!d) return null;
  const month = MONTHS[d.month - 1];
  if (!month || !d.day) return null;
  return { month, day: d.day };
}

// A single comparable number for sorting — null when the cell has no
// parseable date, so those rows can be sunk to the end instead of sorting
// arbitrarily.
function dateSortKey(dateTime) {
  const d = parseEventDate(dateTime);
  return d ? d.year * 10000 + d.month * 100 + d.day : null;
}

// Soonest/earliest upcoming date first. Rows without a parseable date sink
// to the end; ties (including all-undated rows) keep their original sheet
// order since Array.prototype.sort is stable.
function sortRowsByDateAsc(rows) {
  return rows
    .map((row, index) => ({ row, index, key: dateSortKey(row["Date & Time"]) }))
    .sort((a, b) => {
      if (a.key === b.key) return a.index - b.index;
      if (a.key === null) return 1;
      if (b.key === null) return -1;
      return a.key - b.key;
    })
    .map((entry) => entry.row);
}

// A row's "Category" cell can list more than one category separated by
// " | " — an event should be filterable under every category it's tagged
// with.
function splitCategories(category) {
  return (category || "")
    .split(/\s*\|\s*/)
    .map((c) => c.trim())
    .filter(Boolean);
}

function collectCategories(rows) {
  const set = new Set();
  rows.forEach((row) => splitCategories(row["Category"]).forEach((c) => set.add(c)));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function renderFilterBar(categories) {
  const buttons = categories
    .map((c) => `<button type="button" class="event-filter-btn" data-filter="${escapeHtml(c)}">${escapeHtml(c)}</button>`)
    .join("");
  return `
    <div class="event-filters" role="group" aria-label="Filter events by category">
      <button type="button" class="event-filter-btn is-active" data-filter="All">All</button>
      ${buttons}
    </div>
  `;
}

function initFilters(root) {
  const bar = root.querySelector(".event-filters");
  if (!bar) return;

  const buttons = Array.from(bar.querySelectorAll(".event-filter-btn"));
  const cards = Array.from(root.querySelectorAll(".event-card"));

  bar.addEventListener("click", (e) => {
    const btn = e.target.closest(".event-filter-btn");
    if (!btn) return;

    buttons.forEach((b) => b.classList.toggle("is-active", b === btn));

    const filter = btn.dataset.filter;
    cards.forEach((card) => {
      const cats = (card.dataset.categories || "").split("|");
      card.classList.toggle("is-hidden", filter !== "All" && !cats.includes(filter));
    });
  });
}

function renderDateBadge(dateTime) {
  const badge = extractDateBadge(dateTime);
  if (!badge) return `<div class="event-card__date event-card__date--fallback">TBD</div>`;
  return `
    <div class="event-card__date">
      <span class="event-card__date-month">${badge.month}</span>
      <span class="event-card__date-day">${badge.day}</span>
    </div>
  `;
}

function renderCard(row) {
  const title = row["Event Title"] || "";
  const category = row["Category"] || "";
  const dateTime = row["Date & Time"] || "";
  const venue = row["Venue Name"] || "";
  const address = row["Address"] || "";
  const hosts = splitLines(row["Hosts & Partners"]);
  const activities = splitLines(row["Key Activities & Details"]).map(stripBullet);
  const notices = splitLines(row["Notice & Age Limit"]).map(stripBullet);
  const igLink = (row["Instagram Link"] || "").trim();
  const categories = splitCategories(category);

  return `
    <article class="event-card" data-categories="${escapeHtml(categories.join("|"))}">
      ${category ? `<span class="event-card__category">${escapeHtml(category)}</span>` : ""}

      <div class="event-card__head">
        ${renderDateBadge(dateTime)}
        <div class="event-card__head-text">
          <h2 class="event-card__title">${escapeHtml(title)}</h2>
          <p class="event-card__time">${escapeHtml(dateTime)}</p>
        </div>
      </div>

      <hr class="event-card__divider" />

      ${
        venue || address
          ? `<p class="event-card__row"><span class="event-card__row-icon">📍</span> ${escapeHtml(venue)}${venue && address ? " — " : ""}${escapeHtml(address)}</p>`
          : ""
      }

      ${
        hosts.length
          ? `<p class="event-card__row"><span class="event-card__row-icon">👤</span> ${hosts.map(escapeHtml).join(" · ")}</p>`
          : ""
      }

      ${activities.length ? `<p class="event-card__summary">${activities.map(escapeHtml).join(" · ")}</p>` : ""}

      ${
        notices.length
          ? `<div class="event-card__notice"><strong>Notice:</strong> ${notices.map(escapeHtml).join(" · ")}</div>`
          : ""
      }

      ${
        igLink
          ? `<a class="event-card__link" href="${escapeHtml(igLink)}" target="_blank" rel="noopener">Learn more</a>`
          : ""
      }
    </article>
  `;
}

async function main() {
  const root = document.getElementById("fan-event-hub-root");
  if (!root) return;

  try {
    const res = await fetch(CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    const text = await res.text();
    const rows = sortRowsByDateAsc(rowsToObjects(parseCsv(text)));
    const categories = collectCategories(rows);

    root.innerHTML = `
      <div class="event-hero">
        <h1 class="event-hero__title">FAN EVENT HUB</h1>
        <p class="event-hero__subtitle">Cupsleeve events, pop-ups, and ARMY meetups happening around the ARIRANG Tour.</p>
      </div>
      ${categories.length ? renderFilterBar(categories) : ""}
      <div class="event-grid">
        ${rows.map(renderCard).join("")}
      </div>
    `;

    initFilters(root);
  } catch (err) {
    console.error(err);
    root.innerHTML = `
      <div class="event-hero">
        <h1 class="event-hero__title">FAN EVENT HUB</h1>
      </div>
      <p class="info-error">Couldn't load fan events right now. Please try again shortly.</p>
    `;
  }
}

main();
