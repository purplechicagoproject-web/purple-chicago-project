# 배포 체크리스트

## 1. 구글 시트 CSV 링크
`js/config.js`의 `CSV_URL`은 시트의 **웹에 게시(Publish to web) → CSV** 링크로
연결되어 있습니다 (`.../pub?output=csv` 형태). 시트를 다른 문서로 교체하거나
게시를 재설정한 경우에만 이 값을 갱신하면 됩니다.

새 주소를 시트에 추가했다면 `python3 scripts/geocode.py` 를 한 번 실행해서
`data/geocode-cache.json`을 갱신하고 함께 배포하세요.

## 2. Cloudflare Pages 배포
- `homepage` 폴더 전체를 그대로 업로드/연결 (빌드 커맨드 없음, 출력 디렉터리는 루트)
- `functions/` 폴더는 Cloudflare Pages Functions로 자동 인식됩니다.

## 3. 클릭 트래킹용 KV 네임스페이스 연결
1. Cloudflare 대시보드 > Workers & Pages > KV 에서 네임스페이스 생성 (예: `pchip-clicks`)
2. 해당 Pages 프로젝트 > Settings > Functions > KV namespace bindings
   - Variable name: `PCHIP_CLICKS`
   - KV namespace: 위에서 만든 네임스페이스 선택
3. (선택) Settings > Environment variables 에 `STATS_TOKEN`을 설정하면
   `/api/stats?token=...` 으로만 카운트를 조회할 수 있습니다. 설정하지 않으면
   `/api/stats` 는 누구나 조회 가능합니다.

배포 후 확인:
- `/api/stats` → 각 업체 슬러그별 클릭 수 JSON

## 4. 도메인 연결
Cloudflare Pages 프로젝트 > Custom domains 에서 고데디 도메인의 네임서버를
Cloudflare로 변경하거나 CNAME을 연결합니다.

## 새 벤더 추가 시 체크리스트
1. 구글 시트에 행 추가 (주소는 `우편번호까지 정확하게`, 여러 지점은
   `지점명: 주소 | 지점명2: 주소2` 형식)
2. `images/vendors/<slug>/` 에 로고+사진 넣고, 시트의 `logo_file` 칸에
   `images/vendors/<slug>/파일명` 을 한 줄에 하나씩 입력 (첫 줄에 로고 권장)
3. `scripts/optimize_images.sh` 실행 → 웹용 압축 이미지 생성
4. `scripts/geocode.py` 실행 → 새 주소 좌표 캐싱
5. 커밋/배포

## 로컬에서 미리보기
`python3 scripts/dev_server.py [포트]` 로 캐시를 끈 로컬 서버를 띄울 수 있습니다
(기본 포트 8765). 일반 `python3 -m http.server`는 브라우저가 JS 파일을 캐싱해서
수정 사항이 반영 안 된 것처럼 보일 수 있어 이 스크립트를 권장합니다.
