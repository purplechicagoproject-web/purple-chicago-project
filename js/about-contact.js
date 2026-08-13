import { parseCsv, rowsToObjects } from "./csv.js";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvFXi0ACz3gZgySpgHjiyFZyu7cK8MfqR8H6xL4ePR1oEYdgSTLhRU5QULq0d8FF_67Qeq-udbJ6Vr/pub?gid=0&single=true&output=csv";

const FALLBACK_ABOUT_PARAGRAPHS = [
  "Purple Chicago Project (PChiP) started as one Chicago ARMY's simple idea: what if the whole city could give BTS and ARMY the warmest possible welcome for the August 27–28 Soldier Field shows?",
  "It's founded by the owner of Mun Layers Media, a Chicago-based ARMY, with help from a small team of fellow ARMY. Together, it's grown into a grassroots, fan-led effort reaching out across the city, skyline buildings lighting up purple, local restaurants offering ARMY specials, Korean traditional performances, and a whole city willing to show up for this moment.",
  "Everything on this site (the maps, the guides, the partner list) was built by fans, for fans, so your trip to Chicago is as smooth and joyful as possible.",
];

const FALLBACK_CONTACT_ITEMS = [
  {
    q: "Spot something wrong, or know of an ARMY event that's not listed here?",
    aHtml:
      'DM us on Instagram with the link, <a href="https://www.instagram.com/purplechicagoproject/" target="_blank" rel="noopener">@purplechicagoproject</a>',
  },
  {
    q: "Want your business to become an official partner?",
    aHtml: 'Email us at <a href="mailto:purplechicagoproject@gmail.com">purplechicagoproject@gmail.com</a>',
  },
];

const FALLBACK_QUICK_NOTE_HTML =
  '<strong>A Quick Note:</strong> Purple Chicago Project is an independent, fan-run initiative. We are not affiliated with, endorsed by, or officially connected to BTS, HYBE, Live Nation, or Soldier Field. All content here is made with love by ARMY, for ARMY.';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// `rows` is already sorted by the sheet's "order" column, so grouping by
// section in a single pass (Map preserves insertion order) naturally keeps
// the sheet's own section ordering with no hardcoded list to maintain.
function groupBySection(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = row.section || "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}

function renderParagraphs(rows) {
  return rows.map((r) => `<p>${escapeHtml(r.content)}</p>`).join("");
}

// No <h2> heading here — the page-level "About" label right above the
// card grid already announces this card, so repeating it would be redundant.
function renderAboutCard(rows) {
  return `
    <div class="ac-card ac-card--full">
      <div class="ac-card__body">${renderParagraphs(rows)}</div>
    </div>
  `;
}

function renderFallbackAbout() {
  return `
    <div class="ac-card ac-card--full">
      <div class="ac-card__body">${FALLBACK_ABOUT_PARAGRAPHS.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}</div>
    </div>
  `;
}

function renderSimpleCard(title, rows) {
  if (!rows || rows.length === 0) return "";
  return `
    <div class="ac-card">
      <h2 class="ac-card__heading">${escapeHtml(title)}</h2>
      <div class="ac-card__body">${renderParagraphs(rows)}</div>
    </div>
  `;
}

function renderPrinciplesCard(title, rows) {
  if (!rows || rows.length === 0) return "";
  return `
    <div class="ac-card ac-card--principles">
      <h2 class="ac-card__heading">${escapeHtml(title)}</h2>
      <div class="ac-card__body">${renderParagraphs(rows)}</div>
    </div>
  `;
}

function renderProgressCard(rows) {
  if (!rows || rows.length === 0) return "";
  return `
    <div class="ac-card">
      <h2 class="ac-card__heading">Progress</h2>
      <ul class="ac-card__checklist">${rows.map((r) => `<li>${escapeHtml(r.content)}</li>`).join("")}</ul>
    </div>
  `;
}

function renderNextCard(rows) {
  if (!rows || rows.length === 0) return "";
  const intro = rows.filter((r) => r.type === "intro");
  const items = rows.filter((r) => r.type === "list_item");
  const closing = rows.filter((r) => r.type === "closing");
  return `
    <div class="ac-card">
      <h2 class="ac-card__heading">Next</h2>
      <div class="ac-card__body">
        ${renderParagraphs(intro)}
        ${items.length ? `<ul class="ac-card__arrow-list">${items.map((r) => `<li>${escapeHtml(r.content)}</li>`).join("")}</ul>` : ""}
        ${renderParagraphs(closing)}
      </div>
    </div>
  `;
}

function renderContactItem(row) {
  const isMailto = row.link_url.startsWith("mailto:");
  const answerHtml = row.link_url
    ? `<a href="${escapeHtml(row.link_url)}"${isMailto ? "" : ' target="_blank" rel="noopener"'}>${escapeHtml(row.link_text)}</a>`
    : escapeHtml(row.link_text);
  return `
    <div class="ac-contact-item">
      <p class="ac-contact-item__q">${escapeHtml(row.content)}</p>
      <p class="ac-contact-item__a">${answerHtml}</p>
    </div>
  `;
}

function renderContact(rows) {
  return rows.map(renderContactItem).join("");
}

function renderFallbackContact() {
  return FALLBACK_CONTACT_ITEMS.map(
    (item) => `
      <div class="ac-contact-item">
        <p class="ac-contact-item__q">${escapeHtml(item.q)}</p>
        <p class="ac-contact-item__a">${item.aHtml}</p>
      </div>
    `
  ).join("");
}

// The sheet's QuickNote content already includes the "A Quick Note:" lead-in
// as plain text; split it out so it can be bolded like the original markup.
function renderQuickNote(rows) {
  const content = rows[0].content;
  const prefix = "A Quick Note:";
  if (content.startsWith(prefix)) {
    const rest = content.slice(prefix.length).trim();
    return `<p class="ac-quick-note"><strong>${escapeHtml(prefix)}</strong> ${escapeHtml(rest)}</p>`;
  }
  return `<p class="ac-quick-note"><strong>A Quick Note:</strong> ${escapeHtml(content)}</p>`;
}

async function main() {
  const aboutRoot = document.getElementById("ac-about-root");
  const contactRoot = document.getElementById("ac-contact-root");
  const quickNoteRoot = document.getElementById("ac-quick-note-root");
  if (!aboutRoot || !contactRoot || !quickNoteRoot) return;

  let groups = new Map();
  try {
    const res = await fetch(CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    const text = await res.text();
    const rows = rowsToObjects(parseCsv(text))
      .map((r) => ({
        order: Number(r.order) || 0,
        section: (r.section || "").trim(),
        type: (r.type || "").trim(),
        content: (r.content || "").trim(),
        link_text: (r.link_text || "").trim(),
        link_url: (r.link_url || "").trim(),
      }))
      .sort((a, b) => a.order - b.order);
    groups = groupBySection(rows);
  } catch (err) {
    console.error(err);
  }

  const aboutRows = groups.get("About") || [];
  const contactRows = groups.get("Contact") || [];
  const quickNoteRows = groups.get("QuickNote") || [];

  aboutRoot.innerHTML = `
    ${aboutRows.length ? renderAboutCard(aboutRows) : renderFallbackAbout()}
    ${renderSimpleCard("Founder", groups.get("Founder"))}
    ${renderSimpleCard("Motivation", groups.get("Motivation"))}
    ${renderPrinciplesCard("IP", groups.get("IP"))}
    ${renderProgressCard(groups.get("Progress"))}
    ${renderNextCard(groups.get("Next"))}
  `;

  contactRoot.innerHTML = contactRows.length ? renderContact(contactRows) : renderFallbackContact();
  quickNoteRoot.innerHTML = quickNoteRows.length ? renderQuickNote(quickNoteRows) : `<p class="ac-quick-note">${FALLBACK_QUICK_NOTE_HTML}</p>`;
}

main();
