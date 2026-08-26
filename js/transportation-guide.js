import { parseCsv, rowsToObjects } from "./csv.js";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRDjz9I2fK0c9NdVsGHP8rePWlbfhYQ1lvVMgDpwR_dwm8UVr-MdbCqUMSa8PcmBMkchkfCMojfsoZY/pub?gid=0&single=true&output=csv";

// Hardcoded rather than sheet-driven: this is a single one-off video tucked
// into a specific section, not a repeating content pattern like the sheet's
// content/dos/donts/button columns — adding a generic "content_type" column
// for one embed would be more machinery than the page actually needs.
const CTA_SECTION_SLUG = "public-transit-cta";
const CTA_INSTAGRAM_EMBED_URL = "https://www.instagram.com/p/DceUYLTCWbY/";

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

// Standard Instagram oEmbed blockquote — embed.js finds this by class and
// swaps it for the real iframe. The fallback link inside is Instagram's own
// placeholder markup (shown only until the script processes it), not a
// title/caption we're adding.
function renderInstagramEmbed(url) {
  return `
    <div class="tg-instagram-embed">
      <blockquote
        class="instagram-media"
        data-instgrm-permalink="${escapeHtml(url)}"
        data-instgrm-version="14"
        style="background:#FFF; border:0; border-radius:3px; margin: 1px auto; max-width:540px; min-width:326px; padding:0; width:99.375%;"
      >
        <a href="${escapeHtml(url)}" target="_blank" rel="noopener"></a>
      </blockquote>
      <a class="info-link-btn" href="${escapeHtml(url)}" target="_blank" rel="noopener">Watch on Instagram</a>
    </div>
  `;
}

function renderSection(row) {
  const slug = slugify(row.section_title);
  const isCtaSection = slug === CTA_SECTION_SLUG;

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
        ${isCtaSection ? renderInstagramEmbed(CTA_INSTAGRAM_EMBED_URL) : ""}
      </div>
    </details>
  `;
}

// Instagram's embed.js auto-processes any blockquote.instagram-media present
// when it first loads, but our content is injected after that (or the
// accordion may still be collapsed), so we also re-run it manually once
// loaded and again whenever the CTA accordion is opened. process() is safe
// to call repeatedly — it only touches blockquotes it hasn't converted yet.
let instagramScriptPromise = null;
function loadInstagramEmbedScript() {
  if (window.instgrm) return Promise.resolve();
  if (instagramScriptPromise) return instagramScriptPromise;
  instagramScriptPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    script.onload = resolve;
    document.body.appendChild(script);
  });
  return instagramScriptPromise;
}

function processInstagramEmbeds() {
  window.instgrm?.Embeds?.process();
}

function wireInstagramEmbed() {
  loadInstagramEmbedScript().then(processInstagramEmbeds);

  const ctaSection = document.getElementById(CTA_SECTION_SLUG);
  if (ctaSection) {
    ctaSection.addEventListener("toggle", () => {
      if (ctaSection.open) processInstagramEmbeds();
    });
  }
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

    wireInstagramEmbed();
  } catch (err) {
    console.error(err);
    root.innerHTML = `
      ${renderBanner()}
      <p class="info-error">Couldn't load the transportation guide right now. Please try again shortly.</p>
    `;
  }
}

main();
