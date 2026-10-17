헤세드 자료 확인 질문지 (/hesed-qanda)
=====================================

이 페이지는 무엇인가요
- 헤세드 미국 런칭 준비를 위해 제조사에 자료와 답변을 받는 임시 질문지입니다.
- Purple Chicago Project 사이트와는 별개인 비즈니스용 페이지로,
  헤더·푸터·메뉴 어디에도 링크되어 있지 않고 검색엔진 노출도 막아 두었습니다
  (페이지의 noindex 태그 + robots.txt).
- 비밀번호: hesedqna2026 (같은 브라우저 세션 동안은 다시 묻지 않음)
- 답변과 올린 파일은 Google Apps Script(app.js 상단의 API_URL)로 저장됩니다.
  작성 중인 내용은 응답자 브라우저의 localStorage에도 임시 저장됩니다.

폴더 안의 파일
- index.html      페이지 본체
- app.js          질문 그리기, 저장, 파일 올리기
- auth.js         비밀번호 잠금 (js/partner-toolkit-auth.js를 복사해 고친 것)
- style.css       이 페이지 전용 디자인
- questions.json  질문 데이터 (문구를 바꾸려면 이 파일만 고치면 됩니다)
- README.txt      이 안내문

삭제 방법 (답변을 다 받은 뒤)
1. hesed-qanda 폴더를 통째로 삭제합니다.
2. 사이트 루트의 robots.txt에서
   "# 헤세드 질문지: 삭제할 때 이 줄도 함께 삭제" 주석 줄과
   바로 아래 "Disallow: /hesed-qanda" 줄을 삭제합니다.
3. 커밋하고 main에 push하면 Cloudflare Pages에 반영됩니다.
그 밖에 사이트의 다른 파일은 이 페이지 때문에 바뀐 것이 없습니다.
