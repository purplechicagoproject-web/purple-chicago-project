import { guardPage } from "./partner-toolkit-auth.js";
import { fetchPartnerToolkitRows, rowsForPage } from "./partner-toolkit-data.js";
import {
  renderAnchorToc,
  initAnchorToc,
  renderIdeaGroups,
  renderBackLink,
  mountInstagramEmbeds,
} from "./partner-toolkit-content.js";

const PAGE_NAME = "Idea Reference";

function renderHero() {
  return `
    <div class="info-hero">
      <div class="info-hero__text">
        <h1 class="info-hero__title">Idea Reference</h1>
        <p class="info-hero__subtitle">Inspiration and examples for Purple Chicago Project partners.</p>
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
      ${renderIdeaGroups(items)}
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
  const root = document.getElementById("idea-reference-root");
  if (!root) return;

  guardPage(root, () => loadContent(root));
}

main();
