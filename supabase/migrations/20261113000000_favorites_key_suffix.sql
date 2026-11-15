-- 6차 마이그레이션: 즐겨찾기 프롬프트 번호 형식 보정
-- 프롬프트 172개 중 69개는 번호가 '05/04-3' 처럼 뒤에 '-숫자'가 붙는다. 기존 제한('00/00' 형식만 허용)이 이 번호를 거부해
-- 해당 프롬프트는 즐겨찾기에 저장되지 않았다. '00/00' 과 '00/00-0'(숫자 1~2자리) 모두 허용하도록 바꾼다.
-- 선행: 20261110000000_member_features.sql
-- 이미 저장된 데이터에는 영향이 없다(기존 값은 모두 새 규칙을 만족).

alter table public.user_favorites
  drop constraint if exists user_favorites_prompt_key_check;

alter table public.user_favorites
  add constraint user_favorites_prompt_key_check
  check (prompt_key ~ '^[0-9]{2}/[0-9]{2}(-[0-9]{1,2})?$');
