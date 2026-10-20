// 헤세드 질문지 전용 비밀번호 잠금.
// js/partner-toolkit-auth.js 를 복사해 이 폴더 안에서만 쓰도록 고친 것입니다
// (기존 파일은 수정하지 않음). 같은 브라우저 세션 동안은 다시 묻지 않습니다.

const SESSION_KEY = "hesed-qanda-unlocked";
const PASSWORD = "2026qna";

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
    // sessionStorage를 쓸 수 없는 환경이면 다음에 다시 묻게 됩니다.
  }
}

function renderGate(root, onUnlock) {
  root.innerHTML = `
    <div class="gate">
      <form class="gate__card" id="gate-form">
        <h1 class="gate__title">헤세드 자료 확인 질문지</h1>
        <div class="gate__row">
          <input class="gate__input" type="password" id="gate-input" placeholder="비밀번호"
            autocomplete="off" enterkeyhint="go" aria-label="비밀번호" />
          <button class="gate__submit" type="submit" aria-label="확인">→</button>
        </div>
        <p class="gate__error" id="gate-error" hidden>비밀번호가 맞지 않습니다.</p>
      </form>
    </div>
  `;

  const form = root.querySelector("#gate-form");
  const input = root.querySelector("#gate-input");
  const error = root.querySelector("#gate-error");

  input.focus();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value.trim() === PASSWORD) {
      markUnlocked();
      onUnlock();
    } else {
      error.hidden = false;
      input.value = "";
      input.focus();
    }
  });
}

// 잠금이 풀린 뒤에만 renderContent를 호출하므로, 그 전에는 질문 내용이 DOM에 만들어지지 않습니다.
export function guardPage(root, renderContent) {
  if (isUnlocked()) {
    renderContent();
  } else {
    renderGate(root, renderContent);
  }
}
