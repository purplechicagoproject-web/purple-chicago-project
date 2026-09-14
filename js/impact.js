import { loadInstagramEmbedScript, processInstagramEmbeds, renderInstagramBlockquote } from "./instagram-embed.js";

const THANKS_INSTAGRAM_URL = "https://www.instagram.com/p/DcwTar9KPKa/";
const LANG_STORAGE_KEY = "pchip_impact_lang";

// Cycled onto the stat cards / quote cards for a bit of color variety —
// each name maps to a pastel tint of an existing brand accent color (see
// the .impact-stat-card--* / .impact-quote-card--* rules in main.css),
// not a new palette.
const STAT_TINTS = ["cream", "purple", "gold", "magenta", "green"];
const QUOTE_TINTS = ["purple", "gold", "cream", "green"];

// No sheet behind this page — the numbers are a one-time campaign recap,
// not content that changes without a code change anyway. Content is kept
// bilingual here (rather than a site-wide i18n system, which nothing else
// on the site has) since this is the one page built to be shared with a
// Korean-reading ARMY audience directly.
const CONTENT = {
  en: {
    heroTitle: ["No budget.", "Just ARMY.", "A big first step."],
    heroSubtitle:
      "In August 2026, BTS came to Chicago. We wanted to make sure they were welcomed the way they deserved.",
    stats: [
      { number: "546,120", label: "Social media reach" },
      { number: "12", label: "Local businesses onboarded as partners" },
      { number: "2", label: "Official welcome videos from the Mayor of Chicago" },
      { number: "442", label: "Survey responses collected after the concerts" },
      { number: "Under $300", label: "Total campaign spend" },
    ],
    partnerAlt: "Welcome Army window sticker with a QR code, displayed at one of PChiP's partner businesses",
    partnerCaption: "One of our 12 Welcome Partners, ready to greet ARMY",
    numbersTitle: "What the Numbers Say",
    highlights: [
      { number: "120,000", suffix: " tickets sold across two nights." },
      { number: "77%", suffix: " of visitors came from outside Chicago." },
      { number: "~$1,230", suffix: " per person spent locally — excluding tickets and merchandise." },
      { number: "0", suffix: " out of 442 respondents said they probably wouldn't return." },
      { prefix: "One partner business saw revenue jump ", number: "176%", suffix: "." },
    ],
    quotesTitle: "What ARMY Said",
    quotes: [
      "This was my third time in Chicago and I fall in love every time. Please bring them back here for the next tour.",
      "From the moment I got off the plane, Chicagoans were so welcoming. I traveled alone and never once felt out of place.",
      "The Purple Chicago Project website completely eased my anxiety about this trip. I saw you on the Chicago news too, and felt so proud for an ARMY I've never met but who helped me so much.",
      "I loved Chicago so much I already booked my next trip for April.",
    ],
    quoteAttribution: "— ARMY",
    learnedTitle: "What We Learned",
    learnedParas: [
      "This project stands out not because it was perfect, but because we were honest about what worked and what didn't.",
      "Free-item offers got shared three times more than discounts. Spending by downtown visitors clustered in specific corridors rather than spreading citywide. Of the people who actually found our partner map, 62% went on to visit a business — but many never knew the map existed.",
      "Every one of these is a lesson for what comes next.",
    ],
    closingTitle: "This was the beginning, and now we know each other",
    closingParas: [
      "The Mayor's welcome video. Illinois's official proclamation. Willis Tower lit purple. This time, we were all moving independently, without even knowing about each other. And we still pulled it off — under one name: ARMY.",
      "It's different now. We know each other. We know what needs to happen. We have a map of where ARMY stayed, and 442 voices worth of data.",
      "And most importantly, we made a successful first step toward Chicago recognizing BTS and ARMY as a real factor in the city's growth.",
      "None of this was one person's work. It was ARMY, together, carrying the same sense of purpose.",
    ],
    thanksTitle: "A thank-you, from us to you",
    finalLine: "By the next tour, we won't be moving separately anymore.",
  },
  ko: {
    heroTitle: ["예산은 없었다.", "아미만 있었다.", "그래도 큰 첫걸음."],
    heroSubtitle: "2026년 8월, BTS가 시카고에 왔습니다. 우리는 그들이 받아 마땅한 환영을 받을 수 있도록 하고 싶었습니다.",
    stats: [
      { number: "546,120", label: "소셜 미디어 도달 수" },
      { number: "12", label: "파트너로 참여한 지역 업체 수" },
      { number: "2", label: "시카고 시장의 공식 환영 영상" },
      { number: "442", label: "콘서트 이후 수집된 설문 응답 수" },
      { number: "$300 미만", label: "총 캠페인 지출" },
    ],
    partnerAlt: "QR코드가 담긴 'Welcome Army' 안내 스티커, PChiP 파트너 업체에 게시된 모습",
    partnerCaption: "12개 파트너 업체 중 한 곳, 아미를 맞이할 준비",
    numbersTitle: "숫자가 말해주는 것",
    highlights: [
      { number: "120,000", suffix: "장, 이틀간 판매된 티켓 수." },
      { number: "77%", suffix: "의 방문객이 시카고 외 지역에서 왔습니다." },
      { number: "약 $1,230", suffix: " — 1인당 현지 지출액 (티켓·굿즈 제외)." },
      { number: "0명", suffix: " — 442명의 응답자 중 다시 오지 않겠다고 답한 인원." },
      { prefix: "한 파트너 업체의 매출이 ", number: "176%", suffix: " 급증했습니다." },
    ],
    quotesTitle: "아미가 전한 말",
    quotes: [
      "시카고는 이번이 세 번째인데 올 때마다 반하게 돼요. 다음 투어에도 꼭 다시 와주세요.",
      "비행기에서 내리는 순간부터 시카고 사람들은 정말 따뜻하게 맞아줬어요. 혼자 여행했는데 단 한 번도 낯설다고 느낀 적이 없었어요.",
      "Purple Chicago Project 웹사이트 덕분에 이번 여행에 대한 불안이 완전히 사라졌어요. 시카고 뉴스에서도 봤는데, 만난 적도 없는 아미가 이렇게 큰 도움을 준 게 정말 자랑스러웠어요.",
      "시카고가 너무 좋아서 벌써 4월 여행을 예약했어요.",
    ],
    quoteAttribution: "— 아미",
    learnedTitle: "우리가 배운 것",
    learnedParas: [
      "이 프로젝트가 특별한 이유는 완벽해서가 아니라, 무엇이 통했고 무엇이 통하지 않았는지 솔직하게 밝혔기 때문입니다.",
      "무료 증정 혜택은 할인 혜택보다 3배 더 많이 공유됐습니다. 다운타운 방문객의 소비는 도시 전역이 아닌 특정 구역에 집중됐습니다. 파트너 지도를 실제로 발견한 사람 중 62%는 업체를 방문했지만, 많은 사람이 지도의 존재 자체를 몰랐습니다.",
      "이 모든 것이 다음을 위한 교훈입니다.",
    ],
    closingTitle: "이건 시작이었고, 이제 우리는 서로를 압니다",
    closingParas: [
      "시장의 환영 영상. 일리노이 주의 공식 선언문. 보랏빛으로 물든 윌리스 타워. 이번엔 다들 서로의 존재도 모른 채 각자 움직였습니다. 그런데도 우리는 결국 해냈습니다 — 단 하나의 이름 아래: 아미.",
      "이제는 다릅니다. 우리는 서로를 압니다. 무엇을 해야 하는지도 압니다. 아미가 머문 곳의 지도가 있고, 442명의 목소리가 담긴 데이터가 있습니다.",
      "그리고 가장 중요한 건, 시카고가 BTS와 아미를 도시 성장의 실질적인 요인으로 인식하게 만드는 성공적인 첫걸음을 뗐다는 것입니다.",
      "이 모든 건 한 사람의 힘으로 된 일이 아닙니다. 같은 목적의식을 품은 아미가 함께 이뤄낸 일입니다.",
    ],
    thanksTitle: "우리가 전하는 감사 인사",
    finalLine: "다음 투어 땐, 더 이상 따로 움직이지 않을 겁니다.",
  },
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getInitialLang() {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === "en" || saved === "ko") return saved;
  } catch {
    // ignore private-mode / quota errors
  }
  return "en";
}

let currentLang = getInitialLang();

function renderLangToggle(lang) {
  return `
    <div class="impact-lang-toggle" role="group" aria-label="Language / 언어">
      <button type="button" class="impact-lang-btn${lang === "en" ? " is-active" : ""}" data-lang="en">EN</button>
      <button type="button" class="impact-lang-btn${lang === "ko" ? " is-active" : ""}" data-lang="ko">KO</button>
    </div>
  `;
}

function renderHero(c, lang) {
  const titleLines = c.heroTitle
    .map((line) => `<span class="impact-hero__line">${escapeHtml(line)}</span>`)
    .join("");
  return `
    <section class="impact-hero">
      ${renderLangToggle(lang)}
      <div class="impact-hero__inner">
        <h1 class="impact-hero__title">${titleLines}</h1>
        <p class="impact-hero__subtitle">${escapeHtml(c.heroSubtitle)}</p>
      </div>
    </section>
  `;
}

function renderStats(c) {
  return `
    <section class="impact-stats">
      <div class="impact-stats__layout">
        <div class="impact-stat-grid">
          ${c.stats
            .map(
              (s, i) => `
            <div class="impact-stat-card impact-stat-card--${STAT_TINTS[i % STAT_TINTS.length]}">
              <span class="impact-stat-card__number">${escapeHtml(s.number)}</span>
              <span class="impact-stat-card__label">${escapeHtml(s.label)}</span>
            </div>
          `
            )
            .join("")}
        </div>
        <figure class="impact-partner">
          <img class="impact-partner__img" src="/images/impact-web/partners-2026.jpg" alt="${escapeHtml(c.partnerAlt)}" loading="lazy" />
          <figcaption class="impact-partner__caption">${escapeHtml(c.partnerCaption)}</figcaption>
        </figure>
      </div>
    </section>
  `;
}

function renderHighlights(c) {
  return `
    <section class="impact-highlights">
      <h2 class="impact-highlights__title">${escapeHtml(c.numbersTitle)}</h2>
      <div class="impact-highlight-list">
        ${c.highlights
          .map(
            (h, i) =>
              `<div class="impact-highlight${i === 0 ? " impact-highlight--lead" : ""}">` +
              `<span class="impact-highlight__index">[0${i + 1}]</span>` +
              `<span class="impact-highlight__content">` +
              (h.prefix ? `<span class="impact-highlight__text">${escapeHtml(h.prefix)}</span>` : "") +
              `<span class="impact-highlight__number">${escapeHtml(h.number)}</span>` +
              `<span class="impact-highlight__text">${escapeHtml(h.suffix)}</span>` +
              `</span>` +
              `</div>`
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderQuotes(c) {
  return `
    <section class="impact-quotes">
      <h2 class="impact-quotes__title">${escapeHtml(c.quotesTitle)}</h2>
      <div class="impact-quote-grid">
        ${c.quotes
          .map(
            (q, i) => `
          <blockquote class="impact-quote-card impact-quote-card--${QUOTE_TINTS[i % QUOTE_TINTS.length]}">
            <span class="impact-quote-card__mark" aria-hidden="true">&ldquo;</span>
            <p class="impact-quote-card__text">${escapeHtml(q)}</p>
            <cite class="impact-quote-card__attribution">${escapeHtml(c.quoteAttribution)}</cite>
          </blockquote>
        `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderLearned(c) {
  return `
    <section class="impact-learned">
      <h2 class="impact-learned__title">${escapeHtml(c.learnedTitle)}</h2>
      <div class="impact-learned__body">
        <p class="impact-learned__para impact-learned__para--lead">${escapeHtml(c.learnedParas[0])}</p>
        <p class="impact-learned__para">${escapeHtml(c.learnedParas[1])}</p>
        <p class="impact-learned__para">${escapeHtml(c.learnedParas[2])}</p>
      </div>
    </section>
  `;
}

function renderClosing(c) {
  return `
    <section class="impact-closing">
      <div class="impact-closing__inner">
        <h2 class="impact-closing__title">${escapeHtml(c.closingTitle)}</h2>
        <p class="impact-closing__para">${escapeHtml(c.closingParas[0])}</p>
        <p class="impact-closing__para">${escapeHtml(c.closingParas[1])}</p>
        <p class="impact-closing__para">${escapeHtml(c.closingParas[2])}</p>
        <p class="impact-closing__para impact-closing__para--final">${escapeHtml(c.closingParas[3])}</p>
      </div>
    </section>
  `;
}

function renderThanks(c) {
  return `
    <section class="impact-thanks">
      <h2 class="impact-thanks__title">${escapeHtml(c.thanksTitle)}</h2>
      <div class="impact-thanks__embed">
        ${renderInstagramBlockquote(THANKS_INSTAGRAM_URL, escapeHtml)}
      </div>
      <p class="impact-thanks__final">${escapeHtml(c.finalLine)}</p>
    </section>
  `;
}

function wireLangToggle(root) {
  root.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      if (lang === currentLang) return;
      currentLang = lang;
      try {
        localStorage.setItem(LANG_STORAGE_KEY, lang);
      } catch {
        // ignore private-mode / quota errors
      }
      render();
    });
  });
}

function render() {
  const root = document.getElementById("impact-root");
  if (!root) return;

  const c = CONTENT[currentLang];
  document.documentElement.lang = currentLang;

  root.innerHTML = [
    renderHero(c, currentLang),
    renderStats(c),
    renderHighlights(c),
    renderQuotes(c),
    renderLearned(c),
    renderClosing(c),
    renderThanks(c),
  ].join("");

  wireLangToggle(root);
  // The Instagram blockquote is rebuilt every render (language toggle
  // included), so embed.js needs to re-process it each time — process()
  // is safe to call repeatedly, it only converts blockquotes it hasn't
  // already turned into an iframe.
  loadInstagramEmbedScript().then(processInstagramEmbeds);
}

render();
