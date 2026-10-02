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

// EN|KO pill: slides to the pressed button using its offsetLeft/Width.
function placePill() {
  const toggle = document.querySelector(".rs-lang");
  const pill = toggle?.querySelector(".rs-lang__pill");
  const pressed = toggle?.querySelector('[aria-pressed="true"]');
  if (!pill || !pressed) return;
  pill.style.left = `${pressed.offsetLeft}px`;
  pill.style.width = `${pressed.offsetWidth}px`;
  if (!toggle.classList.contains("is-ready")) {
    // Enable the transition only after the first placement, so the pill
    // doesn't slide in from 0 on page load.
    requestAnimationFrame(() => toggle.classList.add("is-ready"));
  }
}

function wirePill() {
  placePill();
  document.addEventListener("rs:copy", placePill);
  document.fonts?.ready.then(placePill);
  window.addEventListener("resize", placePill);
}

// Bars fill once their chart comes into view (or, for the survey panel,
// when its card becomes active — see markChartFilled).
export function markChartFilled(chart) {
  if (chart?.dataset.fill === "armed") chart.dataset.fill = "done";
}

function wireBarFills() {
  if (!motionOk() || !("IntersectionObserver" in window)) return;
  const charts = document.querySelectorAll(".rs-chart--bars, .rs-chart--stack");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        // Charts living in the sticky survey panel fill on card activation.
        if (entry.target.closest(".rs-scrolly__panel")) return;
        markChartFilled(entry.target);
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.35 }
  );
  charts.forEach((chart) => {
    chart.dataset.fill = "armed";
    io.observe(chart);
  });
}

// Mayor video: poster + play button only; YouTube is contacted on click.
function wireVideo() {
  document.querySelectorAll(".rs-video__poster[data-video-id]").forEach((poster) => {
    poster.addEventListener("click", (event) => {
      event.preventDefault();
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(poster.dataset.videoId)}?autoplay=1&rel=0&modestbranding=1`;
      iframe.title = t("video_play") || "Video";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      poster.replaceWith(iframe);
      iframe.focus();
    });
  });
}

// The one count-up on the page (scene4_value): 1.4s, ease-out cubic. The
// visible number is aria-hidden; screen readers get the final value from
// the .rs-sr twin, which never animates.
function wireCountUp() {
  const el = document.querySelector("[data-countup]");
  if (!el || !motionOk() || !("IntersectionObserver" in window)) return;
  const rect = el.getBoundingClientRect();
  if (rect.top < window.innerHeight) return; // already on screen: leave it final

  const builtIn = Number(el.textContent.replace(/,/g, "")) || 0;
  el.style.minWidth = `${rect.width}px`;
  el.textContent = "0";

  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const target = Number(String(t("scene4_value") ?? "").replace(/,/g, "")) || builtIn;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - start) / 1400);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = formatNum(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(step);
        else el.style.minWidth = "";
      };
      requestAnimationFrame(step);
    },
    { threshold: 0.5 }
  );
  io.observe(el);
}

syncMotionClass();
reducedMotion.addEventListener?.("change", syncMotionClass);
wireLangButtons();
wirePill();
wireBarFills();
wireVideo();
loadCopy().then(wireCountUp);
