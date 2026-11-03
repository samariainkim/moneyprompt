-- 돈버프 회원 플랫폼 1차 마이그레이션 (초안)
-- 범위: 프로필, 동의 이력, 요금제/구독 틀
-- 전제: Supabase 설정에서 "새 테이블 자동 노출" OFF, "자동 RLS" ON
--       -> 아래 grant 로 명시한 권한만 API 로 열린다.
-- 적용 전 SQL Editor 에서 내용을 직접 확인하세요.

-- ───────────── 타입 ─────────────
create type public.user_role as enum ('member', 'business', 'admin');
create type public.consent_type as enum ('terms', 'privacy', 'marketing', 'third_party');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'expired');

-- ───────────── 공통 함수 ─────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────── profiles ─────────────
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  nickname      text not null unique
                check (char_length(nickname) between 2 and 20),
  display_name  text check (char_length(display_name) <= 50),
  avatar_url    text,
  role          public.user_role not null default 'member',
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 관리자 판별 (RLS 재귀 방지를 위해 security definer)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and deleted_at is null
  );
$$;

-- 가입 시 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, 'user_' || substr(replace(new.id::text, '-', ''), 1, 10));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- role, deleted_at 등은 클라이언트가 바꿀 수 없도록 컬럼 단위로만 허용
grant select on public.profiles to authenticated;
grant update (nickname, display_name, avatar_url) on public.profiles to authenticated;

-- ───────────── 약관 문서 ─────────────
create table public.consent_documents (
  id            uuid primary key default gen_random_uuid(),
  type          public.consent_type not null,
  version       text not null,
  required      boolean not null,
  title         text not null,
  content_url   text,
  effective_at  timestamptz not null,
  created_at    timestamptz not null default now(),
  unique (type, version)
);

alter table public.consent_documents enable row level security;

create policy "consent_documents_read_all" on public.consent_documents
  for select to anon, authenticated
  using (true);

grant select on public.consent_documents to anon, authenticated;

-- ───────────── 동의 이력 (append-only) ─────────────
-- 철회는 UPDATE 가 아니라 agreed=false 행을 새로 INSERT 한다.
create table public.user_consents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  document_id  uuid not null references public.consent_documents (id),
  agreed       boolean not null,
  source       text not null default 'signup',
  created_at   timestamptz not null default now()
);

create index user_consents_user_idx on public.user_consents (user_id, created_at desc);

alter table public.user_consents enable row level security;

create policy "user_consents_select_own" on public.user_consents
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy "user_consents_insert_own" on public.user_consents
  for insert to authenticated
  with check (user_id = (select auth.uid()));

grant select, insert on public.user_consents to authenticated;

-- ───────────── 요금제 ─────────────
create table public.plans (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  audience    public.user_role not null default 'member',
  price_krw   integer not null check (price_krw >= 0),
  interval    text not null default 'month' check (interval in ('month', 'year')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.plans enable row level security;

create policy "plans_read_active" on public.plans
  for select to anon, authenticated
  using (active);

grant select on public.plans to anon, authenticated;

-- ───────────── 구독 ─────────────
-- 쓰기는 서버(결제 웹훅, service role)만 수행한다. 클라이언트는 조회만.
-- 결제 기록은 전자상거래법상 보존 의무가 있어 회원 탈퇴 시 삭제하지 않는다.
create table public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references public.profiles (id) on delete set null,
  plan_id               uuid not null references public.plans (id),
  status                public.subscription_status not null,
  provider              text,
  provider_customer_key text,
  current_period_end    timestamptz,
  canceled_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index subscriptions_user_idx on public.subscriptions (user_id);

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

grant select on public.subscriptions to authenticated;
