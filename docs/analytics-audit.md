# GA4 측정 점검 (2026-11-12)

측정 ID `G-GW588P483F` 하나를 정적 페이지(13개)와 회원 앱(Next) 모두가 공유한다. 이 문서는 코드에서 확인한 현황, 발견한 빈틈, 이번에 보완한 것, GA4 화면에서 해야 할 설정을 정리한다.

## 1. 사이트 구조와 측정 현황

| 영역 | 주소 | GA4 기본 코드 | 사용자 지정 이벤트 |
|---|---|---|---|
| 홈 | `/` | 있음 | `nav_menu_open/click`, `hero_tag_click`, `calc_home_banner_view/click` → **보완:** `home_service_click`, `contact_click` |
| 돈 버는 프롬프트 | `/prompt/` | 있음 | (보완 전) **없음** → **보완:** `prompt_open/copy/ai_open/filter/search`, `today_pick_click`, `new_prompt_click`, `favorite_toggle` |
| 투자 성향 | `/invest-mbti/` | 있음 | `test_start/complete`, `ai_deepdive_click`, `link_share`, `image_save` |
| 계산기 4종 | `/calc/brokerage·fx·loan-prepay/`, `/fee/brokerage-fee/` | 있음 | `calc_view/start/result/ai_generate/interest/error` |
| 계산기·수수료 허브 | `/calc/`, `/fee/` | 있음 | `calc_hub_view`, `fee_hub_view`, `calc_interest` |
| 요율표·새 홈 시안·개인정보 | `/calc/brokerage/rates/`, `/fee/brokerage-rates/`, `/new/`, `/privacy.html` | **없었음 → 보완** | — |
| 회원 앱 | `/login` `/signup` `/join` `/account` 등 | 있음(production 빌드) | `gate_trigger/view/click`, `signup_start/complete`, `save_click/save_result` → **보완:** `login`, `favorite_toggle` |

## 2. 발견한 빈틈

| # | 빈틈 | 영향 | 조치 |
|---|---|---|---|
| 1 | 페이지 4곳에 GA4 코드 없음(요율표 2, `/new/`, `/privacy.html`) | 개인정보처리방침·요율표 조회가 통계에 안 잡힘. 가입 화면에서 방침을 보는 사람 수도 알 수 없음 | 빌드 때 기본 코드 자동 삽입(`sync-static`) |
| 2 | **프롬프트 페이지에 사용자 지정 이벤트 0개** | 서비스의 핵심(172개 프롬프트)에서 어떤 프롬프트가 열리고 복사되는지 전혀 모름 | `prompt_*` 7종 추가 |
| 3 | 로그인(`login`) 이벤트 없음, 가입(`signup_complete`)만 있음 | 재방문 회원 수, 로그인 방식(구글/이메일) 비율을 알 수 없음 | GA4 권장 이벤트 `login` 추가(직접 로그인한 경우만) |
| 4 | 회원/비회원 구분 없음 | 모든 지표가 섞임. 회원 전환 효과 비교 불가 | 사용자 속성 `member_status` (member·guest) |
| 5 | 홈의 주요 서비스 카드 클릭, 문의 링크 클릭 측정 없음 | 홈에서 어느 서비스로 가는지 알 수 없음 | `home_service_click`, `contact_click` |
| 6 | 즐겨찾기 사용 측정 없음 | 로그인 전용 기능이 쓰이는지 모름 | `favorite_toggle` |
| 7 | 테스트·개발자 방문이 같은 속성에 섞임 | 방문자 수 과대 집계 | **GA4 관리 화면 설정 필요**(아래 3절) |
| 8 | `/new/` 가 홈과 같은 제목(중복 페이지) | 검색 중복 색인 위험 | 사이트맵에서 제외. 페이지 정리는 별도 결정 필요 |

## 3. GA4 화면에서 설정할 것 (코드로 못 함)

1. **내부 트래픽 제외:** 관리 → 데이터 스트림 → 웹 스트림 → 태그 설정 구성 → 내부 트래픽 정의(내 IP), 관리 → 데이터 설정 → 데이터 필터 → Internal Traffic 을 **테스트 → 활성**.
2. **향상된 측정 확인:** 웹 스트림 → 향상된 측정이 켜져 있고 "페이지 변경(브라우저 기록 이벤트 기반)"이 포함돼 있어야 회원 앱의 화면 이동이 페이지뷰로 잡힌다.
3. **맞춤 측정기준 등록**(이벤트 매개변수를 보고서에서 쓰려면 등록 필요, 범위=이벤트):

| 매개변수 | 쓰이는 이벤트 |
|---|---|
| `calculator_id`, `category` | calc_* |
| `gate_id` | gate_*, signup_* |
| `source`, `method` | signup_complete, login |
| `tool` | save_click, save_result |
| `result_type` | test_complete, link_share … |
| `prompt_category`, `prompt_ai`, `prompt_level`, `prompt_idx` | prompt_* |
| `search_term` | prompt_search |
| `target`, `channel`, `ai_service`, `action` | home_service_click, contact_click, prompt_ai_open, favorite_toggle |

   사용자 속성 `member_status`(범위=사용자)도 등록한다.
4. **키 이벤트(전환) 지정:** `signup_complete`, `login`, `save_result`, `calc_ai_generate`, `prompt_copy`, `test_complete`, `contact_click`.
5. **데이터 보관:** 관리 → 데이터 설정 → 데이터 보관 → 이벤트 데이터 **14개월**(기본 2개월이라 길게 바꿔야 탐색 보고서에 과거를 쓸 수 있다).

## 4. 이벤트 사전 (새로 추가한 것)

| 이벤트 | 시점 | 주요 매개변수 |
|---|---|---|
| `prompt_open` | 닫힌 프롬프트 행을 열 때 | prompt_idx, prompt_category, prompt_ai, prompt_level |
| `prompt_copy` | 프롬프트 복사 | 위와 같음 (본문은 보내지 않음) |
| `prompt_ai_open` | "AI에서 열기" 링크 | + ai_service |
| `prompt_filter` | 카테고리 탭 | category |
| `prompt_search` | 검색(입력 후 1초, 2글자 이상) | search_term, result_count |
| `today_pick_click` | 오늘의 돈버프 카드 | prompt_idx |
| `new_prompt_click` | 새 프롬프트(블로그) 링크 | destination |
| `favorite_toggle` | 즐겨찾기 추가/삭제(로그인) | action, prompt_idx |
| `home_service_click` | 홈 서비스 카드 | target (prompt, invest) |
| `contact_click` | 카카오·유튜브·이메일 링크 | channel |
| `login` | 직접 로그인 직후 | method (google, email) |

개인정보 원칙: 입력 금액·프롬프트 본문·이메일 주소는 보내지 않는다. 검색어는 40자까지, 2글자 이상만 전송한다.

## 5. 아직 하지 않은 것 (결정·검토 필요)
- **쿠키·측정 동의:** GA4 쿠키 사용 고지·동의 방식이 개인정보처리방침에 반영돼 있는지는 최종 법률 점검 때 함께 확인.
- **전환 퍼널 보고서:** 키 이벤트와 맞춤 정의 등록 후 탐색 보고서로 `gate_view → login/signup_complete → save_result` 퍼널을 만든다.
- **계산기 이벤트 정리:** `calc_*` 는 계산기마다 매개변수가 다를 수 있어 데이터가 쌓인 뒤 점검한다.
- **사용자 ID(user_id) 연동:** 회원 단위 분석이 필요해지면 검토(개인정보 영향 때문에 지금은 하지 않음).
