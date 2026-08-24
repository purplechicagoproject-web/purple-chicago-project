// Desktop-only "all partners" list view — the panel's default state before
// any pin has been clicked. Mirrors vendor-content.js's role (shared markup
// + interaction wiring) but under its own partner-list__* namespace, since
// this view has no photo/carousel and a different one-box-per-vendor shape.

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderPartnerListHTML(points) {
  const items = points
    .map((point, index) => {
      const nameLine = point.label
        ? `${escapeHtml(point.vendor.name)} <span class="partner-list__item-location-label">— ${escapeHtml(point.label)}</span>`
        : escapeHtml(point.vendor.name);

      return `
    <div class="partner-list__item">
      <h3 class="partner-list__item-name">${nameLine}</h3>
      <p class="partner-list__item-address">${escapeHtml(point.address)}</p>
      ${
        point.vendor.offerType
          ? `<span class="partner-list__item-offer">${escapeHtml(point.vendor.offerType)}</span>`
          : ""
      }
      <button type="button" class="partner-list__more-btn" data-list-index="${index}">More Information</button>
    </div>
  `;
    })
    .join("");

  return `
    <div class="partner-list">
      <h2 class="partner-list__title">All Partners</h2>
      ${items}
    </div>
  `;
}

// Wires each "More Information" button to `onSelect(point)` — the caller
// (panel.js) decides what that means (swap the panel over to that vendor's
// detail view).
export function wirePartnerListInteractions(containerEl, points, onSelect) {
  containerEl.querySelectorAll("[data-list-index]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onSelect(points[Number(btn.dataset.listIndex)]);
    });
  });
}
