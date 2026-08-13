// Shared hub-nav/back-link markup for the Press section — mirrors
// partner-toolkit-content.js's role for the Partner Toolkit, minus the
// password gate (Press is fully public, no noindex).

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// The hub's two fixed sub-pages — not CSV-driven, so shared verbatim by
// the hub page's own nav and card grid.
export const PRESS_LINKS = [
  { href: "/press/media-guide.html", label: "Media Guide" },
  { href: "/press/know-before-you-cover.html", label: "Know Before You Cover" },
];

export function renderPressHubNav() {
  const links = PRESS_LINKS.map(
    (l) => `<a class="info-toc__link" href="${l.href}">${escapeHtml(l.label)}</a>`
  ).join("");
  return `
    <details class="info-toc">
      <summary class="info-toc__toggle">
        <span>Jump to Section</span>
        <span class="info-toc__toggle-chevron" aria-hidden="true"></span>
      </summary>
      <nav class="info-toc__links" aria-label="Press sections">${links}</nav>
    </details>
  `;
}

// In-page anchor "Jump to Section" nav for a sub-page, given whichever
// {slug, label} links it actually has (fixed headings for Media Guide,
// data-driven categories for Know Before You Cover).
export function renderPressToc(links) {
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

export function renderBackLink() {
  return `<a class="tg-back-link" href="/press.html">&larr; Back to Press</a>`;
}
