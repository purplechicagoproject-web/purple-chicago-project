import { fetchTripGuideRows, rowsForPage } from "./chicago-trip-guide-data.js";

const OEMBED_URL = "https://graph.facebook.com/v25.0/instagram_oembed";
const IG_EMBED_SCRIPT_URL = "https://www.instagram.com/embed.js";

// An ad blocker (or a slow/blocked network) can leave the embed script
// "loaded" but silently no-op, or block the iframe it tries to inject —
// if the blockquote never actually hydrates within this window, fall
// back to a plain link instead of leaving a dead placeholder.
const EMBED_HYDRATE_TIMEOUT_MS = 4000;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

let embedScriptPromise = null;

function loadInstagramEmbedScript() {
  if (window.instgrm) return Promise.resolve();
  if (embedScriptPromise) return embedScriptPromise;

  embedScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = IG_EMBED_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Instagram embed script failed to load"));
    document.body.appendChild(script);
  });
  return embedScriptPromise;
}

// The card already has its own "Watch on Instagram" button below the
// content, so on failure we just remove this empty slot rather than
// showing a second, redundant link where the embed would've gone.
async function mountInstagramEmbed(container, instagramLink) {
  try {
    const url = `${OEMBED_URL}?url=${encodeURIComponent(instagramLink)}&omitscript=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`oEmbed request failed: ${res.status}`);
    const data = await res.json();
    if (!data.html) throw new Error("oEmbed response had no html");

    container.innerHTML = data.html;
    // Captioned embeds (username, caption, hashtags, like/comment icons)
    // make cards very long — the compact photo/video-only version is what
    // we want here.
    container.querySelector("blockquote.instagram-media")?.removeAttribute("data-instgrm-captioned");
    await loadInstagramEmbedScript();
    window.instgrm?.Embeds?.process();

    setTimeout(() => {
      if (!container.querySelector("iframe")) container.remove();
    }, EMBED_HYDRATE_TIMEOUT_MS);
  } catch (err) {
    console.warn("[Chicago Trip Guide] Instagram embed failed, removing the empty slot:", err);
    container.remove();
  }
}

export function mountInstagramEmbeds(root) {
  root.querySelectorAll(".tg-card__embed[data-ig-link]").forEach((el) => {
    mountInstagramEmbed(el, el.dataset.igLink);
  });
}

function renderPlaceCard(item) {
  return `
    <article class="tg-card">
      ${item.instagramLink ? `<div class="tg-card__embed" data-ig-link="${escapeHtml(item.instagramLink)}"></div>` : ""}
      <div class="tg-card__body">
        <h2 class="tg-card__name">${escapeHtml(item.title)}</h2>
        ${item.address ? `<p class="tg-card__address">${escapeHtml(item.address)}</p>` : ""}
        ${item.content ? `<p class="tg-card__content">${escapeHtml(item.content)}</p>` : ""}
        ${item.instagramLink ? `<a class="tg-card__cta" href="${escapeHtml(item.instagramLink)}" target="_blank" rel="noopener">Watch on Instagram</a>` : ""}
      </div>
    </article>
  `;
}

function renderHero(title, subtitle) {
  return `
    <div class="info-hero">
      <div class="info-hero__text">
        <h1 class="info-hero__title">${escapeHtml(title)}</h1>
        <p class="info-hero__subtitle">${escapeHtml(subtitle)}</p>
      </div>
    </div>
  `;
}

// The six Chicago Trip Guide category pages — fixed, not CSV-driven, so
// this list is shared verbatim by the hub page's own static markup.
export const TRIP_GUIDE_LINKS = [
  { href: "/chicago-trip-guide/must-see.html", label: "Chicago Must-See List" },
  { href: "/chicago-trip-guide/free-things.html", label: "Free Things to See" },
  { href: "/chicago-trip-guide/rooftops.html", label: "Rooftop Views" },
  { href: "/chicago-trip-guide/kpop-stores.html", label: "K-pop Store List" },
  { href: "/chicago-trip-guide/safety.html", label: "Safety in Chicago" },
];

// Same collapsible "Jump to Section" pattern as Stadium Info, but the
// links are separate pages rather than in-page anchors — a plain
// <details> needs no JS to toggle, and there's no anchor-offset math
// needed since each link is a full page navigation.
export function renderTripGuideNav() {
  const links = TRIP_GUIDE_LINKS.map(
    (l) => `<a class="info-toc__link" href="${l.href}">${escapeHtml(l.label)}</a>`
  ).join("");
  return `
    <details class="info-toc">
      <summary class="info-toc__toggle">
        <span>Jump to Section</span>
        <span class="info-toc__toggle-chevron" aria-hidden="true"></span>
      </summary>
      <nav class="info-toc__links" aria-label="Chicago Trip Guide sections">${links}</nav>
    </details>
  `;
}

export function renderBackLink() {
  return `<a class="tg-back-link" href="/chicago-trip-guide.html">&larr; Back to Chicago Trip Guide</a>`;
}

// Shared entry point for the five CSV-driven place-list sub-pages
// (Must-See, Free Things, Rooftops, Fun, K-pop placeholder excluded —
// that one has its own bespoke script since it isn't a card list).
export async function initPlacePage({ rootId, pageName, heroTitle, heroSubtitle }) {
  const root = document.getElementById(rootId);
  if (!root) return;

  try {
    const rows = await fetchTripGuideRows();
    const items = rowsForPage(rows, pageName);

    root.innerHTML = `
      ${renderHero(heroTitle, heroSubtitle)}
      ${renderTripGuideNav()}
      <div class="tg-back-wrap">${renderBackLink()}</div>
      <div class="tg-grid">${items.map(renderPlaceCard).join("")}</div>
      <div class="tg-back-wrap">${renderBackLink()}</div>
    `;
    mountInstagramEmbeds(root);
  } catch (err) {
    console.error(err);
    root.innerHTML = `
      ${renderHero(heroTitle, heroSubtitle)}
      <p class="info-error">Couldn't load this page right now. Please try again shortly.</p>
    `;
  }
}
