// Shared content for every "Coming Soon" page — only the <title> and
// data-page (for nav highlighting) differ between the HTML shells that use it.
const root = document.getElementById("coming-soon-root");

if (root) {
  root.innerHTML = `
    <img class="coming-soon__art" src="/images/site/coming-soon3.png" width="1744" height="1862" alt="Illustration of a building under construction with a crane" />
    <h1 class="coming-soon__title">COMING SOON</h1>
    <p class="coming-soon__subtext">We're building this one, ARMY. Check back soon!</p>
  `;
}
