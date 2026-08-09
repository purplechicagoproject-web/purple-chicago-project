import { fetchTripGuideRows, rowsForPage } from "./chicago-trip-guide-data.js";

const PAGE_NAME = "K-pop Store List";
const DEFAULT_SUBTEXT = "We're putting together a list of the best K-pop stores in Chicago, check back soon!";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function main() {
  const root = document.getElementById("kpop-stores-root");
  if (!root) return;

  let subtext = DEFAULT_SUBTEXT;
  try {
    const rows = await fetchTripGuideRows();
    const items = rowsForPage(rows, PAGE_NAME);
    if (items[0]?.content) subtext = items[0].content;
  } catch (err) {
    console.error(err);
  }

  root.innerHTML = `
    <img class="coming-soon__art" src="/images/site/coming-soon3.png" width="1744" height="1862" alt="Illustration of a building under construction with a crane" />
    <h1 class="coming-soon__title">K-POP STORE LIST</h1>
    <p class="coming-soon__subtext">${escapeHtml(subtext)}</p>
  `;
}

main();
