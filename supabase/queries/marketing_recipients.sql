-- 소식(광고성 정보) 수신 대상 이메일 목록 — 읽기 전용 조회. 데이터를 바꾸지 않는다.
-- 사용: Supabase SQL Editor(Database 모드)에서 실행 → 결과 우측 위 Export → CSV.
-- 조건: 가장 최근 마케팅 동의 기록이 "동의"인 회원, 이메일 인증 완료, 탈퇴하지 않은 회원.
-- (철회는 agreed=false 행이 새로 쌓이므로, 회원별 가장 최근 기록으로 판단한다.)
select
  u.email,
  p.nickname,
  c.created_at as consented_at
from public.profiles p
join auth.users u on u.id = p.id
join lateral (
  select uc.agreed, uc.created_at
  from public.user_consents uc
  join public.consent_documents d on d.id = uc.document_id
  where uc.user_id = p.id and d.type = 'marketing'
  order by uc.created_at desc
  limit 1
) c on c.agreed
where p.deleted_at is null
  and u.email is not null
  and u.email_confirmed_at is not null
order by c.created_at;
