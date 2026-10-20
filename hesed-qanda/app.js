// 헤세드 자료 확인 질문지.
// 비밀번호 → 이름 입력 → 서버(Apps Script)에서 기존 답변을 불러와 그립니다.
// 답변은 바뀐 항목만 자동 저장합니다. 서버 내용이 기준이고, localStorage는
// 입력자 이름과 아직 저장되지 못한 항목을 잠시 보관하는 데만 씁니다.
import { guardPage } from "/hesed-qanda/auth.js?v=4";

const API_URL =
  "https://script.google.com/macros/s/AKfycbyCZ7NHmAWhw8pfeL-aFKGgSHRN16NzcsSU1TIrX5Px2aSZBmEGXOlwZdUOolvnUORQ/exec";
const TOKEN = "hesed-qanda-2026";
const EDITOR_KEY = "hesed-qanda-editor";
const PENDING_KEY = "hesed-qanda-pending-v2";
const MAX_BYTES = 20 * 1024 * 1024;
const TEXT_DELAY = 2000;
const RETRY_DELAY = 15000;

const QUESTION_STATUSES = ["준비 완료", "확인 중", "해당 없음"];
const HOMEPAGE_STATUSES = ["수정 완료", "수정 예정", "그대로 유지"];

// ---------- localStorage (모두 try/catch) ----------
function storeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function storeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장 공간을 쓸 수 없어도 페이지는 계속 동작합니다.
  }
}
function storeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // 무시
  }
}

// ---------- 상태 ----------
let editor = storeGet(EDITOR_KEY) || "";
const answers = {}; // qid → { status, answer, link }
const meta = {}; // qid → { editor, updated }
const files = {}; // qid → [{ name, editor }]
const sectionOf = {}; // qid → { id, type }

// 저장 대기열: qid → 변경 번호. 저장 요청 중에 또 바뀐 항목은 남겨 두었다가 다시 보냅니다.
const pending = {};
let changeSeq = 0;
let saveTimer = null;
let saving = false;
let uploadsInFlight = 0;

function answerOf(qid) {
  return (answers[qid] ||= { status: "", answer: "", link: "" });
}

function itemPayload(qid) {
  const a = answerOf(qid);
  const homepage = sectionOf[qid].type === "homepage";
  return {
    qid,
    section: sectionOf[qid].id,
    status: a.status,
    answer: homepage ? "" : a.answer,
    link: homepage ? "" : a.link,
  };
}

function persistPending() {
  const qids = Object.keys(pending);
  if (!qids.length) return storeRemove(PENDING_KEY);
  storeSet(PENDING_KEY, JSON.stringify(qids.map(itemPayload)));
}

function restorePending() {
  let items = [];
  try {
    items = JSON.parse(storeGet(PENDING_KEY) || "[]");
  } catch {
    items = [];
  }
  for (const it of items) {
    if (!it || !sectionOf[it.qid]) continue;
    Object.assign(answerOf(it.qid), { status: it.status || "", answer: it.answer || "", link: it.link || "" });
    pending[it.qid] = ++changeSeq;
  }
  return items.length > 0;
}

// ---------- 작은 DOM 도우미 ----------
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "style") node.style.cssText = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

function timeLabel(d = new Date()) {
  return d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
}

// "10/18 오후 3:12". 날짜로 읽을 수 없는 값은 그대로 보여 줍니다.
function stampLabel(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value || "");
  return `${d.getMonth() + 1}/${d.getDate()} ${timeLabel(d)}`;
}

// Content-Type을 넣지 않아 text/plain으로 전송됩니다 (CORS 사전 요청 회피).
async function post(data) {
  const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ token: TOKEN, ...data }) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function postOk(data) {
  const json = await post(data);
  if (!json || json.ok !== true) throw new Error((json && json.error) || "fail");
  return json;
}

// ---------- 이름 입력 ----------
function askName(root, onDone, { cancelable = false } = {}) {
  const input = el("input", {
    class: "gate__input",
    type: "text",
    placeholder: "이름",
    autocomplete: "name",
    enterkeyhint: "go",
    "aria-label": "이름",
    maxlength: 40,
  });
  input.value = editor;
  const error = el("p", { class: "gate__error", hidden: true }, "이름을 입력해 주세요.");
  const form = el(
    "form",
    { class: "gate__card" },
    el("h1", { class: "gate__title" }, "이름을 입력해 주세요"),
    el("p", { class: "gate__hint" }, "저장할 때 누가 입력했는지 함께 기록됩니다."),
    el("div", { class: "gate__row" }, input, el("button", { class: "gate__submit", type: "submit", "aria-label": "확인" }, "→")),
    error,
    cancelable && el("button", { type: "button", class: "gate__cancel", onclick: () => onDone(null) }, "취소")
  );
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (!name) {
      error.hidden = false;
      input.focus();
      return;
    }
    editor = name;
    storeSet(EDITOR_KEY, name);
    onDone(name);
  });
  root.replaceChildren(el("div", { class: "gate" }, form));
  input.focus();
}

// ---------- 상단 고정 영역 ----------
const ui = {};

function setSaveStatus(kind, text) {
  ui.save.className = `save-status save-status--${kind}`;
  ui.save.textContent = text;
}

function isAnswered(qid) {
  const a = answers[qid];
  return Boolean((files[qid] || []).length || (a && (a.status || a.answer.trim() || a.link.trim())));
}

let questionQids = [];
const tocCounts = [];

function updateProgress() {
  const done = questionQids.filter(isAnswered).length;
  ui.progressText.textContent = `${questionQids.length}개 중 ${done}개 응답`;
  ui.progressFill.style.width = `${questionQids.length ? (done / questionQids.length) * 100 : 0}%`;
  for (const t of tocCounts) {
    const n = t.qids.filter((q) => (t.homepage ? Boolean(answers[q]?.status) : isAnswered(q))).length;
    t.el.textContent = `${n}/${t.qids.length}`;
  }
}

// ---------- 마지막 수정 표시 ----------
const metaEls = {};

function renderMeta(qid) {
  const node = metaEls[qid];
  if (!node) return;
  const m = meta[qid];
  node.textContent = m && (m.editor || m.updated) ? `마지막 수정: ${[m.editor, stampLabel(m.updated)].filter(Boolean).join(", ")}` : "";
}

// ---------- 자동 저장 ----------
function changed(qid, delay) {
  pending[qid] = ++changeSeq;
  persistPending();
  updateProgress();
  scheduleSave(delay);
}

function scheduleSave(delay) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, delay);
}

async function flush() {
  clearTimeout(saveTimer);
  if (saving) return; // 진행 중인 저장이 끝나면 남은 항목을 이어서 보냅니다.
  const snapshot = { ...pending };
  const qids = Object.keys(snapshot);
  if (!qids.length) return;

  saving = true;
  setSaveStatus("busy", "저장 중...");
  try {
    await postOk({ action: "answers", editor, items: qids.map(itemPayload) });
    const now = new Date();
    for (const qid of qids) {
      if (pending[qid] === snapshot[qid]) delete pending[qid];
      meta[qid] = { editor, updated: now };
      renderMeta(qid);
    }
    persistPending();
    setSaveStatus("ok", `자동 저장됨 ${timeLabel(now)}`);
    saving = false;
    if (Object.keys(pending).length) scheduleSave(0);
  } catch {
    saving = false;
    persistPending();
    setSaveStatus("error", "저장 실패, 연결 확인 후 다시 시도합니다");
    scheduleSave(RETRY_DELAY);
  }
}

window.addEventListener("online", () => {
  if (Object.keys(pending).length) scheduleSave(0);
});

window.addEventListener("beforeunload", (e) => {
  if (uploadsInFlight > 0 || Object.keys(pending).length > 0) {
    e.preventDefault();
    e.returnValue = "";
  }
});

// ---------- 입력 요소 ----------
function statusChoices(qid, statuses, box = false) {
  const a = answerOf(qid);
  const group = el("div", { class: "choices", role: box ? "group" : "radiogroup" });
  for (const s of statuses) {
    const input = el("input", { type: box ? "checkbox" : "radio", name: `st-${qid}`, value: s, checked: a.status === s });
    input.addEventListener("change", () => {
      if (box) {
        // 체크박스 모양이지만 하나만 선택됩니다. 다시 누르면 선택 해제.
        group.querySelectorAll("input").forEach((o) => {
          if (o !== input) o.checked = false;
        });
        a.status = input.checked ? s : "";
      } else {
        a.status = s;
      }
      changed(qid, 0);
    });
    group.append(el("label", { class: box ? "choice choice--box" : "choice" }, input, el("span", {}, s)));
  }
  return group;
}

function textField(qid, kind, label, placeholder) {
  const a = answerOf(qid);
  const id = `f-${kind}-${qid}`;
  const printVal = el("div", { class: "print-only print-val", "data-kind": kind }, a[kind]);
  const input =
    kind === "answer"
      ? el("textarea", { id, rows: 3, placeholder })
      : el("input", { id, type: "url", class: "link", inputmode: "url", placeholder, autocomplete: "off" });
  input.value = a[kind];
  input.addEventListener("input", () => {
    a[kind] = input.value;
    printVal.textContent = input.value;
    changed(qid, TEXT_DELAY);
  });
  return el("div", {}, el("label", { class: "field-label", for: id }, label), input, printVal);
}

function renderUpload(qid) {
  const list = el("ul", { class: "files" });

  const addRow = (name) => {
    const row = el("li", { class: "file" }, el("span", { class: "file__name" }, name), el("span", { class: "file__state" }));
    list.append(row);
    return row;
  };

  const setDone = (row, f) => {
    row.className = "file file--done";
    row.querySelector(".file__name").textContent = `✓ ${f.name}${f.editor ? ` (${f.editor})` : ""}`;
    row.querySelector(".file__state").textContent = "";
  };

  for (const f of files[qid] || []) setDone(addRow(f.name), f);

  const upload = async (file, row) => {
    row.className = "file";
    row.querySelector(".file__retry")?.remove();
    const state = row.querySelector(".file__state");
    state.innerHTML = '<span class="spinner"></span>올리는 중…';
    uploadsInFlight++;
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      const base64 = String(dataUrl).slice(String(dataUrl).indexOf(",") + 1);
      await postOk({
        action: "upload",
        editor,
        qid,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        base64,
      });
      const f = { name: file.name, editor };
      (files[qid] ||= []).push(f);
      setDone(row, f);
      updateProgress();
    } catch {
      row.className = "file file--error";
      state.textContent = "실패";
      row.append(el("button", { type: "button", class: "file__retry", onclick: () => upload(file, row) }, "다시 시도"));
    } finally {
      uploadsInFlight--;
    }
  };

  const input = el("input", { type: "file", multiple: true, class: "upload__input", id: `up-${qid}` });
  input.addEventListener("change", () => {
    for (const file of input.files) {
      const row = addRow(file.name);
      if (file.size > MAX_BYTES) {
        row.className = "file file--big";
        row.querySelector(".file__state").textContent = "용량이 커서 아래 칸에 공유 링크로 넣어 주세요";
        continue;
      }
      upload(file, row);
    }
    input.value = "";
  });

  return el(
    "div",
    { class: "upload" },
    input,
    el("label", { class: "upload__btn", for: `up-${qid}` }, "📎 파일 올리기 (사진·PDF 등, 여러 개 가능)"),
    list
  );
}

function metaLine(qid) {
  metaEls[qid] = el("p", { class: "q__meta" });
  renderMeta(qid);
  return metaEls[qid];
}

// ---------- 질문 항목 (섹션 1~8) ----------
function renderQuestion(item) {
  const qid = item.id;
  const body = el(
    "div",
    { class: "q__body" },
    statusChoices(qid, QUESTION_STATUSES),
    textField(qid, "answer", "답변", "답변을 적어 주세요")
  );

  if (item.upload === "link") {
    body.append(textField(qid, "link", "영상 공유 링크", "구글드라이브, WeTransfer 등 공유 링크"));
  } else {
    body.append(renderUpload(qid), textField(qid, "link", "공유 링크 (20MB가 넘는 파일)", "구글드라이브, WeTransfer 등 공유 링크"));
  }
  body.append(metaLine(qid));

  return el(
    "div",
    { class: "q", id: `q-${qid}` },
    el(
      "div",
      { class: "q__head" },
      el("span", { class: "q__num" }, qid),
      el("div", {}, el("p", { class: "q__text" }, item.question), item.reason && el("p", { class: "q__reason" }, item.reason))
    ),
    body
  );
}

// ---------- 홈페이지 업데이트 (섹션 9) ----------
function renderHomepageSection(section) {
  const out = [];
  if (section.intro) out.push(el("p", { class: "hp-intro" }, section.intro));

  for (const g of section.groups) {
    const hasFix = g.items.some((it) => it.fix);
    const head = el("tr", {}, el("th", {}, ""), el("th", {}, "페이지"), el("th", {}, "현재 문구"), hasFix && el("th", {}, "수정 내용"), el("th", {}, "진행"));
    const rows = g.items.map((it) =>
      el(
        "tr",
        {},
        el("td", { class: "hp-id" }, it.id),
        el("td", { "data-label": "페이지" }, it.page),
        el("td", { "data-label": "현재 문구" }, it.current),
        hasFix && el("td", { "data-label": "수정 내용" }, it.fix || ""),
        el("td", { class: "hp-choices" }, statusChoices(it.id, HOMEPAGE_STATUSES, true), metaLine(it.id))
      )
    );
    out.push(
      el(
        "div",
        { class: "hp-group" },
        el("h3", { class: "hp-group__title" }, g.title),
        g.note && el("p", { class: "hp-note" }, g.note),
        el("table", { class: "hp-table" }, el("thead", {}, head), el("tbody", {}, rows))
      )
    );
  }

  if (section.footnote) out.push(el("p", { class: "hp-footnote" }, section.footnote));
  return out;
}

function sectionQids(section) {
  return section.type === "homepage"
    ? section.groups.flatMap((g) => g.items.map((it) => it.id))
    : section.items.map((it) => it.id);
}

// ---------- 페이지 ----------
function renderPage(root, data) {
  const sections = data.sections;
  questionQids = sections.filter((s) => s.type === "question").flatMap(sectionQids);

  ui.progressText = el("span", {});
  ui.progressFill = el("div", { class: "bar__fill" });
  ui.save = el("span", { class: "save-status", "aria-live": "polite" });
  ui.editor = el("span", { class: "editor__name" }, editor);

  const changeName = el("button", { type: "button", class: "editor__change" }, "변경");
  changeName.addEventListener("click", () => {
    const overlay = el("div", { class: "overlay" });
    document.body.append(overlay);
    askName(
      overlay,
      (name) => {
        if (name) ui.editor.textContent = name;
        overlay.remove();
      },
      { cancelable: true }
    );
  });

  const topbar = el(
    "header",
    { class: "topbar" },
    el(
      "div",
      { class: "topbar__inner" },
      el("div", { class: "topbar__progress" }, ui.progressText, el("div", { class: "bar" }, ui.progressFill)),
      el("div", { class: "topbar__row" }, el("span", { class: "editor" }, "입력자: ", ui.editor, " (", changeName, ")"), ui.save)
    )
  );

  const toc = el(
    "ol",
    { class: "toc" },
    sections.map((s) => {
      const count = el("span", { class: "toc__count" });
      tocCounts.push({ el: count, qids: sectionQids(s), homepage: s.type === "homepage" });
      return el("li", {}, el("a", { href: `#s-${s.id}`, style: `--c:${s.color}` }, el("span", { class: "toc__title" }, s.title), count));
    })
  );

  const sectionEls = sections.map((s) =>
    el(
      "section",
      { class: "section", id: `s-${s.id}`, style: `--c:${s.color}` },
      el("h2", { class: "section__title" }, s.title),
      s.type === "homepage" ? renderHomepageSection(s) : s.items.map(renderQuestion)
    )
  );

  root.replaceChildren(
    topbar,
    el(
      "div",
      { class: "wrap" },
      el(
        "aside",
        { class: "checklist" },
        el("p", { class: "checklist__text" }, "인쇄용 체크리스트가 필요하시면 여기에서 받으실 수 있습니다."),
        el(
          "a",
          { class: "checklist__btn", href: "/hesed-qanda/hesed-checklist.pdf", target: "_blank", rel: "noopener" },
          "체크리스트 열기"
        )
      ),
      el(
        "div",
        { class: "intro" },
        el("h1", {}, data.title),
        el("p", {}, "답변은 입력하는 대로 자동 저장되며, 나중에 다시 들어와 이어서 작성하실 수 있습니다. 구글 로그인은 필요 없습니다.")
      ),
      toc,
      sectionEls
    )
  );

  updateProgress();
}

// 서버에서 받은 내용으로 상태를 채웁니다.
function applyServerData(json) {
  for (const [qid, v] of Object.entries(json.answers || {})) {
    if (!sectionOf[qid] || !v) continue;
    Object.assign(answerOf(qid), { status: v.status || "", answer: v.answer || "", link: v.link || "" });
    if (v.editor || v.updated) meta[qid] = { editor: v.editor || "", updated: v.updated || "" };
  }
  for (const [qid, list] of Object.entries(json.files || {})) {
    if (Array.isArray(list)) files[qid] = list.map((f) => ({ name: f.name, editor: f.editor || "" }));
  }
}

async function loadAndRender(root) {
  root.replaceChildren(el("p", { class: "loading" }, "불러오는 중..."));
  try {
    const [qRes, server] = await Promise.all([
      fetch("/hesed-qanda/questions.json", { cache: "no-cache" }),
      postOk({ action: "load" }),
    ]);
    if (!qRes.ok) throw new Error(qRes.status);
    const data = await qRes.json();

    for (const s of data.sections) {
      for (const qid of sectionQids(s)) sectionOf[qid] = { id: s.id, type: s.type };
    }
    applyServerData(server);
    // 지난번에 저장되지 못한 항목은 서버 값 위에 덮어쓰고 다시 보냅니다.
    const hadPending = restorePending();

    renderPage(root, data);
    if (hadPending) {
      setSaveStatus("busy", "저장되지 않은 내용을 다시 보냅니다...");
      scheduleSave(0);
    }
  } catch {
    root.replaceChildren(
      el(
        "div",
        { class: "loading" },
        el("p", { class: "load-error" }, "내용을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요."),
        el("button", { type: "button", class: "btn-retry", onclick: () => loadAndRender(root) }, "다시 시도")
      )
    );
  }
}


const root = document.getElementById("app");
guardPage(root, () => {
  if (editor) loadAndRender(root);
  else askName(root, () => loadAndRender(root));
});
