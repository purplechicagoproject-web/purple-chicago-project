import { parseCsv, rowsToObjects } from "./csv.js";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQxK4qSdFS16n4cvcJR_D6TO4sKfuJ_yfxtB8yDTrc79t15ydqTCKhyGEi1RfskJB32GPf1Ju9-wvv7/pub?gid=0&single=true&output=csv";

const IMG_BASE = "/images/stadium-info-web/";

// One heading-level icon per section (shown next to the section title).
const SECTION_ICONS = {
  "EVENT OVERVIEW & SCHEDULE": "EVENT OVERVIEW.jpg",
  "BAG POLICY": "BAG POLICY.jpg",
  "PROHIBITED ITEMS": "PROHIBITED ITEMS.jpg",
  "CAMERA POLICY": "CAMERA POLICY.jpg",
  "CASHLESS VENUE & SAFETY": "CASHLESS.jpg",
};

// The directions section instead gets a small icon per transportation mode,
// keyed by that bullet's own title.
const BULLET_ICONS = {
  "CTA Train": "CTA Train.jpg",
  "CTA Bus": "CTA Bus.jpg",
  "Rideshare Drop-off": "RIDESHARE.jpg",
  "Rideshare Pick-up": "RIDESHARE.jpg",
};

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function iconImg(filename, className) {
  if (!filename) return "";
  return `<img class="${className}" src="${IMG_BASE}${encodeURIComponent(filename)}" alt="" />`;
}

function isWarning(row) {
  return row.title.includes("⚠️") || row.content.includes("⚠️");
}

function groupSections(rows) {
  const sections = [];
  let current = null;
  for (const row of rows) {
    if (row.type === "heading") {
      current = { title: row.content.trim(), slug: slugify(row.content), items: [] };
      sections.push(current);
    } else if (current) {
      current.items.push(row);
    }
  }
  return sections;
}

function renderText(row) {
  const body = row.title
    ? `<strong>${escapeHtml(row.title)}:</strong> ${escapeHtml(row.content)}`
    : escapeHtml(row.content);
  return `<p class="info-text">${body}</p>`;
}

function renderBulletLi(row) {
  const icon = iconImg(BULLET_ICONS[row.title], "info-bullet__icon");
  const body = row.title
    ? `<strong>${escapeHtml(row.title)}:</strong> ${escapeHtml(row.content)}`
    : escapeHtml(row.content);
  const warningClass = isWarning(row) ? " info-bullet--warning" : "";
  return `<li class="info-bullet${warningClass}">${icon}<span>${body}</span></li>`;
}

function renderLink(row) {
  return `<a class="info-link-btn" href="${escapeHtml(row.content)}" target="_blank" rel="noopener">${escapeHtml(row.title)}</a>`;
}

function renderItems(items) {
  let html = "";
  let bulletBuffer = [];

  function flushBullets() {
    if (bulletBuffer.length === 0) return;
    html += `<ul class="info-list">${bulletBuffer.join("")}</ul>`;
    bulletBuffer = [];
  }

  for (const row of items) {
    if (row.type === "bullet") {
      bulletBuffer.push(renderBulletLi(row));
    } else {
      flushBullets();
      if (row.type === "text") html += renderText(row);
      else if (row.type === "link") html += renderLink(row);
    }
  }
  flushBullets();
  return html;
}

function renderSection(section) {
  const icon = iconImg(SECTION_ICONS[section.title], "info-section__icon");
  return `
    <section class="info-section" id="${section.slug}">
      <div class="info-section__heading">
        ${icon}
        <h2>${escapeHtml(section.title)}</h2>
      </div>
      ${renderItems(section.items)}
    </section>
  `;
}

function renderToc(sections) {
  const links = sections
    .map((s) => `<a class="info-toc__link" href="#${s.slug}">${escapeHtml(s.title)}</a>`)
    .join("");
  return `
    <details class="info-toc">
      <summary class="info-toc__toggle">
        <span>Jump to Section</span>
        <span class="info-toc__toggle-chevron" aria-hidden="true"></span>
      </summary>
      <nav class="info-toc__links" aria-label="Section navigation">${links}</nav>
    </details>
  `;
}

function renderHero() {
  return `
    <div class="info-hero">
      <img class="info-hero__art" src="/images/stadium-info-web/soldierfield-1.png" width="1200" height="1454" alt="Illustration of Soldier Field and the Chicago skyline" />
      <div class="info-hero__text">
        <h1 class="info-hero__title">STADIUM INFO</h1>
        <p class="info-hero__subtitle">Everything to know before you go — schedule, bag policy, getting there, and venue rules.</p>
      </div>
    </div>
  `;
}

async function main() {
  const root = document.getElementById("stadium-info-root");
  if (!root) return;

  try {
    const res = await fetch(CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    const text = await res.text();
    const rows = rowsToObjects(parseCsv(text))
      .map((r) => ({
        order: Number(r.order) || 0,
        type: (r.type || "").trim().toLowerCase(),
        title: (r.title || "").trim(),
        content: (r.content || "").trim(),
      }))
      .sort((a, b) => a.order - b.order);

    const sections = groupSections(rows);

    root.innerHTML = `
      ${renderHero()}
      ${renderToc(sections)}
      <div class="info-sections">
        ${sections.map(renderSection).join("")}
      </div>
    `;

    // The sticky TOC's own height varies (collapsed vs expanded, and it
    // wraps to more rows on narrow screens), so anchor-scroll offset is
    // measured rather than guessed.
    const toc = root.querySelector(".info-toc");
    const updateTocOffset = () => {
      document.documentElement.style.setProperty("--info-toc-height", `${toc.getBoundingClientRect().height}px`);
    };
    updateTocOffset();
    window.addEventListener("resize", updateTocOffset);
    toc.addEventListener("toggle", updateTocOffset);

    // Collapse the TOC back down after jumping to a section, so it doesn't
    // stay pinned open over the content the link just scrolled to.
    toc.querySelectorAll(".info-toc__link").forEach((link) => {
      link.addEventListener("click", () => {
        toc.open = false;
      });
    });
  } catch (err) {
    console.error(err);
    root.innerHTML = `
      ${renderHero()}
      <p class="info-error">Couldn't load stadium info right now. Please try again shortly.</p>
    `;
  }
}

main();
