// Shared client-side password gate for the three Partner Toolkit pages.
// Unlocking on any one of them sets a sessionStorage flag the other two
// also check, so visitors aren't re-prompted while navigating between them
// in the same browser session.

const SESSION_KEY = "pchip-partner-toolkit-unlocked";
const PASSWORD = "ARMY2026PCHIP";

function isUnlocked() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markUnlocked() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // sessionStorage unavailable (e.g. some private-browsing contexts) —
    // the gate will just reappear on the next page, which is fine.
  }
}

function renderGate(root, onUnlock) {
  root.innerHTML = `
    <div class="pt-gate">
      <form class="pt-gate__card" id="pt-gate-form">
        <h1 class="pt-gate__title">Partner Toolkit</h1>
        <p class="pt-gate__text">This section is for Purple Chicago Project partners. Enter the password to continue.</p>
        <input class="pt-gate__input" type="password" id="pt-gate-input" placeholder="Password" autocomplete="off" />
        <button class="pt-gate__submit" type="submit">Unlock</button>
        <p class="pt-gate__error" id="pt-gate-error" hidden>Incorrect password — please try again.</p>
      </form>
    </div>
  `;

  const form = root.querySelector("#pt-gate-form");
  const input = root.querySelector("#pt-gate-input");
  const error = root.querySelector("#pt-gate-error");

  input.focus();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value === PASSWORD) {
      markUnlocked();
      onUnlock();
    } else {
      error.hidden = false;
      input.value = "";
      input.focus();
    }
  });
}

// Gates `root`'s content behind the shared Partner Toolkit password, only
// ever calling `renderContent` once access is confirmed — either instantly
// (already unlocked earlier this session) or right after a correct submit —
// so the protected content is never built into the DOM before then.
export function guardPage(root, renderContent) {
  if (isUnlocked()) {
    renderContent();
  } else {
    renderGate(root, renderContent);
  }
}
