// Aug 27, 2026, 8:00 PM America/Chicago (CDT, UTC-5 — daylight saving is in
// effect that week) == Aug 28, 2026, 01:00 UTC. Written as an explicit UTC
// ISO string so the countdown lands on the same instant for every visitor
// regardless of their own browser timezone.
const TARGET_TIME = new Date("2026-08-28T01:00:00Z").getTime();

function pad(n) {
  return String(n).padStart(2, "0");
}

function main() {
  const countdownEl = document.getElementById("countdown");
  const liveEl = document.getElementById("countdown-live");
  const daysEl = document.getElementById("countdown-days");
  const hoursEl = document.getElementById("countdown-hours");
  const minutesEl = document.getElementById("countdown-minutes");
  const secondsEl = document.getElementById("countdown-seconds");
  if (!countdownEl) return;

  let timer = null;

  function render() {
    const diff = TARGET_TIME - Date.now();

    if (diff <= 0) {
      countdownEl.hidden = true;
      if (liveEl) liveEl.hidden = false;
      if (timer) clearInterval(timer);
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    daysEl.textContent = pad(Math.floor(totalSeconds / 86400));
    hoursEl.textContent = pad(Math.floor((totalSeconds % 86400) / 3600));
    minutesEl.textContent = pad(Math.floor((totalSeconds % 3600) / 60));
    secondsEl.textContent = pad(totalSeconds % 60);
  }

  render();
  timer = setInterval(render, 1000);
}

main();
