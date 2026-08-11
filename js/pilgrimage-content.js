// Detail-panel markup for a Chicago Trip Guide spot — shared by the desktop
// slide-in panel and the mobile bottom sheet, mirroring vendor-content.js's
// role for the Welcome Partners Map.

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderCta(link, label, extraClass) {
  if (!link || !label) return "";
  const cls = extraClass ? `panel-body__cta ${extraClass}` : "panel-body__cta";
  return `<a class="${cls}" href="${escapeHtml(link)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
}

export function renderSpotDetailHTML(spot) {
  return `
    <div class="panel-body panel-body--no-photo">
      <h2 class="panel-body__name">${escapeHtml(spot.name)}</h2>
      ${spot.address ? `<p class="panel-body__address">${escapeHtml(spot.address)}</p>` : ""}
      ${spot.content ? `<p class="panel-body__content">${escapeHtml(spot.content)}</p>` : ""}
      ${renderCta(spot.officialLink, spot.officialLinkText)}
      ${renderCta(spot.secondaryLink, spot.secondaryLinkText, "panel-body__cta--secondary")}
      <p class="panel-body__disclaimer">Info might not be 100% accurate, please forgive us! 💜</p>
    </div>
  `;
}
