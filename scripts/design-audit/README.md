# design-audit — 헤드리스 크롬 스크린샷·지표 수집

디자인 감사를 위해 공개 페이지를 PC(1440)·모바일(390) 두 뷰포트로 전체 높이 캡처하고,
타이포·색·컨테이너 폭·가로 넘침·레거시 클래스 등 지표를 JSON 으로 모은다.

- 의존성 없음 (Node 24+, 전역 `fetch`/`WebSocket` 사용). puppeteer/playwright 설치 안 함.
- 로컬에 설치된 Chrome 을 `--headless=new` 로 띄워 DevTools Protocol 로 직접 제어한다.
  사용자의 Chrome 과 충돌하지 않도록 임시 `--user-data-dir` 을 쓰고, 끝나면 지운다.

## 사용

```bash
# 프로덕션 (공개 페이지, 비로그인)
node scripts/design-audit/capture.mjs \
  --base https://jaramk.vercel.app \
  --out scripts/design-audit/screenshots \
  --pages scripts/design-audit/pages.production.json

# 로컬 개발 서버 (파일명 접두어로 구분)
node scripts/design-audit/capture.mjs --base http://127.0.0.1:3100 \
  --out scripts/design-audit/screenshots --pages my-pages.json --prefix local_ --load-timeout 90000
```

옵션: `--base` `--out` `--pages` `--prefix` `--viewports pc,mobile` `--load-timeout <ms>` `--port <n>` `--chrome <exe>`

## 페이지 목록 형식

```json
[
  { "path": "/about" },
  {
    "path": "/", "name": "home_menu-open", "viewports": ["mobile"],
    "actions": [
      { "type": "click", "text": "메뉴 열기", "within": "header", "fallback": "header button" },
      { "type": "wait", "ms": 500 },
      { "type": "click", "text": "교육프로그램", "within": "header", "requireExpandable": true, "optional": true }
    ]
  }
]
```

- `name` 생략 시 경로에서 슬러그 생성 (`/` → `home`, `/board/notice` → `board-notice`).
- `actions`: `click`(`selector` 또는 `text`(aria-label/텍스트 일치), `within`, `fallback`, `optional`,
  `requireExpandable` = button/summary/aria-expanded 요소일 때만 클릭) / `wait`(`ms`).

## 출력 (`--out`)

- `<prefix><pc|mobile>_<slug>.png` — 전체 높이(최대 12000px) 캡처
- `metrics.json` — 페이지별 지표 배열 (같은 파일명은 덮어쓰기, 여러 번 실행해 누적 가능)
- `index.json` — 파일·크기·높이·로드 시간·콘솔 오류/HTTP 4xx·실패 사유

`scripts/design-audit/screenshots/` 는 .gitignore 대상이다.
