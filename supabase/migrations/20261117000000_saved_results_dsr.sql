-- 내 결과 저장에 'DSR 한도 계산기(calc_dsr)' 추가
-- 선행: 20261112000000_saved_results.sql
-- 적용 순서: 이 SQL 을 먼저 적용한 뒤 코드를 배포하세요(적용 전에 저장하면 서버 오류로 "저장하지 못했어요"가 나옵니다).
-- 되돌리기: 아래 제약을 calc_dsr 없이 다시 만들면 됩니다. 단, calc_dsr 로 저장된 행이 있으면 먼저 지워야 합니다.

alter table public.saved_results drop constraint if exists saved_results_tool_check;
alter table public.saved_results
  add constraint saved_results_tool_check
  check (tool in ('calc_fx','calc_brokerage','calc_loan','calc_dsr','fee_brokerage','mbti'));
