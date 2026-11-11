# 본 사이트 전환 계획안 (donbuff.com → Vercel) — v0.1

## 1. 목표와 원칙
- **목표:** `donbuff.com` 을 지금의 GitHub Pages(정적)에서 **Vercel(Next.js 앱 + 기존 정적 페이지)** 로 옮겨 회원·로그인·결과 저장 기능을 실서비스에 연다.
- **원칙**
  1. **화면·URL 은 그대로.** 디자인 리뉴얼은 전환과 분리한다(안정화 후, `docs/renewal-plan.md`).
  2. **되돌릴 수 있게.** DNS TTL 을 낮추고, GitHub Pages 는 안정화가 끝날 때까지 지우지 않는다.
  3. **메일·검색·로그인은 한 가지씩 확인.** DNS 를 만질 때 인증 메일(Resend)과 검색 등록(Search Console)용 레코드를 건드리지 않는다.

## 2. 현재 구성 (확인한 사실)
| 항목 | 현재 |
|---|---|
| 운영 사이트 | GitHub Pages, 저장소 루트의 정적 페이지, `CNAME` = donbuff.com |
| 신규 앱 | `web/` (Next.js), Vercel 테스트 주소 `moneyprompt.vercel.app` 에서만 공개 |
| 정적 페이지 이전 | 빌드 때 `sync-static` 이 루트 페이지를 복사 (URL 동일, `trailingSlash`) |
| 로그인·DB | Supabase (Auth, RLS), 메일은 Resend SMTP, 구글 로그인 |
| 환율 갱신 | GitHub Actions 가 매일 01:00 KST 에 `main` 에 커밋 → Vercel 이 자동 재배포 |
| 도메인 DNS | 도메인 등록업체(후이즈) 화면에서 관리 |
| 없는 것 | `sitemap.xml`, `robots.txt`, 사용자 지정 404 페이지 |
| 검색 노출 | 계산기(`/calc/…`)·수수료(`/fee/…`) 페이지는 `noindex` 상태 (공개 시점에 해제하기로 한 TODO) |

## 3. 전환 전에 정해야 할 것 (결정 필요)
1. **Vercel 요금제:** 상업적 이용(광고·구독)은 Hobby 약관 범위 밖이므로 Pro 가 필요하다. 지금은 광고·결제가 없지만, 전환 시점에 Pro 로 시작할지 정한다. (Vercel 약관·요금은 가입 시점 기준으로 재확인)
2. **전환 일시:** 방문이 적은 시간(평일 새벽 또는 일요일 밤)을 권장. 환율 갱신(01:00 KST) 시각은 피한다.
3. **`www.donbuff.com` 처리:** `donbuff.com` 으로 영구 이동(리디렉션) 권장.
4. **검색 공개:** 계산기·수수료 페이지의 `noindex` 를 전환과 함께 풀지, 안정화 후에 풀지. (권장: 안정화 후, 전환 직후 변수를 늘리지 않기 위해)
5. **약관·개인정보 법률 검토:** 전환하면 실제 회원이 가입한다. 전환 전에 검토를 마치거나, 최소한 현재 문안으로 시작한다는 결정이 필요하다.

## 4. 사전 준비 (D-7 ~ D-1)
### 4.1 내가(코드·문서) 준비하는 것 — PR 로 제공
- `sitemap.xml`, `robots.txt` 추가 (색인 대상 URL 만, `noindex` 페이지는 제외)
- 사용자 지정 404 페이지 (홈·계산기 링크)
- **전환 검증 스크립트:** 기존 정적 페이지 전체 URL 이 신 사이트에서 같은 응답(200)과 같은 본문을 주는지 비교
- 환경변수 점검 목록(`web/README.md` 대조), 전환 당일 스모크 테스트 시나리오(자동화)

### 4.2 사용자가 하는 것 (대시보드)
| 순서 | 대상 | 할 일 |
|---|---|---|
| 1 | 후이즈 DNS | **현재 레코드를 전부 캡처·기록**(A/CNAME/MX/TXT). 특히 Resend 인증(SPF·DKIM)·구글/Search Console 인증 TXT 는 그대로 유지 |
| 2 | 후이즈 DNS | D-2 에 도메인의 **TTL 을 300초(최소)로 낮춤** (되돌리기 속도) |
| 3 | Vercel | 요금제 확정, 프로젝트(Root Directory `web`, Production Branch `main`) 확인, 환경변수(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_OAUTH_PROVIDERS`, `SUPABASE_SECRET_KEY`) 확인 |
| 4 | Vercel | Domains 에 `donbuff.com`, `www.donbuff.com` 추가 → **화면이 알려주는 레코드 값을 그대로 사용** (값을 외워 쓰지 않는다) |
| 5 | Supabase | 전환 당일 변경할 값을 미리 메모: Site URL, Redirect URLs |
| 6 | 구글 클라우드 | OAuth 승인된 JavaScript 원본에 `https://donbuff.com` 추가 (리디렉션 URI 는 Supabase 콜백 주소라 변경 없음), 앱 게시 상태 확인 |
| 7 | Supabase | 가능하면 DB 백업(무료 플랜은 자동 백업이 제한적) |
| 8 | Search Console | 도메인 속성 인증 상태 확인 (DNS TXT 인증이면 레코드 유지) |

## 5. 전환 당일 절차
1. **최종 점검(30분 전):** `main` 최신 배포 정상, 환율 파일 날짜 최신, 전환 검증 스크립트 통과, 로그인·저장 스모크(테스트 주소) 통과.
2. **DNS 변경:** 후이즈에서 `donbuff.com`(A) 과 `www`(CNAME) 를 Vercel 안내 값으로 교체. **MX·TXT 는 건드리지 않는다.**
3. **Vercel 검증·SSL:** Domains 가 Valid 가 되고 인증서가 발급될 때까지 대기 (보통 수 분~1시간).
4. **GitHub Pages 연결 해제:** 저장소 Settings → Pages 의 Custom domain 을 해제(사이트 자체는 지우지 않음). `CNAME` 파일은 두어도 Vercel 에 영향 없음.
5. **Supabase URL 변경:** Site URL → `https://donbuff.com`, Redirect URLs 에 `https://donbuff.com/**` 추가(테스트 주소·localhost 는 안정화까지 유지).
6. **스모크 테스트(아래 6절)** 를 `donbuff.com` 에서 실행.
7. **측정 확인:** GA4 실시간에 방문이 잡히는지, 로그인 후 이벤트(`gate_view` 등)가 오는지.
8. 문제가 있으면 8절 롤백 기준에 따라 판단.

## 6. 스모크 테스트 (전환 직후)
| 영역 | 확인 |
|---|---|
| 페이지 | `/` `/calc/` `/calc/fx/` `/calc/brokerage/` `/calc/loan-prepay/` `/fee/` `/fee/brokerage-fee/` `/prompt/` `/invest-mbti/` `/new/` `/privacy.html` 모두 200, 화면 이상 없음 |
| 이전 주소 | `http→https`, `www→apex`, 슬래시 없는 주소 정상 |
| 환율 | `/calc/data/fx/rates.json` 날짜 최신, 환전 계산 동작 |
| 가입 | 이메일 가입 → **인증 메일 수신(네이버·구글)** → 링크 클릭 → 로그인 |
| 로그인 | 구글 로그인 → 돌아오는 주소가 `donbuff.com` |
| 비밀번호 | 재설정 메일 → 링크 → 변경 |
| 기능 | 비로그인 게이트(`/join/`), 로그인 후 프롬프트 생성, 즐겨찾기, 결과 저장·다시 열기, 선택정보 |
| 모바일 | 모바일 폭에서 주요 페이지 + 로그인 |
| 측정 | GA4 실시간 방문, 이벤트 수신 |

## 7. 전환 후 모니터링과 안정화
| 시점 | 볼 것 |
|---|---|
| D+0~1 | Vercel 로그 오류, Supabase Auth 로그(로그인 실패), 인증 메일 도달, 접속 오류 제보 |
| D+3 | 환율 자동 갱신(01:00 KST)이 새 사이트에 반영되는지, GA4 방문 추이 |
| D+7 | Search Console 색인·크롤 오류, 방문·가입 퍼널(gate_view → signup_complete) |
| D+14 | 안정화 판단 → GitHub Pages 정리, 테스트 주소 Redirect 정리, `noindex` 해제·리뉴얼 착수 판단 |

**안정화 종료 기준(제안):** 14일간 치명 오류 0건, 인증 메일 도달 정상, 환율 갱신 14회 연속 정상, 방문 추이가 전환 전 수준 이상.

## 8. 롤백
- **기준:** 로그인·가입 불가가 1시간 이상 해결되지 않거나, 주요 페이지가 오류인 경우.
- **방법:** 후이즈 DNS 를 기록해 둔 **기존 GitHub Pages 값으로 복원** (TTL 이 낮아 수 분~수십 분 내 반영). Supabase Site URL 은 테스트 주소를 유지해 두었으므로 별도 복원이 거의 필요 없다.
- **데이터:** 전환 중에 가입한 회원은 DB 에 남는다(롤백해도 유지).

## 9. 위험과 대응
| 위험 | 대응 |
|---|---|
| 인증 메일 미도착 | DNS 변경 시 MX/TXT 유지, 전환 직후 네이버·구글로 실제 수신 확인 |
| 로그인 후 엉뚱한 주소로 이동 | Supabase Redirect URLs 와 Site URL 확인, 스모크 테스트 |
| 검색 순위 변동 | URL 구조 유지(리디렉션 불필요), sitemap 제출, 디자인 변경 금지 |
| 일부 사용자가 구 사이트 접속(전파 지연) | 두 곳 모두 같은 화면. 로그인 기능만 신 사이트에서 동작 — TTL 을 낮춰 최소화 |
| 환율 갱신 중단 | Actions → `main` 커밋 → Vercel 재배포 경로 D+3 까지 매일 확인 |
| Vercel 무료 한도·약관 | 상업 이용 전 Pro, 사용량 알림 설정 |

## 10. 일정(제안)
| 시점 | 할 일 |
|---|---|
| D-7 | 결정 사항 확정(3절), 사전 준비 PR 머지, DNS 레코드 기록 |
| D-2 | TTL 300초로 변경, Vercel 도메인 추가 준비, Supabase·구글 설정 값 확정 |
| D-1 | 최종 리허설(테스트 주소에서 스모크 전체), 백업 |
| D-Day | 5절 절차 |
| D+1~14 | 7절 모니터링, 안정화 종료 판단 |

## 11. 역할
- **사용자:** 후이즈 DNS, Vercel·Supabase·구글·Search Console 대시보드 작업, 인증 메일 실수신 확인, 최종 판단
- **Claude:** 사전 준비 PR(sitemap, robots, 404, 검증 스크립트), 값·순서 안내(화면 캡처 확인), 스모크 테스트 지원, 문서 갱신
