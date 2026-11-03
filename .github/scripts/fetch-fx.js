'use strict';
/* 한국수출입은행 환율 수집 스크립트
 *  - 실행: node .github/scripts/fetch-fx.js   (환경변수 KOREAEXIM_AUTHKEY 필요)
 *  - 결과: calc/data/fx/rates.json 갱신. 이상이 있으면 파일을 바꾸지 않고 비정상 종료한다.
 *  - 테스트: node --test calc/tests/fx-fetch.test.js
 *  - 인증키는 URL에만 쓰이며 로그·결과에는 절대 출력하지 않는다.
 */
const fs = require('node:fs');
const path = require('node:path');
const E = require('../../calc/shared/fx-engine.js');

const API_URL = 'https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON';
const RATES_FILE = path.join(__dirname, '..', '..', 'calc', 'data', 'fx', 'rates.json');
const LOOKBACK_DAYS = 8;            // 오늘 포함 최대 8일 거슬러 조회(연휴 대응)
const MIN_CURRENCIES = 5;           // 이보다 적으면 비정상 응답으로 본다
const CORE_CURRENCIES = ['USD', 'JPY', 'EUR', 'CNH'];
const USD_MAX_MOVE = 0.10;          // 직전 값 대비 USD 매매기준율 변동 허용 폭(10%)
const KST_MS = 9 * 3600e3;
const DAY_MS = 86400e3;

/* ── 날짜 (KST) ── */
function kstDate(ms) { return new Date(ms + KST_MS).toISOString().slice(0, 10); }
function kstStamp(ms) { return new Date(ms + KST_MS).toISOString().slice(0, 19) + '+09:00'; }
function dateBack(date, n) { return new Date(Date.parse(date + 'T00:00:00Z') - n * DAY_MS).toISOString().slice(0, 10); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (s) => Number(String(s).replace(/,/g, ''));

/* ── HTTP: 일시 오류(5xx·429·네트워크)만 재시도, 그 외는 즉시 실패 ── */
async function fetchJson(fetchFn, url, opts) {
  const o = opts || {};
  const retries = o.retries === undefined ? 2 : o.retries;
  const backoffMs = o.backoffMs === undefined ? 2000 : o.backoffMs;
  const timeoutMs = o.timeoutMs === undefined ? 20000 : o.timeoutMs;
  let last = { ok: false, reason: 'network' };
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(backoffMs * attempt);
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      let res;
      try { res = await fetchFn(url, { signal: ctl.signal }); } catch (e) { last = { ok: false, reason: 'network' }; continue; }
      if (!res.ok) {
        last = { ok: false, reason: 'http', status: res.status };
        if (res.status >= 500 || res.status === 429) continue;
        return last;
      }
      try { return { ok: true, data: await res.json() }; } catch (e) { return { ok: false, reason: 'invalid' }; }
    } finally { clearTimeout(timer); }
  }
  return last;
}

/* ── 수집·검증·기록 ──
   반환: { status: 'updated', base_date } | { status: 'error', reason } */
async function run(o) {
  const { fetchFn, key, nowMs, readPrev, write, fetchOpts } = o;
  const log = o.log || (() => {});
  const say = (m) => log(key ? String(m).split(key).join('***') : String(m));
  const fail = (reason) => { say('수집 실패: ' + reason); return { status: 'error', reason }; };

  if (!key) return fail('no_key');
  const prev = readPrev();
  const today = kstDate(nowMs);

  for (let i = 0; i < LOOKBACK_DAYS; i++) {
    const day = dateBack(today, i);
    const url = API_URL + '?authkey=' + encodeURIComponent(key) + '&searchdate=' + day.replace(/-/g, '') + '&data=AP01';
    const r = await fetchJson(fetchFn, url, fetchOpts);
    if (!r.ok) return fail(r.reason);

    const n = E.normalizeApi(r.data);
    if (n.kind === 'empty') { say(day + ': 데이터 없음(비영업일 또는 고시 전), 전일 조회'); continue; }
    if (n.kind !== 'ok') return fail(n.kind); // bad_request · auth · limit · invalid

    const codes = Object.keys(n.currencies).sort();
    if (codes.length < MIN_CURRENCIES) return fail('too_few_currencies');
    if (CORE_CURRENCIES.some((c) => !n.currencies[c])) return fail('missing_core_currency');

    const prevUsd = prev && prev.currencies && prev.currencies.USD ? num(prev.currencies.USD.base) : NaN;
    const newUsd = num(n.currencies.USD.base);
    if (prevUsd > 0 && Math.abs(newUsd / prevUsd - 1) > USD_MAX_MOVE) return fail('usd_move_too_large');
    if (prev && typeof prev.base_date === 'string' && day < prev.base_date) return fail('base_date_regression');

    const currencies = {};
    codes.forEach((c) => { currencies[c] = n.currencies[c]; });
    write({
      schema: 1,
      source: '한국수출입은행',
      base_date: day,
      checked_at: kstStamp(nowMs),
      note: '한국수출입은행 환율 API 자동 수집(GitHub Actions).',
      currencies: currencies
    });
    say('갱신 완료: base_date=' + day + ', 통화 ' + codes.length + '개');
    return { status: 'updated', base_date: day };
  }
  return fail('no_data_in_lookback');
}

module.exports = { run, kstDate, kstStamp, dateBack };

if (require.main === module) {
  run({
    fetchFn: (u, opts) => fetch(u, opts),
    key: process.env.KOREAEXIM_AUTHKEY || '',
    nowMs: Date.now(),
    readPrev: () => { try { return JSON.parse(fs.readFileSync(RATES_FILE, 'utf8')); } catch (e) { return null; } },
    write: (obj) => fs.writeFileSync(RATES_FILE, JSON.stringify(obj, null, 2) + '\n'),
    log: (m) => console.log(m)
  }).then((r) => {
    console.log(JSON.stringify(r));
    if (r.status !== 'updated') {
      console.error('::error::FX rates 수집 실패 (' + r.reason + ')');
      process.exit(1);
    }
  });
}
