import { parseCsv, rowsToObjects } from "./csv.js";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRROcZI_G3KaLFGjVgIc4m2JlTOiReb4gSgvde4QK95iSORERtMGnVWJjXj-ZetQXfP4EFaaXl-ZH_W/pub?gid=0&single=true&output=csv";

const IMG_BASE = "/images/essentials-tips-web/";

// Matches an image filename to each section title (spaces/case-insensitive,
// & and - both treated as separators) so the sheet doesn't need exact paths.
const IMAGE_FILES = [
  "After the Concert.jpg",
  "Clothing-Skin_Care.jpg",
  "Concert Etiquette.jpg",
  "Concert Photography Tips.jpg",
  "Hydration-Food.jpg",
  "Listen to Your Body.jpg",
  "Pre-Concert Checklist.jpg",
  "Protect Your Stuff.jpg",
  "what-to-bring.jpg",
];

const ICON_EMOJI = {
  bag: "🎒",
  clothing: "👕",
  water: "💧",
  heart: "❤️",
  lock: "🔒",
  handshake: "🤝",
  checklist: "✅",
  moon: "🌙",
  camera: "📷",
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function findImage(sectionTitle) {
  const target = normalize(sectionTitle);
  const match = IMAGE_FILES.find((f) => normalize(f.replace(/\.[^.]+$/, "")) === target);
  return match ? IMG_BASE + encodeURIComponent(match) : null;
}

// Splits a content cell into paragraph groups on blank lines, each group
// into its lines; a "Label: rest" line gets its label bolded, matching the
// bold-label convention used on the Stadium Info page.
function renderLine(line) {
  const m = line.match(/^([^:]{2,40}):\s*(.+)$/);
  if (m) return `<strong>${escapeHtml(m[1])}:</strong> ${escapeHtml(m[2])}`;
  return escapeHtml(line);
}

function renderTextContent(content) {
  const groups = unescapeNewlines(content)
    .split(/\n\s*\n/)
    .map((g) => g.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((g) => g.length > 0);

  return groups.map(renderGroup).join("");
}

// Renders one blank-line-separated group of lines. A line that's only a
// label (ends with ":", e.g. "iPhone Settings:") breaks out as its own
// subheading instead of joining the surrounding bullet list.
function renderGroup(lines) {
  if (lines.length === 1 && !/:\s*$/.test(lines[0])) {
    return `<p class="info-text">${renderLine(lines[0])}</p>`;
  }

  let html = "";
  let buffer = [];
  const flush = () => {
    if (buffer.length === 0) return;
    html += `<ul class="info-list tips-list">${buffer.map((l) => `<li>${renderLine(l)}</li>`).join("")}</ul>`;
    buffer = [];
  };

  for (const line of lines) {
    if (/:\s*$/.test(line)) {
      flush();
      html += `<p class="tips-subhead">${escapeHtml(line.replace(/:\s*$/, ""))}</p>`;
    } else {
      buffer.push(line);
    }
  }
  flush();
  return html;
}

// The sheet stores line breaks as a literal "\n" (backslash + n) rather
// than an actual newline character, so it survives being typed into a
// single spreadsheet cell — unescape it before splitting.
function unescapeNewlines(text) {
  return (text || "").replace(/\\n/g, "\n");
}

function splitLines(text) {
  return unescapeNewlines(text)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function renderDoDont(dos, donts) {
  return `
    <div class="tips-dodont">
      <div class="tips-dodont__col tips-dodont__col--do">
        <h3 class="tips-dodont__heading">DO's</h3>
        <ul class="tips-dodont__list">
          ${splitLines(dos).map((l) => `<li>${escapeHtml(l)}</li>`).join("")}
        </ul>
      </div>
      <div class="tips-dodont__col tips-dodont__col--dont">
        <h3 class="tips-dodont__heading">DON'Ts</h3>
        <ul class="tips-dodont__list">
          ${splitLines(donts).map((l) => `<li>${escapeHtml(l)}</li>`).join("")}
        </ul>
      </div>
    </div>
  `;
}

function renderChecklist(content, slug) {
  const items = splitLines(content);
  return `
    <ul class="tips-checklist" data-checklist="${slug}">
      ${items
        .map(
          (item, i) => `
        <li class="tips-checklist__item">
          <label>
            <input type="checkbox" class="tips-checklist__box" data-index="${i}" />
            <span>${escapeHtml(item)}</span>
          </label>
        </li>
      `
        )
        .join("")}
    </ul>
  `;
}

function restoreChecklists(root) {
  root.querySelectorAll(".tips-checklist").forEach((list) => {
    const key = `pchip-checklist-${list.dataset.checklist}`;
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
      saved = {};
    }

    list.querySelectorAll(".tips-checklist__box").forEach((box) => {
      box.checked = !!saved[box.dataset.index];
      box.addEventListener("change", () => {
        saved[box.dataset.index] = box.checked;
        localStorage.setItem(key, JSON.stringify(saved));
      });
    });
  });
}

function renderSection(row) {
  const slug = slugify(row.section_title);
  const imgSrc = findImage(row.section_title);
  const media = imgSrc
    ? `<img class="tips-accordion__image" src="${imgSrc}" alt="" loading="lazy" />`
    : `<span class="tips-accordion__emoji">${ICON_EMOJI[row.icon] || "✨"}</span>`;
  const summaryIcon = imgSrc
    ? `<img class="tips-accordion__summary-icon" src="${imgSrc}" alt="" loading="lazy" />`
    : `<span class="tips-accordion__summary-emoji">${ICON_EMOJI[row.icon] || "✨"}</span>`;

  let body = "";
  if (row.content_type === "do-dont") body = renderDoDont(row.dos, row.donts);
  else if (row.content_type === "checklist") body = renderChecklist(row.content, slug);
  else body = renderTextContent(row.content);

  return `
    <details class="tips-accordion" id="${slug}">
      <summary class="tips-accordion__summary">
        ${summaryIcon}
        <h2 class="tips-accordion__title">${escapeHtml(row.section_title)}</h2>
        <span class="tips-accordion__chevron" aria-hidden="true"></span>
      </summary>
      <div class="tips-accordion__body">
        <div class="tips-accordion__media">${media}</div>
        ${body}
      </div>
    </details>
  `;
}

function renderHero() {
  return `
    <div class="info-hero">
      <div class="info-hero__text">
        <h1 class="info-hero__title">ESSENTIALS & TIPS</h1>
        <p class="info-hero__subtitle">Everything to pack, prep, and remember for a safe, comfortable concert day.</p>
      </div>
    </div>
  `;
}

async function main() {
  const root = document.getElementById("essentials-tips-root");
  if (!root) return;

  try {
    const res = await fetch(CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    const text = await res.text();
    const rows = rowsToObjects(parseCsv(text)).sort((a, b) => Number(a.order) - Number(b.order));

    root.innerHTML = `
      ${renderHero()}
      <div class="info-sections tips-sections">
        ${rows.map(renderSection).join("")}
      </div>
    `;

    restoreChecklists(root);
  } catch (err) {
    console.error(err);
    root.innerHTML = `
      ${renderHero()}
      <p class="info-error">Couldn't load tips right now. Please try again shortly.</p>
    `;
  }
}

main();
