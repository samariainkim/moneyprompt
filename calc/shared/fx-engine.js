/* 환전수수료 계산기 엔진 (순수 함수, UI 비의존)
   - 금액·환율·우대율은 문자열로 받아 BigInt 스케일 정수로 계산 (부동소수 오차 없음)
   - 최종 원화 금액은 원 단위 내림
   - 송금: 매매기준율과 TTS(보낼 때)/TTB(받을 때)의 차이(스프레드)에 우대율 적용
   - 현찰: 매매기준율에 정책 스프레드(rules.cash_spread)와 우대율 적용
   direction: 'out' = 원화를 내고 외화를 받음(현찰 살 때 / 송금 보낼 때), 'in' = 외화를 주고 원화를 받음(현찰 팔 때 / 송금 받을 때) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FxEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var STATUS = { SUCCESS: 'success', INVALID: 'invalid_input', UNSUPPORTED: 'unsupported', DATA: 'data_unavailable' };
  var DAY = 864e5;
  var RATE_DEC = 4;      // 환율 소수 최대 4자리 (예: XOF 1.9618)
  var SIDE = { out: 'buy', in: 'sell' }; // 현찰 스프레드 키 (고객 기준: 외화를 살 때 buy / 팔 때 sell)

  function bad(code, field, status) { return { status: status || STATUS.INVALID, error: { code: code, field: field } }; }

  /* 숫자 문자열 → 스케일 정수. 쉼표는 정상 3자리 구분(1,234)만 허용 */
  function parseScaled(str, decimals) {
    var t = String(str === undefined || str === null ? '' : str).trim();
    if (t === '') return { empty: true };
    if (t.indexOf(',') >= 0 && !/^\d{1,3}(,\d{3})+(\.\d*)?$/.test(t)) return { bad: true };
    var m = /^(\d+)(?:\.(\d*))?$/.exec(t.replace(/,/g, ''));
    if (!m) return { bad: true };
    var frac = m[2] || '';
    if (frac.length > decimals) return { bad: true, toolong: true };
    return { v: BigInt(m[1] + frac.padEnd(decimals, '0')) };
  }
  function parsePrefBp(str) { // 우대율(%) → 1/10000 단위 정수. 소수 둘째 자리까지
    var s = String(str === undefined || str === null ? '' : str).replace(/[\s%]/g, '').replace(',', '.');
    if (s === '') return { empty: true };
    var m = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(s);
    if (!m) return { bad: true };
    return { v: BigInt(m[1]) * 100n + BigInt(((m[2] || '') + '00').slice(0, 2)) };
  }

  /* ── 날짜 ── */
  function kstDay(ms) { return Math.floor((ms + 9 * 36e5) / DAY); }
  function isoToDay(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > new Date(Date.UTC(y, mo, 0)).getUTCDate()) return null;
    return Date.UTC(y, mo - 1, d) / DAY;
  }
  function formatDate(iso, style) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return '';
    return style === 'dot' ? m[1] + '.' + m[2] + '.' + m[3] : m[1] + '년 ' + (+m[2]) + '월 ' + (+m[3]) + '일';
  }

  /* ── 환율 데이터 신선도: 수집 장애(checked_at)와 고시 정체(base_date)를 구분 ── */
  function evaluateFreshness(rates, nowMs, rules) {
    var fr = rules.freshness;
    if (!rates || typeof rates !== 'object' || !rates.currencies || typeof rates.currencies !== 'object') return { ok: false, reason: 'no_data' };
    var base = isoToDay(rates.base_date), chk = Date.parse(rates.checked_at);
    if (base === null || isNaN(chk)) return { ok: false, reason: 'invalid' };
    var ageChecked = (nowMs - chk) / DAY, ageBase = kstDay(nowMs) - base;
    if (ageChecked < -1 || ageBase < -1) return { ok: false, reason: 'invalid' };
    if (ageChecked > fr.checked_at_max_days) return { ok: false, reason: 'checked_stale' };
    if (ageBase > fr.base_date_max_days) return { ok: false, reason: 'base_stale' };
    return { ok: true, base_age_days: ageBase, warn: ageBase >= fr.warn_base_days };
  }

  /* ── 통화 데이터 검증 ── */
  function readEntry(e, rules) {
    if (!e || typeof e !== 'object') return null;
    var u = Number(e.unit);
    if (rules.limits.units_allowed.indexOf(u) < 0) return null;
    var b = parseScaled(e.base, RATE_DEC), ttb = parseScaled(e.ttb, RATE_DEC), tts = parseScaled(e.tts, RATE_DEC);
    if (!b.v || b.v <= 0n || !ttb.v || ttb.v <= 0n || !tts.v || tts.v <= 0n) return null;
    if (!(tts.v >= b.v && b.v >= ttb.v)) return null; // 비정상 매입·매도 관계 차단
    return { unit: u, base: b.v, ttb: ttb.v, tts: tts.v };
  }
  function readSpread(code, direction, rules) {
    var s = rules.cash_spread && rules.cash_spread[code] && rules.cash_spread[code][SIDE[direction]];
    if (s === undefined || s === null) return null;
    var p = parseScaled(s, 2);
    if (!p.v || p.v <= 0n || p.v > BigInt(rules.limits.spread_max_bp)) return null;
    return p.v; // 1/10000 단위 (1.75% → 175)
  }
  function available(rates, code, mode, direction, rules) {
    if (!readEntry(rates && rates.currencies && rates.currencies[code], rules)) return false;
    if (mode === 'cash') {
      if (direction) return readSpread(code, direction, rules) !== null;
      return readSpread(code, 'out', rules) !== null && readSpread(code, 'in', rules) !== null;
    }
    return true;
  }
  /* 지원 통화 목록: 우선순위 → 데이터 없는 통화는 건너뛰고 대체 통화 순서로 채움, 최대 N개 */
  function pickCurrencies(rates, rules, mode, direction) {
    var out = [], c = rules.currencies;
    c.priority.concat(c.fallback).forEach(function (code) {
      if (out.length >= c.max_display || out.indexOf(code) >= 0) return;
      if (available(rates, code, mode, direction, rules)) out.push(code);
    });
    return out;
  }

  /* ── 계산 ── */
  function calculate(input, rates, rules, opts) {
    var i = input || {}, now = (opts && opts.now !== undefined) ? opts.now : Date.now(), lim = rules.limits;
    var cur = String(i.currency || '').toUpperCase();
    if (i.mode !== 'cash' && i.mode !== 'wire') return bad('mode_invalid', 'mode');
    if (i.direction !== 'out' && i.direction !== 'in') return bad('direction_invalid', 'direction');
    if (!/^[A-Z]{3}$/.test(cur)) return bad('currency_invalid', 'currency');

    var a = parseScaled(i.amount, 2);
    if (a.empty) return bad('amount_required', 'amount');
    if (a.bad) return bad(a.toolong ? 'amount_decimals' : 'amount_format', 'amount');
    if (a.v < BigInt(lim.amount_min_cents)) return bad('amount_min', 'amount');
    if (a.v > BigInt(lim.amount_max_cents)) return bad('amount_max', 'amount');
    var p = parsePrefBp(i.prefPercent);
    if (p.empty) return bad('pref_required', 'pref');
    if (p.bad) return bad('pref_format', 'pref');
    if (p.v > 10000n) return bad('pref_range', 'pref');

    var fr = evaluateFreshness(rates, now, rules);
    if (!fr.ok) return bad('data_' + fr.reason, 'data', STATUS.DATA);
    var raw = rates.currencies[cur];
    if (!raw) return bad('currency_unavailable', 'currency', STATUS.UNSUPPORTED);
    var e = readEntry(raw, rules);
    if (!e) return bad('rate_invalid', 'currency', STATUS.DATA);

    var sp = null, ap; // ap: 적용 환율, 스케일 1e12 (환율 1e4 × 내부 1e8)
    if (i.mode === 'cash') {
      sp = readSpread(cur, i.direction, rules);
      if (sp === null) return bad('cash_unsupported', 'currency', STATUS.UNSUPPORTED);
      var k = sp * (10000n - p.v);
      ap = i.direction === 'out' ? e.base * (100000000n + k) : e.base * (100000000n - k);
    } else {
      var w = i.direction === 'out' ? (e.tts - e.base) : (e.base - e.ttb);
      var a8 = i.direction === 'out' ? e.base * 10000n + w * (10000n - p.v) : e.base * 10000n - w * (10000n - p.v);
      ap = a8 * 10000n;
    }
    var den = BigInt(e.unit) * 100n * 1000000000000n;
    var total = a.v * ap / den, baseTotal = a.v * e.base * 100000000n / den;
    var diff = total > baseTotal ? total - baseTotal : baseTotal - total;
    var pre = i.mode === 'wire' ? (i.direction === 'out' ? e.tts : e.ttb) : null;
    return {
      status: STATUS.SUCCESS,
      rules_version: rules.version,
      mode: i.mode, direction: i.direction, currency: cur, unit: e.unit,
      amount: Number(a.v) / 100,
      pref_bp: Number(p.v),
      base_rate: Number(e.base) / 1e4,
      pre_rate: pre === null ? null : Number(pre) / 1e4,       // 송금: 우대 전 TTS/TTB
      spread_bp: sp === null ? null : Number(sp),             // 현찰: 정책 스프레드 (화면에는 표시하지 않고 AI 프롬프트에만 전달)
      applied_rate: Number(ap) / 1e12,
      total_krw: Number(total),
      base_total_krw: Number(baseTotal),
      diff_krw: Number(diff),
      diff_direction: total > baseTotal ? 'more' : (total < baseTotal ? 'less' : 'none'),
      base_date: rates.base_date, checked_at: rates.checked_at
    };
  }

  /* ── 수출입은행 API 응답 정규화 (수집 스크립트 공용) ──
     kind: ok | empty(비영업일·11시 이전 null) | bad_request(2) | auth(3) | limit(4) | invalid(형식 이상) */
  function parseApiRate(s) {
    var p = parseScaled(s, RATE_DEC);
    return p.v !== undefined ? p.v : null;
  }
  function normalizeApi(data) {
    if (data === null || data === undefined) return { kind: 'empty' };
    if (!Array.isArray(data)) return { kind: 'invalid' };
    if (data.length === 0) return { kind: 'empty' };
    var first = data[0] || {};
    var rc = Number(first.result);
    if (rc === 2) return { kind: 'bad_request' };
    if (rc === 3) return { kind: 'auth' };
    if (rc === 4) return { kind: 'limit' };
    if (rc !== 1) return { kind: 'invalid' };
    var cur = {}, n = 0;
    data.forEach(function (r) {
      if (!r || typeof r.cur_unit !== 'string') return;
      var m = /^([A-Z]{3})(?:\((\d+)\))?$/.exec(r.cur_unit.trim());
      if (!m || m[1] === 'KRW') return;
      var unit = m[2] ? Number(m[2]) : 1;
      var ttb = parseApiRate(r.ttb), tts = parseApiRate(r.tts), b = parseApiRate(r.deal_bas_r);
      if (!ttb || !tts || !b) return; // 0 또는 비정상 = 데이터 없음(구 통화 등)
      var norm = function (s) { return String(s).replace(/,/g, ''); };
      cur[m[1]] = { name: String(r.cur_nm || ''), unit: unit, ttb: norm(r.ttb), tts: norm(r.tts), base: norm(r.deal_bas_r) };
      n++;
    });
    if (!n) return { kind: 'empty' };
    return { kind: 'ok', currencies: cur };
  }

  return {
    STATUS: STATUS, calculate: calculate, pickCurrencies: pickCurrencies, available: available,
    evaluateFreshness: evaluateFreshness, normalizeApi: normalizeApi, parseScaled: parseScaled, parsePrefBp: parsePrefBp,
    formatDate: formatDate, isoToDay: isoToDay, kstDay: kstDay
  };
});
