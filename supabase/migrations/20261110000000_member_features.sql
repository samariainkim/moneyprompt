-- 3차 마이그레이션 (1단계 회원 기능): 즐겨찾기, 선택정보(프로필 완성), 가입 경로
-- 선행: 20261103000000_member_foundation.sql, 20261103000100_consent_seed_and_signup.sql
-- 적용 전 SQL Editor(Database 모드)에서 내용을 직접 확인하세요.
-- 전제: "새 테이블 자동 노출" OFF, "자동 RLS" ON -> 아래 grant 로 명시한 권한만 API 로 열린다.

-- ───────────── 즐겨찾기 (프롬프트 idx 예: '01/05') ─────────────
create table public.user_favorites (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  prompt_key  text not null check (prompt_key ~ '^[0-9]{2}/[0-9]{2}$'),
  created_at  timestamptz not null default now(),
  primary key (user_id, prompt_key)
);

alter table public.user_favorites enable row level security;

create policy "user_favorites_select_own" on public.user_favorites
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user_favorites_insert_own" on public.user_favorites
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "user_favorites_delete_own" on public.user_favorites
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.user_favorites to authenticated;

-- ───────────── 선택정보 (프로필 완성) ─────────────
-- 행이 없으면 "아직 안 물어봄", skipped_at 이 있으면 "건너뜀", completed_at 이 있으면 "입력함".
create table public.member_preferences (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  interests     text[] not null default '{}'
                check (interests <@ array['stock','realestate','tax','routine','saving','ai']::text[]),
  occupation    text check (occupation in ('general','fc','realtor','selfemployed','other')),
  experience    text check (experience in ('beginner','intermediate','advanced')),
  completed_at  timestamptz,
  skipped_at    timestamptz,
  updated_at    timestamptz not null default now()
);

create trigger member_preferences_set_updated_at
before update on public.member_preferences
for each row execute function public.set_updated_at();

alter table public.member_preferences enable row level security;

create policy "member_preferences_select_own" on public.member_preferences
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "member_preferences_insert_own" on public.member_preferences
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "member_preferences_update_own" on public.member_preferences
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update on public.member_preferences to authenticated;

-- ───────────── 가입 경로 ─────────────
-- 어느 유도 위치(gate id)에서 가입했는지. 클라이언트가 직접 고치지 못하도록 컬럼 권한은 늘리지 않고,
-- 아래 함수(security definer)로만 기록한다.
alter table public.profiles
  add column signup_source        text check (signup_source ~ '^[a-z0-9_]{1,40}$'),
  add column signup_completed_at  timestamptz;

-- 가입 직후 첫 로그인에서 한 번만 호출한다. 처음이면 가입 경로(source)를 돌려주고, 이미 처리됐으면 null.
create or replace function public.complete_signup(p_source text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_src text;
  v_clean text := nullif(left(regexp_replace(lower(coalesce(p_source, '')), '[^a-z0-9_]', '', 'g'), 40), '');
begin
  update public.profiles
  set signup_completed_at = now(),
      signup_source = coalesce(signup_source, v_clean, 'direct')
  where id = (select auth.uid())
    and signup_completed_at is null
  returning signup_source into v_src;
  return v_src;
end;
$$;

revoke execute on function public.complete_signup(text) from public, anon;
grant execute on function public.complete_signup(text) to authenticated;

-- 가입 트리거: 이메일 가입 시 user_metadata.signup_source 도 함께 기록한다. (동의 기록 로직은 기존과 같다.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_consents jsonb := coalesce(new.raw_user_meta_data -> 'consents', '{}'::jsonb);
  v_source text := nullif(left(regexp_replace(lower(coalesce(new.raw_user_meta_data ->> 'signup_source', '')), '[^a-z0-9_]', '', 'g'), 40), '');
  t public.consent_type;
  d uuid;
begin
  insert into public.profiles (id, nickname, signup_source)
  values (new.id, 'user_' || substr(replace(new.id::text, '-', ''), 1, 10), v_source);

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

revoke execute on function public.handle_new_user() from public, anon, authenticated;
