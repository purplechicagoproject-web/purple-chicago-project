헤세드 자료 확인 질문지 (/hesed-qanda)
=====================================

이 페이지는 무엇인가요
- 헤세드 미국 런칭 준비를 위해 제조사에 자료와 답변을 받는 임시 질문지입니다.
- Purple Chicago Project 사이트와는 별개인 비즈니스용 페이지로,
  헤더·푸터·메뉴 어디에도 링크되어 있지 않고 검색엔진 노출도 막아 두었습니다
  (페이지의 noindex 태그 + robots.txt).
- 비밀번호: 2026qna (같은 브라우저 세션 동안은 다시 묻지 않음)
- 비밀번호 다음에 입력자 이름을 받고(기기에 기억), 모든 저장과 업로드에 함께 보냅니다.
- 답변과 올린 파일은 Google Apps Script v2(app.js 상단의 API_URL)에 저장됩니다.
  페이지를 열 때 서버에서 기존 내용을 불러오고, 입력하면 바뀐 항목만 자동 저장합니다
  (글자 입력은 멈추고 2초 뒤, 선택 버튼은 바로). 서버 내용이 기준입니다.
- localStorage에는 입력자 이름과, 저장에 실패해 다시 보낼 항목만 잠시 보관합니다.

폴더 안의 파일
- index.html      페이지 본체
- app.js          질문 그리기, 저장, 파일 올리기
- auth.js         비밀번호 잠금 (js/partner-toolkit-auth.js를 복사해 고친 것)
- style.css       이 페이지 전용 디자인
- questions.json  질문 데이터 (문구를 바꾸려면 이 파일만 고치면 됩니다)
- hesed-checklist.pdf  인쇄용 체크리스트 (페이지 위쪽 "체크리스트 열기" 버튼이 새 탭으로 엶)
- README.txt      이 안내문

체크리스트 PDF 교체
- 위치: hesed-qanda/hesed-checklist.pdf
- 바꾸려면 새 PDF를 같은 이름(hesed-checklist.pdf)으로 덮어쓰고 커밋, push하면 됩니다.
  코드는 고칠 필요가 없습니다.

인쇄
- 화면의 인쇄 버튼은 없앴습니다. 브라우저 인쇄(Cmd + P)를 쓰면 style.css의
  @media print 설정대로 버튼·입력칸 테두리·안내 띠 없이 질문과 답변만 나옵니다.

보내기 전에 테스트 리셋 버튼 삭제
- [완료] index.html, style.css, app.js의 "TEST RESET" 표시 부분을 모두 지웠습니다.
  리셋 요청(action: "reset")을 보내는 코드도 페이지에 남아 있지 않습니다.

삭제 방법 (답변을 다 받은 뒤)
1. hesed-qanda 폴더를 통째로 삭제합니다.
2. 사이트 루트의 robots.txt에서
   "# 헤세드 질문지: 삭제할 때 이 줄도 함께 삭제" 주석 줄과
   바로 아래 "Disallow: /hesed-qanda" 줄을 삭제합니다.
3. 커밋하고 main에 push하면 Cloudflare Pages에 반영됩니다.
그 밖에 사이트의 다른 파일은 이 페이지 때문에 바뀐 것이 없습니다.
