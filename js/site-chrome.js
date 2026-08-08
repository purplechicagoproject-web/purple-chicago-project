import { NAV_ITEMS } from "./nav-data.js";

const ICONS = {
  instagram:
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="2.5" width="19" height="19" rx="5" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.6" stroke="currentColor" stroke-width="1.8"/><circle cx="17.6" cy="6.4" r="1.15" fill="currentColor"/></svg>',
  facebook:
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.5 8.5H16.5V5.2C16.16 5.15 15 5.05 13.65 5.05C10.82 5.05 8.9 6.78 8.9 9.95V12.5H5.8V16.2H8.9V22H12.7V16.2H15.68L16.15 12.5H12.7V10.32C12.7 9.25 12.99 8.5 14.5 8.5Z" fill="currentColor"/></svg>',
  email:
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 6L12 12.5L20.5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

function navLinksHTML(activeSlug, extraClass) {
  return NAV_ITEMS.map((item) => {
    const current = item.slug === activeSlug ? ' aria-current="page"' : "";
    // Partner Map is the site's core feature — call it out everywhere the
    // nav appears, not just when it happens to be the active page.
    const featured = item.slug === "map" ? ` ${extraClass}--featured` : "";
    return `<a class="${extraClass}${featured}" href="${item.href}"${current}>${item.label}</a>`;
  }).join("");
}

function renderHeader(activeSlug) {
  const root = document.getElementById("site-header-root");
  if (!root) return;

  root.innerHTML = `
    <header class="site-header" id="site-header">
      <a class="site-header__brand" href="/" aria-label="Home">
        <img src="/images/site/white-PChiP-logo.png" alt="Site logo" />
      </a>
      <nav class="site-nav site-nav--desktop">
        ${navLinksHTML(activeSlug, "site-nav__link")}
      </nav>
      <button type="button" class="site-header__hamburger" id="site-header-hamburger" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </header>
    <nav class="site-nav site-nav--mobile" id="site-nav-mobile">
      ${navLinksHTML(activeSlug, "site-nav__link")}
    </nav>
  `;

  initMobileMenu();
}

function renderFooter() {
  const root = document.getElementById("site-footer-root");
  if (!root) return;

  root.innerHTML = `
    <footer class="site-footer">
      <div class="site-footer__col site-footer__nav">
        <nav>${navLinksHTML(null, "site-footer__link")}</nav>
      </div>
      <div class="site-footer__col site-footer__contact">
        <p class="site-footer__cta">Got a spot to feature or something to add? Reach out!</p>
        <div class="site-footer__socials">
          <a href="https://www.instagram.com/purplechicagoproject/" target="_blank" rel="noopener" aria-label="Instagram">${ICONS.instagram}</a>
          <a href="https://www.facebook.com/profile.php?id=61590208066088" target="_blank" rel="noopener" aria-label="Facebook">${ICONS.facebook}</a>
          <a href="mailto:purplechicagoproject@gmail.com" aria-label="Email">${ICONS.email}</a>
        </div>
      </div>
      <div class="site-footer__col site-footer__disclaimer">
        <h3>Disclaimer</h3>
        <p>Purple Chicago Project is an independent, fan-run initiative and is not affiliated with BTS, BIGHIT MUSIC, HYBE, or Soldier Field. We do our best to keep event details, venue policies, and schedules accurate and up to date, but please confirm important information with official organizers before finalizing your plans.</p>
        <p class="site-footer__copyright">&copy; 2026 Mun Layers Media LLC. All rights reserved.</p>
      </div>
    </footer>
  `;
}

function initMobileMenu() {
  const hamburger = document.getElementById("site-header-hamburger");
  const mobileNav = document.getElementById("site-nav-mobile");
  if (!hamburger || !mobileNav) return;

  function setOpen(isOpen) {
    mobileNav.classList.toggle("is-open", isOpen);
    hamburger.classList.toggle("is-active", isOpen);
    hamburger.setAttribute("aria-expanded", String(isOpen));
  }

  hamburger.addEventListener("click", () => setOpen(!mobileNav.classList.contains("is-open")));
  mobileNav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
}

export function initSiteChrome() {
  const activeSlug = document.body.dataset.page || null;
  renderHeader(activeSlug);
  renderFooter();
}

initSiteChrome();
