# 리뉴얼 페이지 (web/redesign)

`docs/design-system.md` 의 확정 디자인을 실제 페이지로 구현하는 곳이다. **저장소 루트의 기존 페이지(index.html, prompt/ 등)는 건드리지 않는다.** 빌드할 때 `scripts/sync-static.mjs` 가 스위치에 따라 기존 페이지 대신 이 폴더의 새 페이지를 `public/` 에 넣는다.

## 스위치 — `pages.json`
| 키 | 뜻 |
|---|---|
| `pages` | 주소 → 이 폴더 `pages/` 의 파일 (예: `"/": "home.html"`) |
| `preview` | **테스트·미리보기 배포**(Vercel Preview, 로컬 빌드)에서 새 디자인으로 보여줄 주소 |
| `production` | **운영(donbuff.com)** 에서 새 디자인으로 보여줄 주소 |

- 운영은 `VERCEL_ENV=production` 일 때만 `production` 목록을 쓴다. 지금은 **비어 있어서 운영은 기존 모습 그대로**다.
- 완성된 페이지를 운영에 여는 방법: 해당 주소를 `production` 배열에 추가 → 배포. 문제가 생기면 배열에서 빼면 즉시 기존 페이지로 돌아간다.
- 새 페이지를 만들 때: `pages/<이름>.html` 작성 → `pages` 와 `preview` 에 주소 추가.

## 구성
- `shared/frame.css` · `shared/frame.js` — 공통 틀(색 변수, 1200px 틀, 헤더·메뉴·푸터, 버튼, 드롭다운·모바일 메뉴·공통 측정)
- `partials/header.html` · `partials/footer.html` — 모든 페이지가 공유. 페이지에서 `<!--@header active=prompt over=1-->`, `<!--@footer-->` 로 끼워 넣는다.
- `pages/*.html` + `pages/*.css` + `pages/*.js` — 페이지별 파일. 프롬프트 개수는 `{{TOTAL}}`, `{{N:카테고리명}}` 자리표시자가 **빌드할 때 `prompt/index.html` 데이터에서 자동으로** 채워진다.
- `img/` — 리뉴얼에서 쓰는 이미지(`hero-3d.webp`: 히어로 3D 일러스트, 투명 배경. 로고는 흰 배경을 투명하게 가공한 임시본 — 투명 배경 원본으로 교체 필요)

## 기존 기능과의 연결
- 로그인 메뉴: 헤더 `nav.dbx-nav` 와 모바일 메뉴 `.dbx-menu` 에 `auth-nav.js` 가 버튼을 넣는다(스타일은 `frame.css` 가 덮어쓴다).
- 측정(GA4): 기존 홈과 같은 이벤트 이름(`home_service_click`, `hero_tag_click`, `calc_home_banner_view/click`, `nav_menu_open/click`, `contact_click`)을 유지한다. 클래스·id(`.svc-card`, `#svc-prompt`, `#svc-invest`, `#svc-calc`, `[data-hero]`, `[data-ga]`)를 바꾸면 측정이 끊긴다.
- 테스트 주소에서는 GA4 가 나가지 않는다(donbuff.com 만 측정).

## 알려진 임시 사항
- 카테고리 아이콘(주식투자·부동산·절세전략·재테크루틴)은 시안용 임시 선 아이콘. 히어로의 3D 이미지(`img/hero-3d.webp`)는 확정본
- 로고는 투명 처리한 임시본, 512px 아이콘 없음
- 카테고리 카드는 아직 `/prompt/` 로만 연결(프롬프트 페이지가 카테고리 선택 주소를 받도록 하는 작업은 프롬프트 페이지 리뉴얼 때)
- 로그인 후 `내 계정 ▾` 드롭다운(내 결과·즐겨찾기·프로필)은 미구현 — 현재는 `내 계정` 버튼이 계정 화면으로 연결

## 프롬프트 페이지 (`pages/prompt.*`)
- **데이터는 기존 `prompt/index.html` 에서 빌드할 때 자동으로 가져온다**(`<!--@promptdata-->`): `PROMPTS`, `AI_LINKS`, `REVIEWS`, `CHALLENGE_REVIEWS`, `NEW_PROMPTS`, `catSections`, `catLabels`. 저자는 기존 파일에 한 줄 추가하는 방식 그대로 쓰면 새 페이지에도 반영된다. 빌드가 데이터를 실제로 실행해 검증하고(번호 중복, 빠진 값, 없는 카테고리) 이상하면 **빌드를 멈춘다**.
- 헤더는 `variant=book`: 메인 메뉴 없이 로고(=돈버프 메인으로 이동) + 자료실 · 독자 오픈채팅방 · 책 구매하기(+로그인). 책을 홍보하는 페이지이므로 이 버튼들을 유지한다.
- 목록(기본)·카드 보기 전환(선택은 `dbx:prompt:view` 에 기억, `?view=grid` 로 시작 가능). 프롬프트 본문은 행을 펼칠 때(또는 카드 팝업을 열 때) 처음 만든다.
- **로그인 게이트·측정과 맞물리는 이름은 바꾸지 말 것**: 전역 함수 `getFavorites` `saveFavorites` `toggleFavorite` `updateFavCount` `render` `copyPrompt` `jumpToPrompt`(반드시 `function` 선언), 요소 `.star-btn[data-idx]` `.prompt-row#row-…` `[data-toggle]` `[data-open]` `[data-view]` `.copy-btn` `.go-btn` `.ftab[data-cat]` `#searchInput` `#todayCard` `#newPromptList` `#mainList`.
- 측정: 기존 `prompt_open/copy/ai_open/filter/search`, `today_pick_click`, `new_prompt_click` 에 더해 `prompt_view`(목록/카드 전환). 카드 보기에서도 `prompt_open` 이 나간다.
- 즐겨찾기는 로그인 회원 전용(비로그인 ★ → `/join/`)이다. 기존 설계 그대로.

## 금융계산기 (`pages/calc-*.html`, `calc.css`, `calc-hub.css`)
- 대상 주소: `/calc/`(허브) · `/calc/why/`(차별점 소개, **리뉴얼에서 새로 생기는 페이지**) · `/calc/brokerage/` · `/calc/loan-prepay/` · `/calc/fx/`.
- 계산기 3종은 **기존 마크업(id·class)과 계산 스크립트를 그대로 복사**하고 겉모습만 새로 입혔다(`calc.css` 가 `.rd` 안의 기존 class 를 스타일링). 기존 계산기를 고치면 이 파일들도 같이 고쳐야 한다 → `test-calc` 가 기존 페이지의 id 와 스크립트가 모두 있는지 확인한다.
- `내 결과 저장` 버튼은 로그인 모듈(`auth-gates.js`)이 `#result` 바로 뒤에 넣는다 → 계산기 안에서 `#result` 의 다음 형제 자리를 유지할 것. 문구는 `calc.js` 가 `☆ 내 결과 저장하기` 로 맞춘다.
- AI 심층분석 카드의 `🔒 로그인 후 이용할 수 있어요` 는 로그인 상태면 `calc.js` 가 숨긴다.
- 허브는 `calc/data/calculators.json`(레지스트리)에서 카드를 그린다. 카드 설명은 질문형 문구를 `calc-hub.js` 의 `QUESTION` 에 둔다.
- 기존 "WHY CALC BUFF" 팝업은 없앴다. 모든 진입점(허브 히어로 링크·하단 배너)이 `/calc/why/` 로 간다.
- 측정: `calc_hub_view` `calc_interest`(기존), `calc_why_view` `calc_why_click` `calc_why_cta`(신규).
- 차별점 페이지의 수치(서울 주택 매매 5억 → 상한 0.4%·200만 원 / 대출 3,000만 원·1.2%·3년 → 245,364원)는 **계산 엔진으로 직접 계산한 값**이다. 요율·엔진이 바뀌면 이 숫자도 확인할 것.
