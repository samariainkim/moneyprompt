# 사이트 반영과 배포 (브랜치 → 테스트 확인 → "머지해" → 운영 확인)

## 사이트가 카드뉴스를 보여 주는 구조
- 페이지 `/brief/`: `web/redesign/pages/brief.html`·`brief.css`·`brief.js`. **데이터는 `web/redesign/data/brief.json`**, 카드 이미지는 `web/redesign/img/brief/<id>/01~07.jpg`.
- `web/scripts/sync-static.mjs` 의 `briefParts()` 가 빌드 때 `brief.json` 을 검사(카드 7장·이미지 존재·alt 길이·링크 형식)하고 페이지의 최신호 띠·지난 호 목록·히어로·**메인 배너**(최신 3개 호 표지)를 만든다. 호를 추가하면 **코드 수정 없이** 모두 따라간다.
- 켜고 끄기: `web/redesign/pages.json` 의 `production` 목록에 `/brief/` 가 있으면 운영에서 페이지·헤더 메뉴(`MONEY BRIEF`)·메인 배너·사이트맵이 함께 켜진다(이미 켜져 있다). 빼면 모두 사라진다(롤백).
- 확대 보기(좌우 버튼·키보드·스와이프·진행 막대), 카드 한 장 바로가기 `/brief/#no3-7`, 지난 호 `?n=1`, 측정 이벤트 `brief_*`(상세는 `web/redesign/README.md` 의 MONEY BRIEF 절과 `docs/analytics-audit.md`).

## 새 호를 올리는 순서
```bash
git fetch origin main && git checkout -b brief-NNN origin/main          # 최신 main 에서 브랜치
python3 .claude/skills/money-brief/scripts/publish.py <작업폴더>         # 이미지 + brief.json (수정이면 --replace)
node web/scripts/sync-static.mjs                                        # 미리보기 빌드(브랜치는 preview 환경 기준)
```
시험(작업 중 수정 없이 통과해야 한다):
1. 빌드 후 정적 서버: `cd web/public && python3 -m http.server 5180 &` → `node .claude/skills/money-brief/scripts/test_brief_smoke.js` (최신호·카드 7장·확대 보기·키보드·연동 링크·`?n=`·콘솔 오류·모바일 넘침)
2. 전체 빌드와 타입: `cd web && npm run build` (필요하면 `npx tsc --noEmit`)
3. (공통 틀·헤더·프롬프트를 건드렸다면) 기존 회귀 시험 — 시험 스크립트는 저장소 밖이므로 새 세션에서는 새로 만든다. 최소한 `/`, `/brief/`, `/calc/`, `/prompt/` 의 로딩·콘솔 오류·가로 넘침을 확인한다.
4. 운영 방식 확인: `VERCEL_ENV=production node web/scripts/sync-static.mjs` 후 `/brief/` 가 열린 상태에서도 정상인지.

커밋(메시지 끝에 시스템이 지정한 attribution 줄) → `git push -u origin brief-NNN` → **Vercel 미리보기 배포 완료**를 기다린다:
```bash
gh api repos/<owner>/<repo>/commits/<sha>/statuses --jq '.[0] | .state + " " + .description'   # success 가 될 때까지
```
테스트 주소(vercel.app)는 이 환경에서 접속이 막혀 있으니 사용자에게 Vercel 배포 페이지에서 열어 확인하도록 안내한다.

## "머지해" 이후 (사용자가 명시했을 때만)
```bash
gh api repos/<owner>/<repo>/pulls -f title="..." -f head=brief-NNN -f base=main -F body=@pr-body.md    # PR (GraphQL 은 막혀 있다)
gh api repos/<owner>/<repo>/pulls/<N> --jq '{mergeable,mergeable_state}'                                  # clean 확인
gh api -X PUT repos/<owner>/<repo>/pulls/<N>/merge -f merge_method=merge                                   # 병합
```
PR 본문은 이전 PR 처럼 **요약 / 달라지는 것 / 바뀌지 않는 것 / 되돌리기 / 확인한 것 / 발행 전 남은 확인** 으로 쓴다.
병합 후 `gh api .../commits/<병합 sha>/statuses` 로 운영 배포 완료를 기다리고, 운영에서 직접 확인한다:
```bash
curl -sS https://donbuff.com/brief/ -o /tmp/o.html -w "%{http_code}\n"        # 200, <title>, 카드 7장(class="bc")
# 카드 이미지 7장 × 호 수 = 모두 200, 메인 배너(id="svc-brief"), 헤더 메뉴(data-nav="brief"), sitemap.xml 에 /brief/
NODE_USE_ENV_PROXY=1 node web/scripts/verify-routes.mjs https://donbuff.com    # 전체 통과
```
결과(페이지·메뉴·배너·이미지·사이트맵·`verify-routes`)를 표로 보고한다. 롤백은 `production` 목록에서 `/brief/` 제거.

## 주의
- PR·병합은 사용자가 요청하기 전에는 하지 않는다. 푸시는 항상 가능.
- 시험 스크립트·시안·내보내기 파일은 scratchpad 에 둔다(저장소에는 `brief.json`·이미지·문서만).
- 운영 이미지 용량: 호당 약 0.7MB. 호가 많이 쌓이면 오래된 호의 해상도를 줄이는 정리를 제안한다.
- `fx` 카드가 있는 호는 **환율 기준일이 지나면 숫자가 낡는다** — 발행 직전 재빌드·재반영(`publish.py --replace`).
