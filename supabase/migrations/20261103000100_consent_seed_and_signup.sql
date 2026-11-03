-- 2차 마이그레이션 (초안): 약관 시드, 가입 시 동의 기록, 필수 동의 확인 함수
-- 선행: 20261103000000_member_foundation.sql
-- 주의: 약관 본문은 법률 검토 전 초안입니다. 검토 후 새 버전 행을 추가하세요(기존 버전은 수정하지 않음).

-- ───────────── 약관 문서 시드 ─────────────
insert into public.consent_documents (type, version, required, title, content_url, effective_at) values
  ('terms',     'v1', true,  '이용약관',                        '/terms/',   '2026-11-03T00:00:00+09:00'),
  ('privacy',   'v1', true,  '개인정보 수집·이용 동의',          '/privacy/', '2026-11-03T00:00:00+09:00'),
  ('marketing', 'v1', false, '마케팅 정보 수신 동의 (선택)',     '/privacy/', '2026-11-03T00:00:00+09:00')
on conflict (type, version) do nothing;

-- ───────────── 가입 시 프로필 + 동의 기록 ─────────────
-- 이메일 가입 화면에서 받은 동의는 user_metadata.consents ({"terms":true,"privacy":true,"marketing":false})
-- 로 전달되고, 여기서 "현재 유효한 최신 약관 버전" 기준으로 이력에 기록한다.
-- (클라이언트가 임의의 문서 id 를 지정할 수 없도록 서버에서 문서를 고른다.)
-- 소셜 로그인 등 동의 정보가 없는 가입은 앱의 동의 화면(/onboarding)에서 받는다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_consents jsonb := coalesce(new.raw_user_meta_data -> 'consents', '{}'::jsonb);
  t public.consent_type;
  d uuid;
begin
  insert into public.profiles (id, nickname)
  values (new.id, 'user_' || substr(replace(new.id::text, '-', ''), 1, 10));

  if jsonb_typeof(v_consents) = 'object' then
    foreach t in array enum_range(null::public.consent_type) loop
      if jsonb_exists(v_consents, t::text) and jsonb_typeof(v_consents -> t::text) = 'boolean' then
        select id into d
        from public.consent_documents
        where type = t and effective_at <= now()
        order by effective_at desc
        limit 1;
        if d is not null then
          insert into public.user_consents (user_id, document_id, agreed, source)
          values (new.id, d, (v_consents ->> t::text)::boolean, 'signup');
        end if;
      end if;
    end loop;
  end if;

  return new;
end;
$$;

-- 트리거 전용 함수는 API 로 직접 호출되지 않도록 막는다.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ───────────── 필수 동의 확인 ─────────────
-- 현재 유효한 최신 필수 약관 중, 로그인한 회원이 (가장 최근 기록 기준) 동의하지 않은 것이 있으면 true.
create or replace function public.needs_consent()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.consent_documents d
    where d.required
      and d.effective_at <= now()
      and d.effective_at = (
        select max(d2.effective_at) from public.consent_documents d2
        where d2.type = d.type and d2.effective_at <= now()
      )
      and not exists (
        select 1 from public.user_consents c
        where c.user_id = (select auth.uid())
          and c.document_id = d.id
          and c.agreed
          and c.created_at = (
            select max(c2.created_at) from public.user_consents c2
            where c2.user_id = c.user_id and c2.document_id = d.id
          )
      )
  );
$$;

revoke execute on function public.needs_consent() from public, anon;
grant execute on function public.needs_consent() to authenticated;
