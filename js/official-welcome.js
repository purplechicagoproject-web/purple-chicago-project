import { parseCsv, rowsToObjects } from "./csv.js";

// Paste the sheet's "Publish to web -> CSV" link here once it's ready. Until
// then the page renders the fallback content below, so it's ready to ship
// today and switches over to the sheet automatically the moment this is set.
const CSV_URL = "";

// Same shape the sheet will use: order, section_title, content_type,
// content, video_url, image_file, button_text, button_link. Ships today with
// the launch content; future rows (e.g. a Willis Tower lighting photo) just
// get added to the sheet — always rendered fully expanded, never behind an
// accordion, same as these.
const FALLBACK_ROWS = [
  {
    order: 1,
    section_title: "",
    content_type: "text",
    content: "This week, Chicago and Illinois made it official: BTS and ARMY are welcome here.",
    video_url: "",
    image_file: "",
    button_text: "",
    button_link: "",
  },
  {
    order: 2,
    section_title: "",
    content_type: "video",
    content: "",
    video_url: "https://youtu.be/_RrI53Qr-zE",
    image_file: "",
    button_text: "",
    button_link: "",
  },
  {
    order: 3,
    section_title: "",
    content_type: "text",
    content: "From official proclamations to public celebrations, the city and state have shown up in a big way.",
    video_url: "",
    image_file: "",
    button_text: "",
    button_link: "",
  },
  {
    order: 4,
    section_title: "",
    content_type: "image",
    content:
      "On August 14, 2026, Illinois Governor JB Pritzker signed an official proclamation declaring August 27–28 “BTS Day” in the State of Illinois, recognizing the group's global cultural impact and philanthropy.",
    video_url: "",
    image_file: "images/official-welcome/BTS-Day.jpg",
    button_text: "Read the Full Story",
    button_link:
      "https://chicago.suntimes.com/arts-and-culture/2026/08/20/gov-jb-pritzker-declares-bts-day-in-illinois-in-honor-of-k-pop-groups-visit-bts-chicago-soldier-field",
  },
];

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
function toYouTubeEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.pathname.startsWith("/embed/")) {
      return url;
    }
    const videoId = u.searchParams.get("v");
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
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

function renderTextBlock(row) {
  return `
    <section class="ow-block">
      ${renderHeading(row.section_title)}
      ${renderParagraphs(row.content)}
    </section>
  `;
}

function renderVideoBlock(row) {
  const embedUrl = toYouTubeEmbedUrl(row.video_url);
  return `
    <section class="ow-block">
      ${renderHeading(row.section_title)}
      <div class="ow-video">
        <iframe
          src="${escapeHtml(embedUrl)}"
          title="${escapeHtml(row.section_title || "Video")}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>
      ${renderParagraphs(row.content)}
    </section>
  `;
}

function renderImageBlock(row) {
  return `
    <section class="ow-block">
      ${renderHeading(row.section_title)}
      <img class="ow-image-block__img" src="${escapeHtml(toRootAbsolute(row.image_file))}" alt="${escapeHtml(row.section_title || "")}" loading="lazy" />
      ${renderParagraphs(row.content)}
      ${renderButton(row.button_text, row.button_link)}
    </section>
  `;
}

function renderBlock(row) {
  if (row.content_type === "video") return renderVideoBlock(row);
  if (row.content_type === "image") return renderImageBlock(row);
  return renderTextBlock(row);
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

async function loadRows() {
  if (!CSV_URL) return FALLBACK_ROWS;

  const res = await fetch(CSV_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
  const text = await res.text();
  const rows = rowsToObjects(parseCsv(text)).sort((a, b) => Number(a.order) - Number(b.order));
  return rows.length ? rows : FALLBACK_ROWS;
}

async function main() {
  const root = document.getElementById("official-welcome-root");
  if (!root) return;

  let rows = FALLBACK_ROWS;
  try {
    rows = await loadRows();
  } catch (err) {
    console.error(err);
  }

  root.innerHTML = `
    ${renderBanner()}
    <div class="ow-blocks">
      ${rows.map(renderBlock).join("")}
    </div>
  `;
}

main();
