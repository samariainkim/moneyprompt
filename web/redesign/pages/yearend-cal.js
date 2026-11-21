/* 연말정산 일정 공통 함수(허브 카드·상세 페이지·시험이 같이 쓴다). 날짜는 한국시간 기준 YYYY-MM-DD 문자열로만 다룬다. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.YearendCal = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function parse(s) { var p = String(s).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function diff(a, b) { return Math.round((parse(b) - parse(a)) / 86400000); }
  function kstToday(now) { return new Date((now === undefined ? Date.now() : now) + 9 * 3600 * 1000).toISOString().slice(0, 10); }
  // D-day 표기: 기간 일정은 시작/종료 기준을 구분하고, 단일 날짜는 D-n. 대략적인 일정(approx)·날짜 없음은 표시하지 않는다.
  function dday(it, today) {
    if (!it.start || it.approx) return null;
    if (it.end) {
      if (today < it.start) return { text: '시작 D-' + diff(today, it.start), kind: 'soon' };
      if (today <= it.end) return { text: today === it.end ? '종료 D-DAY' : '종료 D-' + diff(today, it.end), kind: 'now' };
      return { text: '종료됨', kind: 'done' };
    }
    var n = diff(today, it.start);
    if (n > 0) return { text: 'D-' + n, kind: 'soon' };
    if (n === 0) return { text: 'D-DAY', kind: 'now' };
    return { text: '지남', kind: 'done' };
  }
  function isNow(it, today) { if (!it.start) return false; var e = it.end || it.start; return it.start <= today && today <= e; }
  var STATUS = { official: ['ok', '공식 일정 확인'], secondary: ['chk', '확인 중'], wait: ['wait', '공식 발표 대기'], company: ['chk', '회사별 확인'], self: ['self', '내가 확인'] };
  var ACTION_TYPES = ['ext', 'guide', 'checkup', 'off', 'none'];
  return { dday: dday, isNow: isNow, kstToday: kstToday, diff: diff, STATUS: STATUS, ACTION_TYPES: ACTION_TYPES };
});
