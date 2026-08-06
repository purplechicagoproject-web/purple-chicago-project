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

// "2026.08.09 (일) 12:00 - 16:00" -> "AUG 9" (first date found in the cell;
// the source data's formats vary a lot — multi-date, ranges, sub-schedules —
// so only the big top-left badge is parsed out; the rest is shown as-is.
function extractDateBadge(dateTime) {
  const m = (dateTime || "").match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!m) return null;
  const month = MONTHS[parseInt(m[2], 10) - 1];
  const day = parseInt(m[3], 10);
  if (!month || !day) return null;
  return { month, day };
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

  return `
    <article class="event-card">
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
    const rows = rowsToObjects(parseCsv(text));

    root.innerHTML = `
      <div class="event-hero">
        <h1 class="event-hero__title">FAN EVENT HUB</h1>
        <p class="event-hero__subtitle">Cupsleeve events, pop-ups, and ARMY meetups happening around the ARIRANG Tour.</p>
      </div>
      <div class="event-grid">
        ${rows.map(renderCard).join("")}
      </div>
    `;
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
