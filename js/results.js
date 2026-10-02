// /results — copy loading and EN/KO. results.html already contains the
// English copy and every chart (scripts/build-results.py), so everything
// here is an enhancement: if this file fails, the page is still complete.
import { parseCsv, rowsToObjects } from "./csv.js";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQuwrR2Q-9O77PArWoxcHw4Rb_yNFScMNUwNMrotMoRxDTJqx8Xl_-hhrvjBZjbdgrvwiZpmRHmAvAC/pub?gid=1908916896&single=true&output=csv";
const LOCAL_COPY_URL = "/data/results-copy.csv";
const UI_COPY_URL = "/data/results-ui.csv";
const SHEET_TIMEOUT_MS = 4000;
const LANG_KEY = "pchip_results_lang";
const KO_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=East+Sea+Dokdo&family=Noto+Sans+KR:wght@400;700&display=swap";

const params = new URLSearchParams(location.search);
const root = document.documentElement;
const dict = {};
let lang = initialLang();

export const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function initialLang() {
  const fromUrl = params.get("lang");
  if (fromUrl === "en" || fromUrl === "ko") return fromUrl;
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "en" || saved === "ko") return saved;
  } catch {
    // storage unavailable (private mode) — default below
  }
  return "en";
}

export function getLang() {
  return lang;
}

export function t(id) {
  const entry = dict[id];
  if (!entry) return null;
  return lang === "ko" && entry.ko ? entry.ko : entry.en;
}

export function formatNum(raw) {
  const n = Number(String(raw).replace(/,/g, ""));
  if (!Number.isFinite(n)) return String(raw);
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function toDict(text) {
  const out = {};
  for (const row of rowsToObjects(parseCsv(text))) {
    if (row.id) out[row.id] = { en: row.en, ko: row.ko };
  }
  return out;
}

async function fetchText(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return res.text();
}

async function loadSheet() {
  // ?sheet=off simulates the sheet being unreachable (QA only).
  if (params.get("sheet") === "off") throw new Error("sheet disabled with ?sheet=off");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SHEET_TIMEOUT_MS);
  try {
    const copy = toDict(await fetchText(SHEET_URL, { signal: controller.signal, cache: "no-store" }));
    if (!copy.hero_title_1) throw new Error("sheet is missing expected rows");
    return copy;
  } finally {
    clearTimeout(timer);
  }
}

function ensureKoFonts() {
  if (document.getElementById("rs-ko-fonts")) return;
  const link = document.createElement("link");
  link.id = "rs-ko-fonts";
  link.rel = "stylesheet";
  link.href = KO_FONTS_HREF;
  document.head.appendChild(link);
}

export function applyCopy() {
  root.lang = lang;
  document.querySelectorAll("[data-t]").forEach((el) => {
    const value = t(el.dataset.t);
    if (value == null) return;
    el.textContent = el.hasAttribute("data-num") ? formatNum(value) : value;
  });
  document.querySelectorAll("[data-en]").forEach((el) => {
    el.textContent = el.dataset[lang] || el.dataset.en;
  });
  document.querySelectorAll("[data-t-alt]").forEach((el) => {
    const template = t(el.dataset.tAlt);
    if (template == null) return;
    const page = el.dataset.altPage ? t(el.dataset.altPage) || "" : "";
    el.alt = template.replace("{page}", page);
  });
  const description = t("meta_description");
  if (description) document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  const email = t("contact_email");
  if (email) document.querySelector('[data-t="contact_email"]')?.setAttribute("href", `mailto:${email}`);
  document.querySelectorAll(".rs-lang [data-lang]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
  });
  document.dispatchEvent(new CustomEvent("rs:copy", { detail: { lang } }));
}

function setLang(next) {
  if (next === lang) return;
  lang = next;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // ignore
  }
  if (lang === "ko") ensureKoFonts();
  applyCopy();
}

function wireLangButtons() {
  document.querySelectorAll(".rs-lang [data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });
}

// The sheet is the source; the local copy only fills in when the sheet
// doesn't answer within 4s. UI strings are always local. A KO reader gets
// the local copy right away (rather than English for up to 4s) and is
// upgraded to the sheet's text if it arrives in time.
async function loadCopy() {
  if (lang === "ko") ensureKoFonts();
  let sheetApplied = false;

  const local = Promise.all([fetchText(LOCAL_COPY_URL), fetchText(UI_COPY_URL)]).then(([copy, ui]) => ({
    copy: toDict(copy),
    ui: toDict(ui),
  }));

  local
    .then(({ copy, ui }) => {
      Object.assign(dict, ui);
      if (sheetApplied) return;
      Object.assign(dict, copy);
      if (lang !== "en") applyCopy();
    })
    .catch(() => {});

  try {
    const sheet = await loadSheet();
    const { ui } = await local.catch(() => ({ ui: {} }));
    Object.assign(dict, ui, sheet);
    sheetApplied = true;
    root.dataset.copySource = "sheet";
  } catch (err) {
    console.info("[results] Using the local copy of the sheet:", err.message);
    try {
      const { copy, ui } = await local;
      Object.assign(dict, ui, copy);
      root.dataset.copySource = "local";
    } catch (localErr) {
      console.warn("[results] Local copy unavailable; keeping the built-in English text.", localErr);
      root.dataset.copySource = "built-in";
      return;
    }
  }
  applyCopy();
}

// ------------------------------------------------------------ motion ---
// Everything below starts from the finished static page and only adds
// motion when the visitor hasn't asked for reduced motion.

export function motionOk() {
  return !reducedMotion.matches;
}

function syncMotionClass() {
  root.classList.toggle("rs-motion", motionOk());
}

// Reveal: every block fades up when it scrolls in, and again every time it
// comes back (no unobserve). Survey windows and their fixed charts are
// excluded — a transform on a window would trap its fixed chart.
const REVEAL_SELECTOR = [
  ".rs-hero__line", ".rs-intro", ".rs-intro__text", ".rs-h2", ".rs-h3", ".rs-doors__head", ".rs-door",
  ".rs-tabs__toggle", ".rs-tabs__item", ".rs-tabs__period", ".rs-screen", ".rs-reach__number",
  ".rs-reach__text", ".rs-chart", ".rs-video__label", ".rs-video__frame", ".rs-video__caption",
  ".rs-result", ".rs-win__value", ".rs-win__text", ".rs-quote", ".rs-windows__label", ".rs-survey__note",
  ".rs-small", ".rs-next__card", ".rs-next__closing", ".rs-press__art", ".rs-press__text",
  ".rs-contact__text", ".rs-contact__links li",
].join(",");

function wireReveal() {
  if (!motionOk() || !("IntersectionObserver" in window)) return;
  const page = document.querySelector(".rs-page");
  const targets = [...page.querySelectorAll(REVEAL_SELECTOR)].filter(
    (el) => !el.closest(".rs-assembly, .rs-win__chart, .rs-lang") && !el.parentElement.closest(REVEAL_SELECTOR)
  );
  const perParent = new Map();
  targets.forEach((el) => {
    const n = perParent.get(el.parentElement) || 0;
    perParent.set(el.parentElement, n + 1);
    el.style.setProperty("--rs-i", Math.min(n, 6));
    el.classList.add("rs-reveal");
  });
  const io = new IntersectionObserver(
    (entries) => entries.forEach((entry) => entry.target.classList.toggle("is-in", entry.isIntersecting)),
    { rootMargin: "0px 0px -6% 0px", threshold: 0.01 }
  );
  targets.forEach((el) => io.observe(el));
}

// EN|KO pill: slides with the Web Animations API (0.4s) so the move stays
// visible even while the language switch restyles the whole page.
let pillRect = null;

function placePill(animate = false) {
  const toggle = document.querySelector(".rs-lang");
  const pill = toggle?.querySelector(".rs-lang__pill");
  const pressed = toggle?.querySelector('[aria-pressed="true"]');
  if (!pill || !pressed) return;
  const next = { left: pressed.offsetLeft, width: pressed.offsetWidth };
  const prev = pillRect;
  pillRect = next;
  pill.style.left = `${next.left}px`;
  pill.style.width = `${next.width}px`;
  toggle.classList.add("is-ready");
  const moved = prev && (prev.left !== next.left || prev.width !== next.width);
  if (animate && moved && motionOk() && pill.animate) {
    pill.animate(
      [
        { left: `${prev.left}px`, width: `${prev.width}px` },
        { left: `${next.left}px`, width: `${next.width}px` },
      ],
      { duration: 400, easing: "cubic-bezier(0.65, 0, 0.35, 1)" }
    );
  }
}

function wirePill() {
  placePill();
  document.addEventListener("rs:copy", () => placePill(true));
  document.fonts?.ready.then(() => placePill());
  window.addEventListener("resize", () => placePill());
}

// Bars fill when their chart (or, for survey charts, their window) comes
// into view, and empty again when it leaves, so they refill on return.
function wireBarFills() {
  if (!motionOk() || !("IntersectionObserver" in window)) return;
  const byTarget = new Map();
  document.querySelectorAll(".rs-chart--bars, .rs-chart--stack").forEach((chart) => {
    chart.dataset.fill = "armed";
    const target = chart.closest(".rs-win") || chart;
    if (!byTarget.has(target)) byTarget.set(target, []);
    byTarget.get(target).push(chart);
  });
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        byTarget.get(entry.target).forEach((chart) => {
          chart.dataset.fill = entry.isIntersecting ? "done" : "armed";
        });
      }),
    { threshold: 0.3 }
  );
  byTarget.forEach((_, target) => io.observe(target));
}

// The one count-up (scene4_value): 0 -> value in 1.4s, ease-out cubic,
// every time it scrolls into view. Screen readers read the .rs-sr twin.
function wireCountUp() {
  const el = document.querySelector("[data-countup]");
  if (!el || !motionOk() || !("IntersectionObserver" in window)) return;
  const builtIn = Number(el.textContent.replace(/,/g, "")) || 0;
  const goal = () => Number(String(t("scene4_value") ?? "").replace(/,/g, "")) || builtIn;
  let raf = 0;
  let inView = false;

  // Reserve the final number's width so counting never shifts the layout;
  // measured again once the display font has loaded.
  const reserveWidth = () => {
    const shown = el.textContent;
    el.style.minWidth = "";
    el.textContent = formatNum(goal());
    el.style.minWidth = `${el.getBoundingClientRect().width}px`;
    el.textContent = shown;
  };
  reserveWidth();
  document.fonts?.ready.then(reserveWidth);

  const run = () => {
    cancelAnimationFrame(raf);
    const target = goal();
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / 1400);
      el.textContent = formatNum(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };

  new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      if (inView) run();
      else {
        cancelAnimationFrame(raf);
        el.textContent = "0";
      }
    },
    { threshold: 0.4 }
  ).observe(el);

  // applyCopy rewrites the number; keep it at 0 while it's off screen.
  document.addEventListener("rs:copy", () => {
    if (!inView) el.textContent = "0";
  });
}

// Mayor video (B3): YouTube IFrame API on youtube-nocookie. With motion on,
// the player is built as the section approaches, plays muted while at
// least half on screen and pauses when it leaves; Sound on / Mute toggles
// audio. Reduced motion, or a device that blocks autoplay, gets the play
// button instead.
let ytPromise = null;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytPromise) {
    ytPromise = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve(window.YT);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    });
  }
  return ytPromise;
}

function wireVideo() {
  const fig = document.querySelector("[data-rs-video]");
  if (!fig) return;
  const frame = fig.querySelector(".rs-video__frame");
  const poster = fig.querySelector(".rs-video__poster");
  const soundBtn = fig.querySelector("[data-video-sound]");
  const soundLabel = soundBtn.querySelector("[data-t]");
  let player = null;
  let ready = false;
  let inView = false;
  let muted = true;

  const setSoundLabel = () => {
    soundLabel.dataset.t = muted ? "sound_on" : "sound_off";
    soundLabel.textContent = t(soundLabel.dataset.t) || soundLabel.textContent;
  };

  const tryAutoplay = () => {
    player.playVideo();
    setTimeout(() => {
      const state = player.getPlayerState?.();
      if (inView && state !== 1 && state !== 3) fig.classList.add("needs-tap");
    }, 1500);
  };

  const create = (withSound) => {
    if (player) return;
    player = "pending";
    loadYouTubeApi().then((YT) => {
      player = new YT.Player("rs-video-player", {
        host: "https://www.youtube-nocookie.com",
        videoId: fig.dataset.videoId,
        playerVars: { autoplay: withSound ? 1 : 0, mute: withSound ? 0 : 1, playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            ready = true;
            fig.classList.add("has-player");
            soundBtn.hidden = false;
            muted = !withSound;
            if (muted) player.mute();
            setSoundLabel();
            const iframe = frame.querySelector("iframe");
            if (iframe) iframe.title = t("video_play") || "Video";
            if (withSound) player.playVideo();
            else if (inView) tryAutoplay();
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) fig.classList.remove("needs-tap");
          },
        },
      });
    });
  };

  poster.addEventListener("click", (event) => {
    event.preventDefault();
    if (ready) {
      fig.classList.remove("needs-tap");
      player.playVideo();
    } else {
      create(true);
    }
  });

  soundBtn.addEventListener("click", () => {
    if (!ready) return;
    if (muted) {
      player.unMute();
      player.setVolume(100);
      if (player.getPlayerState() !== 1) player.playVideo();
    } else {
      player.mute();
    }
    muted = !muted;
    setSoundLabel();
  });

  document.addEventListener("rs:copy", () => {
    if (!soundBtn.hidden) setSoundLabel();
  });

  if (!motionOk() || !("IntersectionObserver" in window)) return;

  new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) create(false);
    },
    { rootMargin: "600px 0px" }
  ).observe(frame);

  new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      if (!ready) return;
      if (inView) tryAutoplay();
      else player.pauseVideo();
    },
    { threshold: 0.5 }
  ).observe(frame);
}

// --------------------------------------------------------------- tabs ---
// B2 page list. Static markup is a list of plain links (works without JS);
// here it becomes a tablist driving one screen panel. Auto-advance every
// 8s is driven by the active tab's progress-bar animation (animationend),
// so pausing the animation pauses the timer too.
function wireTabs() {
  const box = document.querySelector("[data-rs-tabs]");
  if (!box) return;
  const tabs = [...box.querySelectorAll(".rs-tab")];
  const panel = box.querySelector("#rs-tabs-panel");
  const media = panel.querySelector(".rs-screen__media");
  const img = panel.querySelector(".rs-screen__img");
  const video = panel.querySelector(".rs-screen__video");
  const nameEl = panel.querySelector(".rs-screen__name");
  const link = panel.querySelector(".rs-screen__link");
  const toggle = box.querySelector("[data-tabs-toggle]");
  const toggleLabel = toggle.querySelector("[data-t]");

  let index = 0;
  let userStopped = !motionOk();
  let hovering = false;
  let focusInside = false;
  let visible = false;

  box.querySelectorAll(".rs-tabs__items").forEach((list) => {
    list.setAttribute("role", "tablist");
    list.querySelectorAll("li").forEach((li) => li.setAttribute("role", "presentation"));
  });
  panel.setAttribute("role", "tabpanel");
  tabs.forEach((tab, i) => {
    tab.id = `rs-tab-${i}`;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", panel.id);
  });

  video.muted = true;
  if (motionOk()) {
    video.autoplay = true;
  } else {
    video.controls = true;
  }

  const autoplayOn = () => !userStopped;

  function updateToggle() {
    toggle.hidden = false;
    toggleLabel.dataset.t = autoplayOn() ? "autoplay_pause" : "autoplay_play";
    toggleLabel.textContent = t(toggleLabel.dataset.t) || toggleLabel.textContent;
  }

  function syncPaused() {
    box.classList.toggle("is-paused", hovering || focusInside || !visible);
  }

  function restartProgress() {
    tabs.forEach((tab) => tab.classList.remove("is-running"));
    if (!autoplayOn()) return;
    const tab = tabs[index];
    void tab.offsetWidth; // restart the CSS animation
    tab.classList.add("is-running");
  }

  function videoLabel(pageId) {
    return (t("alt_video") || "").replace("{page}", t(pageId) || "");
  }

  function loadVideoIfVisible() {
    const tab = tabs[index];
    if (tab.dataset.media !== "video" || document.visibilityState === "hidden") return;
    if (visible && video.getAttribute("src") !== tab.dataset.video) {
      video.src = tab.dataset.video;
      if (motionOk()) video.play().catch(() => {});
    } else if (visible && motionOk() && video.paused) {
      video.play().catch(() => {});
    }
  }

  function showMedia(tab) {
    const pageId = tab.dataset.page;
    media.dataset.media = tab.dataset.media;
    nameEl.dataset.t = pageId;
    nameEl.textContent = t(pageId) || tab.querySelector(".rs-tab__name").textContent;
    link.href = tab.getAttribute("href");

    if (tab.dataset.media === "video") {
      img.hidden = true;
      video.hidden = false;
      video.poster = tab.dataset.img;
      video.setAttribute("aria-label", videoLabel(pageId));
      video.dataset.page = pageId;
      if (video.getAttribute("src") !== tab.dataset.video) {
        video.removeAttribute("src");
        video.load();
      }
      loadVideoIfVisible();
    } else {
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.hidden = true;
      img.hidden = false;
      img.src = tab.dataset.img;
      img.width = Number(tab.dataset.w);
      img.height = Number(tab.dataset.h);
      img.dataset.tAlt = "alt_still";
      img.dataset.altPage = pageId;
      img.alt = (t("alt_still") || "").replace("{page}", t(pageId) || "");
    }
  }

  function select(i, { focus = false } = {}) {
    index = (i + tabs.length) % tabs.length;
    tabs.forEach((tab, j) => {
      const on = j === index;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    panel.setAttribute("aria-labelledby", tabs[index].id);
    showMedia(tabs[index]);
    if (focus) tabs[index].focus();
    restartProgress();
  }

  function stopByUser() {
    userStopped = true;
    updateToggle();
    restartProgress();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      select(i);
      stopByUser();
    });
    tab.addEventListener("keydown", (event) => {
      const moves = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      let next = null;
      if (event.key in moves) next = index + moves[event.key];
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else if (event.key === "Enter" || event.key === " ") next = i;
      if (next === null) return;
      event.preventDefault();
      select(next, { focus: true });
      stopByUser();
    });
    tab.querySelector(".rs-tab__progress").addEventListener("animationend", () => {
      if (autoplayOn() && i === index) select(index + 1);
    });
  });

  toggle.addEventListener("click", () => {
    userStopped = !userStopped;
    updateToggle();
    restartProgress();
  });

  box.addEventListener("mouseenter", () => { hovering = true; syncPaused(); });
  box.addEventListener("mouseleave", () => { hovering = false; syncPaused(); });
  box.addEventListener("focusin", () => { focusInside = true; syncPaused(); });
  box.addEventListener("focusout", (event) => {
    if (!box.contains(event.relatedTarget)) {
      focusInside = false;
      syncPaused();
    }
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        syncPaused();
        if (visible) loadVideoIfVisible();
        else video.pause();
      },
      { threshold: 0.25 }
    ).observe(panel);
  } else {
    visible = true;
  }

  // A play() made while the browser tab was in the background can be
  // refused; try again once the video can play or the tab is visible.
  video.addEventListener("canplay", loadVideoIfVisible);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") loadVideoIfVisible();
  });

  document.addEventListener("rs:copy", () => {
    updateToggle();
    if (!video.hidden && video.dataset.page) video.setAttribute("aria-label", videoLabel(video.dataset.page));
  });

  updateToggle();
  select(0);
  syncPaused();
}

// ----------------------------------------------------------- assembly ---
// B2 opening scene (desktop + motion only): the 9 page names start
// scattered over the stage and, driven purely by scroll position (so it
// rewinds), fly into a single menu row; then the paper frame and the first
// page's screen fade in. transform/opacity only. The real list below is
// the finished state and is always there.
const DESKTOP_QUERY = window.matchMedia("(min-width: 900px)");
const SCATTER = [
  [0.08, 0.16, -10], [0.3, 0.07, 6], [0.56, 0.14, -5], [0.82, 0.09, 9],
  [0.93, 0.38, -7], [0.1, 0.5, 8], [0.4, 0.42, -12], [0.7, 0.47, 5],
  [0.2, 0.82, -6], [0.52, 0.86, 10], [0.86, 0.78, -9],
];

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

function wireAssembly() {
  const wrap = document.querySelector("[data-rs-assembly]");
  if (!wrap) return;
  const stage = wrap.querySelector(".rs-assembly__stage");
  const paper = wrap.querySelector(".rs-assembly__paper");
  const screen = wrap.querySelector(".rs-assembly__screen");
  const cards = [...wrap.querySelectorAll(".rs-assembly__card")];
  let offsets = [];
  let on = false;
  let ticking = false;

  function measure() {
    cards.forEach((card) => (card.style.transform = "none"));
    const s = stage.getBoundingClientRect();
    offsets = cards.map((card, i) => {
      const r = card.getBoundingClientRect();
      const [fx, fy, rot] = SCATTER[i % SCATTER.length];
      return {
        dx: s.left + fx * s.width - (r.left + r.width / 2),
        dy: s.top + fy * s.height - (r.top + r.height / 2),
        rot,
      };
    });
  }

  function render() {
    ticking = false;
    if (!on) return;
    const total = wrap.offsetHeight - stage.offsetHeight;
    const p = clamp01(-wrap.getBoundingClientRect().top / total);
    cards.forEach((card, i) => {
      const start = 0.06 + i * 0.025;
      const k = 1 - easeInOut(clamp01((p - start) / 0.32));
      const o = offsets[i];
      const drift = Math.sin(p * 14 + i * 1.7) * 10 * k;
      card.style.transform = `translate(${o.dx * k}px, ${o.dy * k + drift}px) rotate(${o.rot * k}deg) scale(${1 + 0.6 * k})`;
    });
    const frameIn = clamp01((p - 0.5) / 0.15);
    paper.style.opacity = frameIn;
    paper.style.transform = `scale(${0.96 + 0.04 * frameIn})`;
    screen.style.opacity = clamp01((p - 0.66) / 0.22);
  }

  const requestRender = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(render);
  };

  function setOn(next) {
    if (next === on) return;
    on = next;
    wrap.classList.toggle("is-on", on);
    if (on) {
      measure();
      render();
    } else {
      cards.forEach((card) => (card.style.transform = ""));
    }
  }

  const sync = () => setOn(motionOk() && DESKTOP_QUERY.matches);
  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", () => {
    if (!on) return;
    measure();
    requestRender();
  });
  document.addEventListener("rs:copy", () => {
    if (!on) return;
    measure(); // card widths change with the language
    requestRender();
  });
  document.fonts?.ready.then(() => on && (measure(), render()));
  DESKTOP_QUERY.addEventListener?.("change", sync);
  sync();
}

// Mobile (or any width without the scene): the page list arrives item by
// item the first time it scrolls into view.

syncMotionClass();
reducedMotion.addEventListener?.("change", syncMotionClass);
wireReveal();
wireAssembly();
wireTabs();
wireLangButtons();
wirePill();
wireBarFills();
wireVideo();
wireCountUp();
loadCopy();
