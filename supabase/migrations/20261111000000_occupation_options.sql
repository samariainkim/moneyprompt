-- 4차 마이그레이션: 직업군 선택지 세분화
-- 선행: 20261110000000_member_features.sql
-- '일반'을 화면에서 빼고 회사원·학생·주부를 추가한다. 기존 값('general')은 데이터 호환을 위해 허용 목록에 남겨 둔다.

alter table public.member_preferences
  drop constraint if exists member_preferences_occupation_check;

alter table public.member_preferences
  add constraint member_preferences_occupation_check
  check (occupation in ('employee','student','homemaker','fc','realtor','selfemployed','other','general'));
