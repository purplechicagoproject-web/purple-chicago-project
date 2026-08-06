// Shared markup + interaction wiring for a vendor's detail content — used by
// both the desktop slide-in panel (panel.js) and the mobile marker popup
// (popup.js), so the two surfaces never drift out of sync.
import { trackWebsiteClick } from "./tracking.js";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function renderCarousel(images, idPrefix) {
  if (images.length === 0) return "";
  const slides = images
    .map(
      (src, i) =>
        `<div class="carousel__slide"><img src="${escapeHtml(src)}" alt="" loading="${i === 0 ? "eager" : "lazy"}" /></div>`
    )
    .join("");
  const dots = images
    .map(
      (_, i) =>
        `<button type="button" class="carousel__dot${i === 0 ? " is-active" : ""}" data-dot="${i}" aria-label="Photo ${i + 1}"></button>`
    )
    .join("");
  const arrows =
    images.length > 1
      ? `<button type="button" class="carousel__arrow carousel__arrow--prev" data-carousel-prev aria-label="Previous photo">&#8249;</button>
         <button type="button" class="carousel__arrow carousel__arrow--next" data-carousel-next aria-label="Next photo">&#8250;</button>`
      : "";

  return `
    <div class="carousel" data-carousel="${idPrefix}">
      <div class="carousel__track" data-carousel-track>${slides}</div>
      ${arrows}
      ${images.length > 1 ? `<div class="carousel__dots">${dots}</div>` : ""}
    </div>
  `;
}

export function renderVendorDetailHTML(point, idPrefix) {
  const { vendor, label, address } = point;
  const images = vendor.webImages.length ? vendor.webImages : vendor.images;

  const nameLine = label
    ? `${escapeHtml(vendor.name)} <span class="panel-body__location-label">— ${escapeHtml(label)}</span>`
    : escapeHtml(vendor.name);

  return `
    ${renderCarousel(images, idPrefix)}
    <div class="panel-body">
      ${vendor.category ? `<span class="panel-body__category">${escapeHtml(vendor.category)}</span>` : ""}
      <h2 class="panel-body__name">${nameLine}</h2>
      <p class="panel-body__address">${escapeHtml(address)}</p>
      ${
        vendor.website
          ? `<a class="panel-body__website" href="${escapeHtml(vendor.website)}" target="_blank" rel="noopener">${escapeHtml(domainOf(vendor.website))}</a>`
          : ""
      }
      ${
        vendor.offerDetails
          ? `<div class="panel-body__offer">
               ${vendor.offerType ? `<span class="panel-body__offer-tag">${escapeHtml(vendor.offerType)}</span>` : ""}
               <p class="panel-body__offer-text">${escapeHtml(vendor.offerDetails)}</p>
             </div>`
          : ""
      }
      ${
        vendor.website
          ? `<a class="panel-body__cta" data-website-cta href="${escapeHtml(vendor.website)}" target="_blank" rel="noopener">Visit Website</a>`
          : ""
      }
    </div>
  `;
}

// Wires carousel controls + click tracking inside `containerEl` (which must
// already contain the HTML from renderVendorDetailHTML for this point).
export function wireVendorDetailInteractions(containerEl, point) {
  const images = point.vendor.webImages.length ? point.vendor.webImages : point.vendor.images;
  let index = 0;

  const track = containerEl.querySelector("[data-carousel-track]");
  const dots = containerEl.querySelectorAll(".carousel__dot");

  function goTo(i) {
    if (images.length === 0) return;
    index = (i + images.length) % images.length;
    if (track) track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((dot, di) => dot.classList.toggle("is-active", di === index));
  }

  containerEl.querySelector("[data-carousel-prev]")?.addEventListener("click", () => goTo(index - 1));
  containerEl.querySelector("[data-carousel-next]")?.addEventListener("click", () => goTo(index + 1));
  dots.forEach((dot) => dot.addEventListener("click", () => goTo(Number(dot.dataset.dot))));

  const carouselEl = containerEl.querySelector("[data-carousel]");
  if (carouselEl && images.length > 1) {
    let touchStartX = null;
    carouselEl.addEventListener("touchstart", (e) => {
      touchStartX = e.touches[0].clientX;
    });
    carouselEl.addEventListener("touchend", (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) goTo(index + (dx < 0 ? 1 : -1));
      touchStartX = null;
    });
  }

  containerEl
    .querySelector("[data-website-cta]")
    ?.addEventListener("click", () => trackWebsiteClick(point.vendor.slug));

  return { goTo, get index() { return index; } };
}
