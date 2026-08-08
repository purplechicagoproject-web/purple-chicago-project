// First-visit welcome popup, reused by any page that wants one. Each caller
// passes its own `storageKey` so dismissal state never leaks between pages.
//
// - "Got it" dismisses for the current browser session only (sessionStorage
//   — clears on a new session, so the popup returns next visit).
// - "Don't show for 24 hours" suppresses it across sessions for 24h
//   (localStorage with an expiry timestamp).

function isSessionDismissed(key) {
  return sessionStorage.getItem(`${key}_session_dismissed`) === "1";
}

function isSnoozed(key) {
  const until = localStorage.getItem(`${key}_snooze_until`);
  return !!until && Date.now() < Number(until);
}

export function initWelcomePopup({ storageKey, bodyHtml }) {
  if (isSessionDismissed(storageKey) || isSnoozed(storageKey)) return;

  const overlay = document.createElement("div");
  overlay.className = "welcome-popup-overlay";
  overlay.innerHTML = `
    <div class="welcome-popup" role="dialog" aria-modal="true">
      ${bodyHtml}
      <div class="welcome-popup__actions">
        <button type="button" class="welcome-popup__btn welcome-popup__btn--primary" data-action="got-it">Got it</button>
        <button type="button" class="welcome-popup__btn welcome-popup__btn--ghost" data-action="snooze">Don't show for 24 hours</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  function close() {
    overlay.remove();
  }

  overlay.querySelector('[data-action="got-it"]').addEventListener("click", () => {
    sessionStorage.setItem(`${storageKey}_session_dismissed`, "1");
    close();
  });

  overlay.querySelector('[data-action="snooze"]').addEventListener("click", () => {
    localStorage.setItem(`${storageKey}_snooze_until`, String(Date.now() + 24 * 60 * 60 * 1000));
    close();
  });

  overlay.addEventListener("click", (e) => {
    if (e.target !== overlay) return;
    sessionStorage.setItem(`${storageKey}_session_dismissed`, "1");
    close();
  });
}
