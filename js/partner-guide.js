import { guardPage } from "./partner-toolkit-auth.js";
import { fetchPartnerToolkitRows, rowsForPage } from "./partner-toolkit-data.js";
import {
  renderAnchorToc,
  initAnchorToc,
  renderSection,
  renderBackLink,
  mountInstagramEmbeds,
} from "./partner-toolkit-content.js";

const PAGE_NAME = "Partner Guide";

function renderHero() {
  return `
    <div class="info-hero">
      <div class="info-hero__text">
        <h1 class="info-hero__title">Partner Guide</h1>
        <p class="info-hero__subtitle">What to know as a Purple Chicago Project partner.</p>
      </div>
    </div>
  `;
}

async function loadContent(root) {
  try {
    const rows = await fetchPartnerToolkitRows();
    const items = rowsForPage(rows, PAGE_NAME);

    root.innerHTML = `
      ${renderHero()}
      ${renderAnchorToc(items)}
      <div class="tg-back-wrap">${renderBackLink()}</div>
      <div class="info-sections">${items.map(renderSection).join("")}</div>
      <div class="tg-back-wrap">${renderBackLink()}</div>
    `;

    mountInstagramEmbeds(root);
    initAnchorToc(root);
  } catch (err) {
    console.error(err);
    root.innerHTML = `
      ${renderHero()}
      <p class="info-error">Couldn't load this page right now. Please try again shortly.</p>
    `;
  }
}

function main() {
  const root = document.getElementById("partner-guide-root");
  if (!root) return;

  guardPage(root, () => loadContent(root));
}

main();
