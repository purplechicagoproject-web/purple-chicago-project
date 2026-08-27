import { renderPressHubNav } from "./press-content.js";

function renderHero() {
  return `
    <div class="info-hero">
      <img class="info-hero__art" src="/images/press/photographer.png" alt="Illustration of a photographer taking a photo" />
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
        <div class="tg-hub-card__heading">
          <img class="info-section__icon" src="/images/press/do-don%27t.png" alt="" />
          <div class="tg-hub-card__heading-text">
            <h2 class="tg-hub-card__title">Media Guide</h2>
            <p class="tg-hub-card__subtitle">Background, terminology, and guidance for coverage</p>
          </div>
        </div>
      </a>
      <a class="tg-hub-card" href="/press/know-before-you-cover.html">
        <div class="tg-hub-card__heading">
          <img class="info-section__icon" src="/images/press/pen.png" alt="" />
          <div class="tg-hub-card__heading-text">
            <h2 class="tg-hub-card__title">Know Before You Cover</h2>
            <p class="tg-hub-card__subtitle">Prior coverage and context, by category</p>
          </div>
        </div>
      </a>
    </div>
  `;
}

function renderContactSection() {
  return `
    <div class="info-sections">
      <div class="info-section">
        <p class="info-text">We put this page together to make covering this weekend as easy as possible, background on BTS and ARMY, context on prior coverage, and a direct line to us for anything else you need.</p>
        <h2 class="tips-subhead">Press Inquiries</h2>
        <p class="info-text">Purple Chicago Project is happy to provide our official press release, additional photos, and background materials for media coverage. For the full press release or to schedule an interview, please reach out directly.</p>
        <p class="info-text">
          📧 <a class="info-text__link" href="mailto:purplechicagoproject@gmail.com">purplechicagoproject@gmail.com</a><br />
          📷 <a class="info-text__link" href="https://www.instagram.com/purplechicagoproject/" target="_blank" rel="noopener">@purplechicagoproject</a>
        </p>
      </div>
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
    ${renderContactSection()}
  `;
}

main();
