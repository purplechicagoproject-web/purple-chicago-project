import { renderPressHubNav } from "./press-content.js";

function renderHero() {
  return `
    <div class="info-hero">
      <div class="info-hero__text">
        <h1 class="info-hero__title">Press</h1>
        <p class="info-hero__subtitle">Resources for press and media covering Purple Chicago Project.</p>
      </div>
    </div>
  `;
}

function renderHubGrid() {
  return `
    <div class="tg-hub-grid">
      <a class="tg-hub-card" href="/press/media-guide.html">
        <h2 class="tg-hub-card__title">Media Guide</h2>
        <p class="tg-hub-card__subtitle">Background, terminology, and guidance for coverage</p>
      </a>
      <a class="tg-hub-card" href="/press/know-before-you-cover.html">
        <h2 class="tg-hub-card__title">Know Before You Cover</h2>
        <p class="tg-hub-card__subtitle">Prior coverage and context, by category</p>
      </a>
    </div>
  `;
}

function main() {
  const root = document.getElementById("press-root");
  if (!root) return;

  root.innerHTML = `
    ${renderHero()}
    ${renderPressHubNav()}
    ${renderHubGrid()}
  `;
}

main();
