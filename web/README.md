# 돈버프 웹 앱 (`web/`)

회원가입·로그인, 내 계정, 요금제(틀), 약관 페이지를 담은 Next.js(App Router, TypeScript) 앱입니다.
기존 정적 페이지(`/calc`, `/fee`, `/prompt`, `/invest-mbti` 등)는 **저장소 루트에 그대로** 있고,
빌드할 때 `scripts/sync-static.mjs` 가 `web/public/` 으로 복사해 같은 URL 로 서빙합니다.
따라서 이 앱을 배포하기 전까지 현재 GitHub Pages 사이트는 영향을 받지 않습니다.

## 폴더

| 경로 | 내용 |
|---|---|
| `src/app/` | 페이지: `login` `signup` `onboarding` `account` `pricing` `terms` `privacy`, `auth/callback` |
| `src/proxy.ts` | 세션 갱신 + `/account`·`/onboarding` 로그인 보호 (Next.js 16 의 옛 middleware) |
| `src/lib/supabase/` | 브라우저·서버·관리자 클라이언트 |
| `scripts/sync-static.mjs` | 루트 정적 페이지를 `public/` 으로 복사 (테스트·`*.md` 제외) |
| `../supabase/migrations/` | DB 마이그레이션 SQL (직접 확인 후 적용) |

## 로컬 실행

```bash
cd web
cp .env.example .env.local   # 값을 채운다
npm install
npm run dev                  # http://localhost:3000
```

## 환경변수

| 이름 | 공개 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | O | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | O | publishable(anon) 키. RLS 로 보호됨 |
| `NEXT_PUBLIC_OAUTH_PROVIDERS` | O | 켜 둔 소셜 로그인. 예: `google` 또는 `google,kakao` |
| `SUPABASE_SECRET_KEY` | **X** | 회원 탈퇴 처리 전용. 서버에서만 사용. 저장소·채팅에 올리지 말 것 |

## Supabase 설정 순서

1. SQL Editor 에서 `supabase/migrations/` 의 파일을 **번호 순서대로** 실행
2. Authentication → URL Configuration: Site URL 과 Redirect URLs(`https://donbuff.com/**`, `http://localhost:3000/**`)
3. Authentication → Providers: Google(클라이언트 ID·시크릿), 필요 시 Kakao
4. Authentication → Sign In / Providers → Email: **Confirm email 켜기**(이메일 인증 필수)

## 가입·동의 흐름

- **이메일 가입:** 가입 화면에서 약관 동의를 받고, 값은 `user_metadata.consents` 로 전달 → DB 트리거가 최신 약관 버전 기준으로 `user_consents` 에 기록
- **소셜 가입:** 로그인 후 `/onboarding` 에서 필수 약관 동의를 받음 (`needs_consent()` 가 true 면 `/account` 등에서 자동 이동)
- 동의 철회·재동의는 기존 행을 고치지 않고 새 행을 추가

## 인증 보조 흐름

- **인증 메일 다시 보내기:** 가입 완료 화면과, 로그인 시 "이메일 미인증" 오류 화면에 재전송 버튼(60초 대기)
- **이미 가입한 이메일:** 보안상 가입 여부를 알려주지 않으므로, 가입 완료 화면에서 로그인·비밀번호 찾기를 안내
- **비밀번호 찾기:** `/forgot-password/` → 메일 링크 → `/auth/callback/?next=/reset-password/` → `/reset-password/` 에서 새 비밀번호 설정 (링크는 요청한 같은 브라우저에서 열어야 함)
- **이메일 템플릿:** 한국어 문안은 `docs/email-templates.md` 를 Supabase → Authentication → Emails → Templates 에 붙여넣어 사용

## 배포 전환 (아직 하지 않음)

현재 도메인은 GitHub Pages 가 서빙합니다. 이 앱을 쓰려면 Vercel 에서 Root Directory 를 `web` 으로 하고
환경변수를 넣은 뒤 도메인을 옮겨야 합니다. 전환 전 체크: `/` `/calc/` `/fee/` `/prompt/` `/invest-mbti/` 응답,
`/calc/data/fx/rates.json` 갱신 방식(현재는 Actions 가 main 에 커밋 → Vercel 재배포 필요), Search Console 영향.
