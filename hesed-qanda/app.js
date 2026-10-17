// 헤세드 자료 확인 질문지. questions.json을 불러와 그리고,
// 답변과 파일은 Apps Script로 보냅니다. 입력 중인 내용은 localStorage에 임시 저장합니다.
import { guardPage } from "/hesed-qanda/auth.js";

const API_URL =
  "https://script.google.com/macros/s/AKfycbyCZ7NHmAWhw8pfeL-aFKGgSHRN16NzcsSU1TIrX5Px2aSZBmEGXOlwZdUOolvnUORQ/exec";
const TOKEN = "hesed-qanda-2026";
const DRAFT_KEY = "hesed-qanda-draft-v1";
const MAX_BYTES = 20 * 1024 * 1024;

const QUESTION_STATUSES = ["준비 완료", "확인 중", "해당 없음"];
const HOMEPAGE_STATUSES = ["수정 완료", "수정 예정", "그대로 유지"];

// ---------- 임시 저장 ----------
// answers: { qid: { status, answer, link } }
// files:   { qid: [ { name } ] }        (업로드에 성공한 파일만)
// dirty:   { sectionId: true }          (서버에 아직 저장하지 않은 변경)
// savedAt: { sectionId: "오후 3:12" }
let draft = { answers: {}, files: {}, dirty: {}, savedAt: {} };

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) draft = { ...draft, ...JSON.parse(raw) };
  } catch {
    // 저장소를 쓸 수 없으면 빈 상태로 시작합니다.
  }
}

function persist() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // 저장 공간이 없거나 막혀 있어도 페이지는 계속 동작합니다.
  }
}

function answerOf(qid) {
  return (draft.answers[qid] ||= { status: "", answer: "", link: "" });
}

let uploadsInFlight = 0;

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

function timeLabel() {
  return new Date().toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
}

// Content-Type을 넣지 않아 text/plain으로 전송됩니다 (CORS 사전 요청 회피).
async function post(data) {
  const res = await fetch(API_URL, { method: "POST", body: JSON.stringify(data) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  let json = null;
  try {
    json = await res.json();
  } catch {
    // 응답이 JSON이 아니어도 HTTP 성공이면 저장된 것으로 봅니다.
  }
  if (json && (json.ok === false || json.error || json.status === "error")) {
    throw new Error(json.error || json.message || "저장 실패");
  }
  return json;
}

// ---------- 진행률 ----------
let questionItems = []; // 섹션 1~8 질문 [{ qid, sectionId }]
const progressEls = {};
const tocCountEls = {};

function isAnswered(qid) {
  const a = draft.answers[qid];
  const hasFiles = (draft.files[qid] || []).length > 0;
  return Boolean(hasFiles || (a && (a.status || a.answer.trim() || a.link.trim())));
}

function updateProgress() {
  const total = questionItems.length;
  const done = questionItems.filter((q) => isAnswered(q.qid)).length;
  progressEls.text.textContent = `${total}개 중 ${done}개 응답`;
  progressEls.fill.style.width = `${total ? (done / total) * 100 : 0}%`;
  for (const [sid, info] of Object.entries(tocCountEls)) {
    const n = info.qids.filter((qid) =>
      info.homepage ? Boolean(draft.answers[qid]?.status) : isAnswered(qid)
    ).length;
    info.el.textContent = `${n}/${info.qids.length}`;
  }
}

// ---------- 섹션 저장 상태 표시 ----------
const saveMsgEls = {};

function showSaveState(sectionId) {
  const msg = saveMsgEls[sectionId];
  if (!msg) return;
  if (draft.dirty[sectionId]) {
    msg.className = "save-msg save-msg--dirty";
    msg.textContent = "저장하지 않은 변경이 있습니다";
  } else if (draft.savedAt[sectionId]) {
    msg.className = "save-msg save-msg--ok";
    msg.textContent = `저장됨 (${draft.savedAt[sectionId]})`;
  } else {
    msg.className = "save-msg";
    msg.textContent = "";
  }
}

function markDirty(sectionId) {
  draft.dirty[sectionId] = true;
  persist();
  showSaveState(sectionId);
  updateProgress();
}

// ---------- 질문 항목 (섹션 1~8) ----------
function statusChoices(name, statuses, current, onPick, box = false) {
  const group = el("div", { class: "choices", role: box ? "group" : "radiogroup" });
  for (const s of statuses) {
    const input = el("input", {
      type: box ? "checkbox" : "radio",
      name,
      value: s,
      checked: current === s,
    });
    input.addEventListener("change", () => {
      if (box) {
        // 체크박스 모양이지만 하나만 선택되도록 합니다. 다시 누르면 선택 해제.
        group.querySelectorAll("input").forEach((o) => {
          if (o !== input) o.checked = false;
        });
        onPick(input.checked ? s : "");
      } else {
        onPick(s);
      }
    });
    group.append(el("label", { class: box ? "choice choice--box" : "choice" }, input, el("span", {}, s)));
  }
  return group;
}

function textField(kind, label, value, placeholder, onInput) {
  const id = `f-${Math.random().toString(36).slice(2)}`;
  const printVal = el("div", { class: "print-only print-val", "data-kind": kind }, value);
  const input =
    kind === "answer"
      ? el("textarea", { id, rows: 3, placeholder })
      : el("input", { id, type: "url", class: "link", inputmode: "url", placeholder, autocomplete: "off" });
  input.value = value;
  input.addEventListener("input", () => {
    printVal.textContent = input.value;
    onInput(input.value);
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

  const setDone = (row, name) => {
    row.className = "file file--done";
    row.querySelector(".file__name").textContent = `✓ ${name}`;
    row.querySelector(".file__state").textContent = "";
  };

  // 이전에 올린 파일 목록 복원
  for (const f of draft.files[qid] || []) setDone(addRow(f.name), f.name);

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
      await post({
        token: TOKEN,
        action: "upload",
        qid,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        base64,
      });
      setDone(row, file.name);
      (draft.files[qid] ||= []).push({ name: file.name });
      persist();
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

function renderQuestion(section, item) {
  const a = answerOf(item.id);
  const dirty = () => markDirty(section.id);

  const body = el(
    "div",
    { class: "q__body" },
    statusChoices(`st-${item.id}`, QUESTION_STATUSES, a.status, (v) => {
      a.status = v;
      dirty();
    }),
    textField("answer", "답변", a.answer, "답변을 적어 주세요", (v) => {
      a.answer = v;
      dirty();
    })
  );

  if (item.upload === "link") {
    body.append(
      textField("link", "영상 공유 링크", a.link, "구글드라이브, WeTransfer 등 공유 링크", (v) => {
        a.link = v;
        dirty();
      })
    );
  } else {
    body.append(
      renderUpload(item.id),
      textField("link", "공유 링크 (20MB가 넘는 파일)", a.link, "구글드라이브, WeTransfer 등 공유 링크", (v) => {
        a.link = v;
        dirty();
      })
    );
  }

  return el(
    "div",
    { class: "q", id: `q-${item.id}` },
    el(
      "div",
      { class: "q__head" },
      el("span", { class: "q__num" }, item.id),
      el("div", {}, el("p", { class: "q__text" }, item.question), item.reason && el("p", { class: "q__reason" }, item.reason))
    ),
    body
  );
}

// ---------- 홈페이지 업데이트 (섹션 9) ----------
function renderHomepageSection(section) {
  const frag = [];
  if (section.intro) frag.push(el("p", { class: "hp-intro" }, section.intro));

  for (const g of section.groups) {
    const hasFix = g.items.some((it) => it.fix);
    const head = el("tr", {}, el("th", {}, ""), el("th", {}, "페이지"), el("th", {}, "현재 문구"), hasFix && el("th", {}, "수정 내용"), el("th", {}, "진행"));
    const rows = g.items.map((it) => {
      const a = answerOf(it.id);
      return el(
        "tr",
        {},
        el("td", { class: "hp-id" }, it.id),
        el("td", { "data-label": "페이지" }, it.page),
        el("td", { "data-label": "현재 문구" }, it.current),
        hasFix && el("td", { "data-label": "수정 내용" }, it.fix || ""),
        el(
          "td",
          { class: "hp-choices" },
          statusChoices(
            `hp-${it.id}`,
            HOMEPAGE_STATUSES,
            a.status,
            (v) => {
              a.status = v;
              markDirty(section.id);
            },
            true
          )
        )
      );
    });
    frag.push(
      el(
        "div",
        { class: "hp-group" },
        el("h3", { class: "hp-group__title" }, g.title),
        g.note && el("p", { class: "hp-note" }, g.note),
        el("table", { class: "hp-table" }, el("thead", {}, head), el("tbody", {}, rows))
      )
    );
  }

  if (section.footnote) frag.push(el("p", { class: "hp-footnote" }, section.footnote));
  return frag;
}

function sectionQids(section) {
  return section.type === "homepage"
    ? section.groups.flatMap((g) => g.items.map((it) => it.id))
    : section.items.map((it) => it.id);
}

function sectionPayload(section) {
  return sectionQids(section).map((qid) => {
    const a = answerOf(qid);
    return section.type === "homepage"
      ? { qid, section: section.id, status: a.status, answer: "", link: "" }
      : { qid, section: section.id, status: a.status, answer: a.answer, link: a.link };
  });
}

async function saveSections(sections, button, msg) {
  button.disabled = true;
  const prevLabel = button.textContent;
  button.textContent = "저장 중…";
  msg.className = "save-msg";
  msg.textContent = "";
  try {
    await post({ token: TOKEN, action: "answers", items: sections.flatMap(sectionPayload) });
    const t = timeLabel();
    for (const s of sections) {
      delete draft.dirty[s.id];
      draft.savedAt[s.id] = t;
      showSaveState(s.id);
    }
    persist();
    msg.className = "save-msg save-msg--ok";
    msg.textContent = `저장됨 (${t})`;
  } catch {
    msg.className = "save-msg save-msg--error";
    msg.textContent = "저장하지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요.";
  } finally {
    button.disabled = false;
    button.textContent = prevLabel;
  }
}

// ---------- 페이지 ----------
function renderPage(root, data) {
  const sections = data.sections;
  questionItems = sections
    .filter((s) => s.type === "question")
    .flatMap((s) => s.items.map((it) => ({ qid: it.id, sectionId: s.id })));

  progressEls.text = el("span", {});
  progressEls.fill = el("div", { class: "bar__fill" });

  const topbar = el(
    "header",
    { class: "topbar" },
    el(
      "div",
      { class: "topbar__inner" },
      el("div", { class: "topbar__progress" }, progressEls.text, el("div", { class: "bar" }, progressEls.fill)),
      el("button", { type: "button", class: "btn-print", onclick: () => window.print() }, "인쇄")
    )
  );

  const toc = el(
    "ol",
    { class: "toc" },
    sections.map((s) => {
      const count = el("span", { class: "toc__count" });
      tocCountEls[s.id] = { el: count, qids: sectionQids(s), homepage: s.type === "homepage" };
      return el(
        "li",
        {},
        el("a", { href: `#s-${s.id}`, style: `--c:${s.color}` }, el("span", { class: "toc__title" }, s.title), count)
      );
    })
  );

  const sectionEls = sections.map((s) => {
    const msg = el("span", { class: "save-msg", "aria-live": "polite" });
    saveMsgEls[s.id] = msg;
    const btn = el("button", { type: "button", class: "btn-save" }, "이 섹션 저장");
    btn.addEventListener("click", () => saveSections([s], btn, msg));
    return el(
      "section",
      { class: "section", id: `s-${s.id}`, style: `--c:${s.color}` },
      el("h2", { class: "section__title" }, s.title),
      s.type === "homepage" ? renderHomepageSection(s) : s.items.map((it) => renderQuestion(s, it)),
      el("div", { class: "savebar" }, btn, msg)
    );
  });

  const finalMsg = el("p", { class: "save-msg", "aria-live": "polite" });
  const finalBtn = el("button", { type: "button", class: "btn-save" }, "전체 저장");
  finalBtn.addEventListener("click", () => saveSections(sections, finalBtn, finalMsg));

  root.replaceChildren(
    topbar,
    el(
      "div",
      { class: "wrap" },
      el(
        "div",
        { class: "intro" },
        el("h1", {}, data.title),
        el("p", {}, "답변은 섹션별로 저장되며, 나중에 다시 들어와 이어서 작성하실 수 있습니다. 구글 로그인은 필요 없습니다.")
      ),
      toc,
      sectionEls,
      el("div", { class: "final" }, finalBtn, finalMsg)
    )
  );

  for (const s of sections) showSaveState(s.id);
  updateProgress();
}

async function start(root) {
  loadDraft();
  try {
    const res = await fetch("/hesed-qanda/questions.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    renderPage(root, await res.json());
  } catch {
    root.replaceChildren(el("p", { class: "load-error" }, "질문을 불러오지 못했습니다. 새로고침해 주세요."));
  }
}

window.addEventListener("beforeunload", (e) => {
  if (uploadsInFlight > 0 || Object.keys(draft.dirty).length > 0) {
    e.preventDefault();
    e.returnValue = "";
  }
});

const root = document.getElementById("app");
guardPage(root, () => start(root));
