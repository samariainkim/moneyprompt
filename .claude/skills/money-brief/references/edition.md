# edition.json 형식

한 호의 모든 것을 담는 파일이다. 완성 예시 3편: `assets/examples/001-loan-prepay.json`(계산기 연동), `002-fx.json`(환전·정보형), `003-year-end-tax.json`(계산 엔진 없이 공식 수치, 프롬프트 연동). 새 호는 가장 비슷한 예시를 복사해 고친다.

## 최상위
| 키 | 설명 |
|---|---|
| `no` | 호 번호(정수). **발행 순서**, 가장 큰 번호가 최신호 |
| `id` | 세 자리 문자열(`"004"`). 이미지 폴더 이름 `web/redesign/img/brief/<id>/` |
| `category` | `"뉴스 · 정책변화"` 형식(분류 · 주제) |
| `topic` | 메인 배너 표지 이름표(짧게: "환전", "연말정산") |
| `slug` | SNS 묶음 파일 이름용 영문(`loan-prepay`) |
| `title` | 호 제목(사이트 최신호 헤드라인) |
| `short` | 지난 호 목록용 짧은 제목 |
| `base_date` | 기준일 `YYYY.MM.DD` |
| `source_default` | 카드에 `source` 가 없을 때 쓸 출처 줄(`{{ }}` 사용 가능) |
| `calc` | 계산 엔진 입력(아래) |
| `cards` | 7장 |

## calc (계산 엔진, `scripts/engine.mjs`)
```json
"calc": {
  "usd":        {"engine":"fx_rate","currency":"USD"},
  "fx_out0":    {"engine":"fx","input":{"mode":"wire","direction":"out","currency":"USD","amount":"10000","prefPercent":"0"}},
  "loan_new":   {"engine":"loan","input":{"amountKrw":"300000000","executionDate":"2026-03-01","repaymentDate":"2027-03-01","periodMonths":36,"ratePercent":"0.65"}},
  "loan_new_30":{"engine":"loan_compare","of":"loan_new","offset_days":30}
}
```
- 본문에서 `{{id.필드|형식}}`: 예 `{{fx_out0.total_krw|won}}`, `{{loan_new_30.diff_krw|won}}`, `{{usd.spread_out}}`, `{{_meta.fx_rules}}`.
- fx 결과 필드: `total_krw`, `base_total_krw`, `diff_krw`, `applied_rate`, `base_rate`, `base_date` … / fx_rate: `base`, `tts`, `ttb`, `spread_out`, `spread_in`, `base_date` / loan: `fee_krw`, `remaining_days`, `total_days`, `repayment_date`, `end_date` / loan_compare: `fee_krw`, `diff_krw`, `date`, `remaining_days`.
- 새 계산 종류(증권사 수수료 등)가 필요하면 `engine.mjs` 에 항목을 추가하고 `crosscheck.py` 에 독립 검산을 같이 넣는다(검산이 없으면 경고만 나온다).
- `fx` 는 환율 데이터가 7일 넘게 오래되면 엔진이 거부한다. 발행 직전에 최신 환율로 다시 빌드한다.

## 카드 종류 (`type`)
공통: `bg: "warm"`(크림 배경), `source`(이 카드 출처 줄), 제목 크기 `fs`(기본 62).
- `cover`: `title_lines`(마지막 줄 `*강조*`), `sub`, `pills`[{`label`,`value`,`accent`}] 2개
- `points`: `label`,`tag`,`heading`,`items`[문장], `mini`(작은 정보 상자), `note`(오렌지 안내)
- `boxes`: `label`,`tag`,`heading`,`boxes`[{`tag`,`title`,`text`,`dark`}], `layout:"two"`(나란히, 기본은 세로), `note`
- `table`: `label`,`tag`,`heading`,`columns`,`rows`[{`cells`,`hl`}] (셀은 문자열 또는 {`t`,`sub`}), `small`,`callout`{`label`,`value`},`mini`,`note`
- `compare`: `label`,`tag`,`heading`,`cond`(조건 상자), `boxes`[{`label`,`value`,`sub`,`dark`}] 2개, `diff`{`label`,`value`}
- `rates`: `label`,`tag`,`heading`,`rows`[{`label`,`sub`,`value`,`dark`}], `mini`
- `checklist`: `label`,`tag`,`heading`,`items`[{`t`,`sub`}] (4~5개)
- `cta`: `title_lines`,`body`,`pills`(선택: 프롬프트 이름 등),`button`,`url`,`sub`(면책),`link`{`href`,`label`,`target`},`layout`(위치 미세조정), `fs`,`title_top`

## 연동 링크 (`cta.link`)
- `href`: 내부 주소(`/calc/fx/`, `/prompt/?p=06%2F03`) 또는 `https://` 외부 링크. 카드 속 버튼 위치는 `build_cards.py` 가 계산해 `meta.json` 에 쓰고 `publish.py` 가 `brief.json` 에 옮긴다.
- 사이트의 확대 화면에서 그 버튼 영역을 누르면 이동하고, 카드 아래 같은 링크가 글자 버튼으로도 나온다. 측정은 `brief_cta_click`(target).
- 프롬프트 번호는 `prompt/index.html` 의 `idx`(없는 번호면 `check_edition.py` 가 오류).

## 빌드가 만드는 것 (작업폴더/out, 작업폴더/)
`out/01~07.png`(1080×1350), `out/alt.json`(카드 속 글자 = 검색·접근성용 대체 텍스트), `out/metrics.json`(넘침 점검용), `sheet.jpg`(모아보기), `nums.json`(엔진 값), `meta.json`(연동 링크 영역).

## 이미지형 카드 (No.8 에서 추가)
성향 콘텐츠처럼 캐릭터·일러스트를 쓰는 호를 위한 종류다. 이미지는 작업폴더 `img/` 에 `invest-type-<코드>.jpg` 로 둔다(저장소 `assets/invest-type/` 에서 복사, 가공하지 않는다).
- `cover_art`: 네이비 표지 + 제목·부제 + 캐릭터 타일 2×2. `title_lines`, `sub`, `tiles`[{`code`,`name`}] 4개.
- `cover_hero`: 크림 표지 + 상단 전면 일러스트. `hero`(코드), `tiles` 4개, `title_lines`, `sub`.
- `chars`: 흰 카드 안에 이미지+이름+한 줄 설명 2×2. `chars`[{`code`,`name`,`catch`}], `note`(선택).
- `chars_full`: 이미지가 카드 전체를 채우고 글자는 이미지 위. `chars` 는 위와 같다.
- `boxes` 에 `band`(코드), `body_top`(px) 를 넣으면 맨 위에 이미지 띠가 생긴다. 띠 아래 본문이 줄어드니 `fs` 를 줄여 글자 넘침 점검을 통과시킨다.
- 이름·한 줄 설명은 사이트 데이터(`web/redesign/pages/mbti.js`)에서 가져와 그대로 쓴다(바꾸지 않는다). 검증 보고서에 원문 대조 결과를 적는다.
