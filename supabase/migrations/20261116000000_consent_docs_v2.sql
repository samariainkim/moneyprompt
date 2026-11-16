-- 이용약관·개인정보처리방침·마케팅 수신 동의 v2 (시행일 2026-11-10)
-- ⚠ 실행 시점: 새 약관·방침 화면이 운영에 올라간 뒤에 실행한다. 필수 문서(terms·privacy)가 v2 로 바뀌므로
--   기존 회원은 실행 직후 다음 로그인 때 '약관 동의' 화면(/onboarding/)에서 다시 동의해야 한다.
--   (마케팅 수신 동의는 선택 항목이라 재동의를 강제하지 않는다. 가입 시 새 문구(v2)로 기록된다.)
-- DB 는 테스트·운영이 공유하므로 실행하는 즉시 운영에도 적용된다.
-- ※ 이 문서를 '로그인 전환일(2026-11-10) 시행의 첫 정식 버전'으로 보아 기존 v1 동의를 그대로 유지하려면 이 SQL 을 실행하지 않는다.
--   (실행 여부는 운영자 판단 — 실행하지 않으면 가입 화면은 계속 v1 문서 id 로 동의를 기록한다.)

insert into public.consent_documents (type, version, required, title, content_url, effective_at) values
  ('terms',     'v2', true,  '이용약관',                    '/terms/',   '2026-11-10T00:00:00+09:00'),
  ('privacy',   'v2', true,  '개인정보 수집·이용 동의',      '/privacy/', '2026-11-10T00:00:00+09:00'),
  ('marketing', 'v2', false, '마케팅 정보 수신 동의 (선택)', '/privacy/', '2026-11-10T00:00:00+09:00')
on conflict (type, version) do nothing;
