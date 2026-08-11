import { mountInstagramEmbeds } from "./chicago-trip-guide-content.js";

export { mountInstagramEmbeds };

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

// The sheet uses either a literal "\n" or a ";" to separate list items,
// depending on which convention the editor used for that cell — support
// both rather than picking one.
function splitItems(text) {
  const unescaped = (text || "").replace(/\\n/g, "\n");
  if (unescaped.includes("\n")) {
    return unescaped.split("\n").map((s) => s.trim()).filter(Boolean);
  }
  return unescaped.split(";").map((s) => s.trim()).filter(Boolean);
}

// Turns plain http(s)/www URLs inside already-escaped text into links. Safe
// to run after escapeHtml since URLs don't contain characters it touches
// other than the occasional "&" in a query string, which escapeHtml turns
// into "&amp;" — still valid, still resolves correctly once used as an
// href (browsers decode entities in attribute values).
function linkify(text) {
  const escaped = escapeHtml(text);
  return escaped.replace(/((?:https?:\/\/|www\.)[^\s<]+)/g, (match) => {
    // The sheet often wraps a URL in "(...)" or ends a sentence right after
    // it — strip trailing punctuation the greedy match swept up so it
    // doesn't end up baked into the href.
    let url = match;
    let trailing = "";
    while (url.length > 0 && /[)\]},.;:!?]$/.test(url)) {
      trailing = url.slice(-1) + trailing;
      url = url.slice(0, -1);
    }
    const href = url.startsWith("http") ? url : `https://${url}`;
    return `<a class="info-text__link" href="${href}" target="_blank" rel="noopener">${url}</a>${trailing}`;
  });
}

function renderParagraphs(content, shouldLinkify, className = "info-text") {
  const groups = (content || "")
    .replace(/\\n/g, "\n")
    .split(/\n\s*\n/)
    .map((g) => g.split("\n").map((l) => l.trim()).filter(Boolean).join(" "))
    .filter(Boolean);

  return groups
    .map((line) => `<p class="${className}">${shouldLinkify ? linkify(line) : escapeHtml(line)}</p>`)
    .join("");
}

function renderDoDont(dos, donts) {
  const doItems = splitItems(dos);
  const dontItems = splitItems(donts);
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

// Same oEmbed-card-plus-CTA pattern as the Chicago Trip Guide place cards
// (compact embed, data-instgrm-captioned stripped, falls back to just the
// button if the embed never hydrates) — mounted afterward via the shared
// mountInstagramEmbeds() imported above.
function renderIgCard(link) {
  return `
    <div class="tg-card pt-ig-card">
      <div class="tg-card__embed" data-ig-link="${escapeHtml(link)}"></div>
      <div class="tg-card__body">
        <a class="tg-card__cta" href="${escapeHtml(link)}" target="_blank" rel="noopener">Watch on Instagram</a>
      </div>
    </div>
  `;
}

export function renderSection(item) {
  const slug = slugify(item.title);
  const parts = [];

  if (item.instagramLink) parts.push(renderIgCard(item.instagramLink));

  parts.push(`<div class="info-section__heading"><h2>${escapeHtml(item.title)}</h2></div>`);

  if (item.content) parts.push(renderParagraphs(item.content, !item.instagramLink));

  parts.push(renderDoDont(item.dos, item.donts));

  if (item.buttonText && item.buttonLink) {
    parts.push(
      `<a class="info-link-btn" href="${escapeHtml(item.buttonLink)}" target="_blank" rel="noopener">${escapeHtml(item.buttonText)}</a>`
    );
  }

  return `<section class="info-section" id="${slug}">${parts.join("")}</section>`;
}

// Idea Reference renders its rows as cards in the same two-column grid used
// by the Chicago Trip Guide place-list pages, except for a few rows whose
// product photos are wide/landscape and read better as a single, full-width
// card spanning both columns.
const WIDE_CARD_TITLES = new Set([
  "Purple Balloons",
  "Purple Streamers",
  "Purple Birthday Decorations",
  "Pompoms & Garlands",
]);

function ideaCardPhotoSrc(photoFile) {
  return photoFile ? `/images/Partner-Toolkit-web/${encodeURIComponent(photoFile)}` : null;
}

export function renderIdeaCard(item) {
  const slug = slugify(item.title);
  const photoSrc = ideaCardPhotoSrc(item.photoFile);
  const wideClass = WIDE_CARD_TITLES.has(item.title) ? " pt-idea-card--wide" : "";

  // The embed (if any) takes priority over a plain photo for the media
  // slot at the top of the card — a row shouldn't need both.
  const media = item.instagramLink
    ? `<div class="tg-card__embed" data-ig-link="${escapeHtml(item.instagramLink)}"></div>`
    : photoSrc
      ? `<img class="tg-card__photo" src="${photoSrc}" alt="" loading="lazy" />`
      : "";

  const body = [];
  body.push(`<h2 class="tg-card__name">${escapeHtml(item.title)}</h2>`);
  if (item.content) body.push(renderParagraphs(item.content, !item.instagramLink, "tg-card__content"));
  body.push(renderDoDont(item.dos, item.donts));
  if (item.instagramLink) {
    body.push(`<a class="tg-card__cta" href="${escapeHtml(item.instagramLink)}" target="_blank" rel="noopener">Watch on Instagram</a>`);
  }
  if (item.buttonText && item.buttonLink) {
    body.push(
      `<a class="info-link-btn" href="${escapeHtml(item.buttonLink)}" target="_blank" rel="noopener">${escapeHtml(item.buttonText)}</a>`
    );
  }

  return `
    <article class="tg-card pt-idea-card${wideClass}" id="${slug}">
      ${media}
      <div class="tg-card__body">${body.join("")}</div>
    </article>
  `;
}

// Rows are grouped under a heading by their "category" column. `items` is
// already sorted ascending by the sheet's "order" column (rowsForPage does
// that), and Map preserves insertion order — so building groups by a single
// pass, in row order, naturally puts each group at the position of its
// lowest "order" value with no hardcoded category list to maintain.
function groupByCategory(items) {
  const groups = new Map();
  for (const item of items) {
    const cat = item.category || "";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(item);
  }
  return Array.from(groups.entries());
}

export function renderIdeaGroups(items) {
  const groups = groupByCategory(items);
  return `
    <div class="pt-idea-groups">
      ${groups
        .map(
          ([category, rows]) => `
        <section class="pt-idea-group"${category ? ` id="${slugify(category)}"` : ""}>
          ${category ? `<h2 class="pt-idea-group__heading">${escapeHtml(category)}</h2>` : ""}
          <div class="tg-grid pt-idea-group__grid">${rows.map(renderIdeaCard).join("")}</div>
        </section>
      `
        )
        .join("")}
    </div>
  `;
}

function renderTocFromLinks(links) {
  if (links.length === 0) return "";
  const html = links
    .map((l) => `<a class="info-toc__link" href="#${l.slug}">${escapeHtml(l.label)}</a>`)
    .join("");
  return `
    <details class="info-toc">
      <summary class="info-toc__toggle">
        <span>Jump to Section</span>
        <span class="info-toc__toggle-chevron" aria-hidden="true"></span>
      </summary>
      <nav class="info-toc__links" aria-label="Section navigation">${html}</nav>
    </details>
  `;
}

// In-page anchor "Jump to Section" nav, built from whichever sections
// actually exist on that page's CSV rows — same pattern as Stadium Info.
export function renderAnchorToc(items) {
  return renderTocFromLinks(items.map((i) => ({ slug: slugify(i.title), label: i.title })));
}

// Idea Reference has too many individual cards for a per-card TOC to be
// useful — this jumps to each category group's heading instead, same as
// the Chicago Trip Guide pages' section-level nav.
export function renderCategoryToc(items) {
  const groups = groupByCategory(items).filter(([category]) => category);
  return renderTocFromLinks(groups.map(([category]) => ({ slug: slugify(category), label: category })));
}

// The sticky TOC's own height varies (collapsed vs expanded, wraps on
// narrow screens), so the anchor-scroll offset is measured, not guessed —
// same approach as Stadium Info.
export function initAnchorToc(root) {
  const toc = root.querySelector(".info-toc");
  if (!toc) return;

  const updateTocOffset = () => {
    document.documentElement.style.setProperty("--info-toc-height", `${toc.getBoundingClientRect().height}px`);
  };
  updateTocOffset();
  window.addEventListener("resize", updateTocOffset);
  toc.addEventListener("toggle", updateTocOffset);

  toc.querySelectorAll(".info-toc__link").forEach((link) => {
    link.addEventListener("click", () => {
      toc.open = false;
    });
  });
}

// The hub's two fixed sub-pages — not CSV-driven, so shared verbatim by
// the hub page's own nav and card grid.
export const PARTNER_TOOLKIT_LINKS = [
  { href: "/partner-toolkit/partner-guide.html", label: "Partner Guide" },
  { href: "/partner-toolkit/idea-reference.html", label: "Idea Reference" },
];

export function renderToolkitHubNav() {
  const links = PARTNER_TOOLKIT_LINKS.map(
    (l) => `<a class="info-toc__link" href="${l.href}">${escapeHtml(l.label)}</a>`
  ).join("");
  return `
    <details class="info-toc">
      <summary class="info-toc__toggle">
        <span>Jump to Section</span>
        <span class="info-toc__toggle-chevron" aria-hidden="true"></span>
      </summary>
      <nav class="info-toc__links" aria-label="Partner Toolkit sections">${links}</nav>
    </details>
  `;
}

export function renderBackLink() {
  return `<a class="tg-back-link" href="/partner-toolkit.html">&larr; Back to Partner Toolkit</a>`;
}
