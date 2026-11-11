-- 5차 마이그레이션: 내 결과 저장 (계산기 4종·투자 성향 결과를 회원 계정에 보관)
-- 선행: 20261103000000_member_foundation.sql (profiles)
-- 적용 전 SQL Editor(Database 모드)에서 내용을 직접 확인하세요.
-- 전제: "새 테이블 자동 노출" OFF, "자동 RLS" ON -> 아래 grant 로 명시한 권한만 API 로 열린다.

create table public.saved_results (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  tool        text not null check (tool in ('calc_fx','calc_brokerage','calc_loan','fee_brokerage','mbti')),
  title       text not null check (char_length(title) between 1 and 80),
  summary     text not null default '' check (char_length(summary) <= 200),
  -- 화면 복원용 입력값 스냅샷(계산기) 또는 검사 세션(투자 성향). 크기를 제한한다.
  payload     jsonb not null check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 30000),
  created_at  timestamptz not null default now()
);

create index saved_results_user_created_idx on public.saved_results (user_id, created_at desc);

alter table public.saved_results enable row level security;

create policy "saved_results_select_own" on public.saved_results
  for select to authenticated using (user_id = (select auth.uid()));
create policy "saved_results_insert_own" on public.saved_results
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "saved_results_delete_own" on public.saved_results
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.saved_results to authenticated;

-- 회원당 100개까지. (동시에 여러 요청이 와도 같은 회원의 삽입은 순서대로 확인하도록 회원 단위 잠금을 건다)
create or replace function public.saved_results_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if (select count(*) from public.saved_results where user_id = new.user_id) >= 100 then
    raise exception 'saved_results_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.saved_results_limit() from public, anon, authenticated;

create trigger saved_results_limit_trg
before insert on public.saved_results
for each row execute function public.saved_results_limit();
