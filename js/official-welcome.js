import { parseCsv, rowsToObjects } from "./csv.js";
import { loadInstagramEmbedScript, processInstagramEmbeds, renderInstagramBlockquote } from "./instagram-embed.js";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRw1-LKJC2EKZJLhOUktSUgppWwnaKT9WJ0rMUrxRVjcgWGR1ENlUvZ9v99Ek2ZcnWd0n_1DErbmTRI/pub?gid=0&single=true&output=csv";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function unescapeNewlines(text) {
  return (text || "").replace(/\\n/g, "\n");
}

function toRootAbsolute(path) {
  return path.startsWith("/") ? path : `/${path}`;
}

// Accepts youtu.be/ID, youtube.com/watch?v=ID, or an already-embeddable URL.
// rel=0 keeps end-screen suggestions limited to this channel instead of
// pulling in unrelated videos; modestbranding=1 shrinks the YouTube logo.
function toYouTubeEmbedUrl(url) {
  const params = "rel=0&modestbranding=1";
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed${u.pathname}?${params}`;
    }
    if (u.pathname.startsWith("/embed/")) {
      return `${url}${url.includes("?") ? "&" : "?"}${params}`;
    }
    const videoId = u.searchParams.get("v");
    if (videoId) return `https://www.youtube.com/embed/${videoId}?${params}`;
  } catch {
    // fall through
  }
  return url;
}

function renderParagraphs(content) {
  return unescapeNewlines(content)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p class="ow-block__text">${escapeHtml(p)}</p>`)
    .join("");
}

function renderButton(buttonText, buttonLink) {
  if (!buttonText || !buttonLink) return "";
  return `<a class="info-link-btn ow-block__btn" href="${escapeHtml(buttonLink)}" target="_blank" rel="noopener">${escapeHtml(buttonText)}</a>`;
}

function renderHeading(sectionTitle) {
  return sectionTitle ? `<h2 class="ow-block__heading">${escapeHtml(sectionTitle)}</h2>` : "";
}

function renderVideoIframe(row) {
  const embedUrl = toYouTubeEmbedUrl(row.video_url);
  return `
    <iframe
      src="${escapeHtml(embedUrl)}"
      title="${escapeHtml(row.section_title || "Video")}"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
    ></iframe>
  `;
}

function renderImageMedia(row) {
  return `<img class="ow-image-block__img" src="${escapeHtml(toRootAbsolute(row.image_file))}" alt="${escapeHtml(row.section_title || "")}" loading="lazy" />`;
}

// The Instagram post URL is stored in the video_url column, reused across
// both video types since both are "the URL for this block's clip".
function renderInstagramMedia(row) {
  return renderInstagramBlockquote(row.video_url, escapeHtml);
}

function renderMedia(row) {
  if (row.content_type === "image") return renderImageMedia(row);
  if (row.content_type === "instagram_video") return renderInstagramMedia(row);
  return "";
}

// YouTube videos get their own full-width treatment (large embed, caption
// below, centered) — image and Instagram blocks use the media-left/copy-
// right layout instead.
function renderFullWidthVideoBlock(row) {
  return `
    <div class="ow-video ow-video--full">${renderVideoIframe(row)}</div>
    <div class="ow-block__copy ow-block__copy--center">
      ${renderParagraphs(row.content)}
      ${renderButton(row.button_text, row.button_link)}
    </div>
  `;
}

// Button lives inside the copy column (right under its paragraph text),
// not centered under the whole row — so it tracks the text, not the media.
function renderMediaCopyBlock(row) {
  const media = renderMedia(row);
  return `
    <div class="ow-block__row">
      ${media ? `<div class="ow-block__media">${media}</div>` : ""}
      <div class="ow-block__copy">
        ${renderParagraphs(row.content)}
        ${renderButton(row.button_text, row.button_link)}
      </div>
    </div>
  `;
}

// Every block: heading on top, content below — always fully expanded, no
// accordion. Each content-type renderer places its own button.
function renderBlock(row, index) {
  const tintClass = index % 2 === 1 ? " ow-block--tint" : "";
  const body = row.content_type === "video" ? renderFullWidthVideoBlock(row) : renderMediaCopyBlock(row);

  return `
    <section class="ow-block${tintClass}">
      <div class="ow-block__inner">
        ${renderHeading(row.section_title)}
        ${body}
      </div>
    </section>
  `;
}

function renderBanner() {
  return `
    <div class="info-hero">
      <img class="info-hero__art" src="/images/official-welcome/chicago-flg.png" alt="Illustration of the Chicago city flag" />
      <div class="info-hero__text">
        <h1 class="info-hero__title">OFFICIAL WELCOME</h1>
        <p class="info-hero__subtitle">How the City of Chicago and the State of Illinois are welcoming BTS and ARMY.</p>
      </div>
    </div>
  `;
}

async function main() {
  const root = document.getElementById("official-welcome-root");
  if (!root) return;

  try {
    const res = await fetch(CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    const text = await res.text();
    const rows = rowsToObjects(parseCsv(text)).sort((a, b) => Number(a.order) - Number(b.order));

    root.innerHTML = `
      ${renderBanner()}
      <div class="ow-blocks">
        ${rows.map((row, i) => renderBlock(row, i)).join("")}
      </div>
    `;

    const hasInstagramBlock = rows.some((r) => r.content_type === "instagram_video");
    if (hasInstagramBlock) {
      loadInstagramEmbedScript().then(processInstagramEmbeds);
    }
  } catch (err) {
    console.error(err);
    root.innerHTML = `
      ${renderBanner()}
      <p class="info-error">Couldn't load this page right now. Please try again shortly.</p>
    `;
  }
}

main();
