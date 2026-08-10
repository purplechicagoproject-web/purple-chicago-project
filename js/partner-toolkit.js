import { guardPage } from "./partner-toolkit-auth.js";
import { renderToolkitHubNav } from "./partner-toolkit-content.js";

function renderHero() {
  return `
    <div class="info-hero">
      <div class="info-hero__text">
        <h1 class="info-hero__title">Partner Toolkit</h1>
        <p class="info-hero__subtitle">Guides and idea references for Purple Chicago Project partners.</p>
      </div>
    </div>
  `;
}

function renderHubGrid() {
  return `
    <div class="tg-hub-grid">
      <a class="tg-hub-card" href="/partner-toolkit/partner-guide.html">
        <h2 class="tg-hub-card__title">Partner Guide</h2>
        <p class="tg-hub-card__subtitle">What to know as a partner</p>
      </a>
      <a class="tg-hub-card" href="/partner-toolkit/idea-reference.html">
        <h2 class="tg-hub-card__title">Idea Reference</h2>
        <p class="tg-hub-card__subtitle">Inspiration and examples</p>
      </a>
    </div>
  `;
}

function main() {
  const root = document.getElementById("partner-toolkit-root");
  if (!root) return;

  guardPage(root, () => {
    root.innerHTML = `
      ${renderHero()}
      ${renderToolkitHubNav()}
      ${renderHubGrid()}
    `;
  });
}

main();
