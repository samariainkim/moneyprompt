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

## 투자 성향 검사 (`pages/invest-mbti.html`, `mbti.js`, `mbti.css`, `mbti-reflect.js`)
- **검사 로직은 원본(`invest-mbti/index.html`)과 같다.** `mbti.js` 는 원본 스크립트를 그대로 가져오고, **화면을 그리는 3개 구간만** 바꿨다: 5(상단 진행 바·헤더), 6(인트로), 14(결과 화면). 데이터·상태·판정·1~5단계·AI 프롬프트·공유·부팅 구간은 글자까지 같아야 한다.
  - 확인: `node web/scripts/verify-mbti-parity.mjs` (구간별 동일 여부) — 원본 `invest-mbti/index.html` 의 로직을 고쳤다면 `mbti.js` 에도 같이 반영하고 이 스크립트로 확인할 것.
  - 동작 비교 시험: 무작위 응답 400개로 두 페이지의 유형·강도·온도·AI 프롬프트를 비교(16유형 모두 등장)했고 모두 같았다. (`computed_at` 시각만 다름)
- 사이트 공통 헤더·푸터는 단계 화면(1~5단계)에서 숨기고(`body[data-screen=step]`), 대신 `← 진행 막대 · 나가기` 헤더와 작은 안내 문구만 둔다. 인트로·결과에서는 보인다.
- 로그인 모듈 연동(요소 이름 유지): `#app`, `#aiCta`(부모가 AI 카드 `.ai` 이어야 `내 결과 저장하기` 버튼이 AI 카드 바로 앞에 들어간다), `#promptBox`, `#promptText`, `#copyBtn`, `#shareBtn`, `#restartBtn`, `.res-code`. 저장 버튼 문구는 `calc.js` 가 맞춘다.
- 결과의 `나의 투자 행동 돌아보기` 문구는 `mbti-reflect.js`(8개 성향별 강점·주의할 점) — **초안이며 작성자 검수 후 확정**한다. 문구만 고치면 반영된다.
- '이 성향은 아직 뚜렷하지 않아요' 는 `이런 경향이 있지만, 이번 선택에서는 아직 뚜렷하게 드러나지 않았어요` 로 바꿨다. 강도 라벨 중 `경계` 만 쓴다(`뚜렷함/보통` 의 기준값은 원본에 '베타 후 확정 예정(임시값)' 이라 노출하지 않음).
- 투자 온도는 5단계의 2개 질문(가격 등락 선호·불편한 손실 폭)으로만 계산되며 유형과 별개다. 위험등급·적합성 진단이 아니라는 문구를 함께 보여준다.

## 8가지 성향 소개 페이지 (`pages/invest-mbti-paths.html`, `mbti-paths.css`) — `/invest-mbti/paths/`
- 리뉴얼에서 **새로 생기는 페이지**. 새 메뉴는 두지 않고, 검사 인트로와 결과 화면의 용어 팝업(`i`)에서만 연결한다.
- 성향 설명·끌리는 단어·갈림길 선택 문장은 **빌드 때 검사 원본(`invest-mbti/index.html`)의 `AXIS_LABELS` `KEYWORDS_RAW` `SCENARIOS` 에서 만든다**(`<!--@mbtipaths-->`, `sync-static.mjs`의 `mbtiPathsHtml`). 검사 데이터가 바뀌면 이 페이지도 자동으로 따라가고, 8개 성향 데이터가 비면 빌드가 멈춘다. 강점·주의 문구는 `mbti-reflect.js`(초안, 작성자 검수 필요)에서 가져온다.
- 갈림길 제목 4개("결론은 어디서 얻나요?" 등)는 `sync-static.mjs` 의 `MBTI_AXES_COPY` 에 있다.
- 측정: `mbti_paths_view` `mbti_paths_click`(source) `mbti_paths_cta`(target).

## 회원 화면 (Next.js 가 그리는 로그인·가입·마이페이지 등) — `member.css`, `src/components/rd/`, `src/lib/redesign.ts`
- 대상: `pages.json` 의 `nextPages` 에 적힌 주소 — `/join/ /login/ /signup/ /forgot-password/ /reset-password/ /welcome/ /onboarding/ /account/ /account/saved/ /pricing/ /terms/ /privacy/`.
- **켜고 끄기**: 정적 페이지와 같은 `preview` / `production` 목록을 쓴다(운영은 `VERCEL_ENV=production` 일 때 `production` 목록). 목록에 없으면 기존 화면 그대로. 운영에 열 때는 `production` 에 주소를 추가한다.
- 동작 방식: `proxy.ts` 가 요청 머리글 `x-dbx-path` 에 주소를 담고, `layout.tsx` 가 `rdEnabled(path)` 로 새 틀(`RdHeader`/`RdFooter`, `frame.css`·`member.css`·`frame.js`)과 기존 틀 중 하나를 고른다. 각 페이지는 자기 주소로 `rdEnabled` 를 확인해 새 화면(JSX)을 낸다. 폼 컴포넌트(로그인·가입·프로필 등)와 서버 동작은 그대로다.
- 404 페이지는 주소를 알 수 없어서 기존 모양 그대로다(나중에 필요하면 별도 처리).
- 마이페이지 요약 타일(내 결과·즐겨찾기 개수, 내 투자 성향)은 새 화면에서만 조회한다. 조회가 실패해도 화면은 열린다.
- 헤더의 `내 계정 ▾` 메뉴(내 결과·즐겨찾기 `/prompt/?fav=1`·프로필·마이페이지·로그아웃)는 `RdHeader`(Next.js)에서 그리고, 정적 페이지는 기존 `auth-nav.js` 가 맡는다. `frame.js` 의 드롭다운은 `.dd` 안의 `[data-dd]` 버튼이면 어디서나 동작한다.
- `/prompt/?fav=1` 로 오면 프롬프트 페이지가 즐겨찾기 보기로 열린다.

## 이동·처리 중 표시 (클릭했는데 반응이 없어 보이는 문제)
- `frame.js`: 링크를 누르거나 화면 전환(`beforeunload`)이 시작되면 **맨 위에 오렌지 진행 막대**를 바로 보여 주고, 누른 링크는 `is-nav`(흐리게·재클릭 불가)로 만든다. Next.js 의 화면 안 이동(`pushState`)이나 뒤로 가기에서는 자동으로 끝난다. 20초 안전장치가 있다. 모든 리뉴얼 페이지(정적·회원 화면)에서 동작한다.
- 버튼: 처리 중에는 `aria-busy="true"` + 비활성 + 스피너(`member.css`·`globals.css`). 로그인은 성공한 뒤에도 **이동이 끝날 때까지 '로그인 중…'을 유지**한다(예전에는 성공 직후 원래 모양으로 돌아가 다시 누르게 됐다). 소셜 로그인 버튼은 누르면 바로 '연결 중…'이 되고 한 번만 시작된다.
- 로딩 화면: `/account/`, `/account/saved/` 는 `loading.tsx` 로 데이터를 기다리는 동안 뼈대(skeleton)를 바로 보여 준다. **앱 전체(`app/loading.tsx`)에는 두지 말 것** — 서버 이동(`redirect`)이 '화면을 먼저 그린 뒤 이동'으로 바뀌어 HTTP 이동(307)이 사라진다.

## 이용약관 (`/terms/`) — 본문 데이터 `src/lib/legal/terms.ts`
- 본문은 운영자가 정리한 문구를 그대로 `terms.ts`(조항별 문단·번호 목록)에 담았고, 화면(목차·조항 카드)은 `components/rd/LegalDoc.tsx` 가 이 데이터로 그린다. **문구를 고칠 때는 `terms.ts` 만 수정**하면 새 디자인·기존 디자인 모두에 반영된다. 개인정보처리방침도 같은 구조(`LegalDoc`)로 옮길 예정.
- 제16조의 `[이메일 주소]` 는 부칙의 고객 문의 메일과 같게 채웠고, 시행일의 대괄호는 뺐다(`2026년 11월 10일`).
- **재동의**: 가입 때 동의한 문서는 DB `consent_documents` 의 `terms v1` 이다. 새 약관을 `v2` 로 등록(마이그레이션)하면 기존 회원에게 다시 동의를 받게 된다. DB 는 테스트·운영이 공유하므로 등록 시점은 운영 반영과 함께 정한다(아직 등록하지 않음).

## 개인정보처리방침 (`/privacy/`) — 본문 데이터 `src/lib/legal/privacy.ts`
- 이용약관과 같은 구조(`LegalDoc`)다. 본문은 운영자가 정리한 문구 그대로이고, **문구를 고칠 때는 `privacy.ts` 만 수정**한다. 표(제6조)·소제목(h3/h4)·머리말 블록을 지원한다.
- 제12조는 개인정보처리자·보호책임자(담당부서) `돈버프` + 문의 이메일로 확정했다(전화번호 항목은 뺌). 본문에 대괄호 `[ ]` 자리가 다시 생기면 화면에서 노란 점선 표시로 보인다(`highlightBrackets`).
- 머리말의 `[돈버프 임직원]`은 대괄호 없이 `돈버프 임직원(이하 "운영자")`로 썼고, 시행일은 이용약관과 같이 `2026년 11월 10일`로 맞췄다.
- 동의 문서(DB `consent_documents`의 `privacy v1`·`marketing v1`)와 기존 정적 페이지 `/privacy.html` 의 처리는 아직 정하지 않았다(운영 반영 시점에 함께 결정).
- **마케팅·광고성 이메일 수신 동의** 문구는 별도 페이지가 아니라 개인정보처리방침의 한 조항(`#marketing`, `privacy.ts` 의 `id: 'marketing'`)이다. 가입·약관 동의 화면의 마케팅 동의 링크는 `lib/consents.ts` 가 `/privacy/#marketing` 으로 연결한다(DB 값은 `/privacy/` 그대로).

- **용어 팝업 제거(2026-11-16)**: 결과 화면 "나를 만든 4가지 성향" 옆의 `i` 팝업을 없애고, 같은 자리의 `8가지 성향 자세히 보기 →` 링크로 상세 페이지(`/invest-mbti/paths/`) 하나로 통일했다. 성향 설명은 상세 페이지(`mbtiPathsHtml`)에서만 관리한다.
