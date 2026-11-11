-- 4차 마이그레이션: 직업군 선택지 변경
-- 선행: 20261110000000_member_features.sql
-- 화면의 선택지: FC/보험설계사, 공인중개사, 자영업자, 회사원, 주부, 기타 ('일반' 삭제, 회사원·주부 추가)
-- 기존 값('general')은 이미 저장된 데이터와의 호환을 위해 허용 목록에 남겨 둔다. (화면에서는 더 이상 고를 수 없음)

alter table public.member_preferences
  drop constraint if exists member_preferences_occupation_check;

alter table public.member_preferences
  add constraint member_preferences_occupation_check
  check (occupation in ('fc','realtor','selfemployed','employee','homemaker','other','general'));
