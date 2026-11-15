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
- `pages/*.html` + `pages/*.css` — 페이지별 파일. 프롬프트 개수는 `{{TOTAL}}`, `{{N:카테고리명}}` 자리표시자가 **빌드할 때 `prompt/index.html` 데이터에서 자동으로** 채워진다.
- `img/` — 리뉴얼에서 쓰는 이미지(로고는 흰 배경을 투명하게 가공한 임시본 — 투명 배경 원본으로 교체 필요)

## 기존 기능과의 연결
- 로그인 메뉴: 헤더 `nav.dbx-nav` 와 모바일 메뉴 `.dbx-menu` 에 `auth-nav.js` 가 버튼을 넣는다(스타일은 `frame.css` 가 덮어쓴다).
- 측정(GA4): 기존 홈과 같은 이벤트 이름(`home_service_click`, `hero_tag_click`, `calc_home_banner_view/click`, `nav_menu_open/click`, `contact_click`)을 유지한다. 클래스·id(`.svc-card`, `#svc-prompt`, `#svc-invest`, `#svc-calc`, `[data-hero]`, `[data-ga]`)를 바꾸면 측정이 끊긴다.
- 테스트 주소에서는 GA4 가 나가지 않는다(donbuff.com 만 측정).

## 알려진 임시 사항
- 히어로 오브젝트(동전·돈주머니·계산기)와 카테고리 아이콘은 시안용 임시 그림
- 로고는 투명 처리한 임시본, 512px 아이콘 없음
- 카테고리 카드는 아직 `/prompt/` 로만 연결(프롬프트 페이지가 카테고리 선택 주소를 받도록 하는 작업은 프롬프트 페이지 리뉴얼 때)
- 로그인 후 `내 계정 ▾` 드롭다운(내 결과·즐겨찾기·프로필)은 미구현 — 현재는 `내 계정` 버튼이 계정 화면으로 연결
