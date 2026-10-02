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

wireLangButtons();
loadCopy();
