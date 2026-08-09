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
      <div class="tg-grid">${items.map(renderPlaceCard).join("")}</div>
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
