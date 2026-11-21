// 연말정산 일정 데이터·D-day 시험 — 실행: node scripts/test-yearend-cal.cjs
const assert = require('assert'); const path = require('path'); const RD = path.join(__dirname, '..', 'redesign');
const C = require(path.join(RD, 'pages', 'yearend-cal.js')); const D = require(path.join(RD, 'data', 'yearend', 'calendar.json'));
const T = []; const t = (n, f) => { try { f(); T.push(['PASS', n]); } catch (e) { T.push(['FAIL', n + ' → ' + e.message]); } };
const by = id => D.items.find(i => i.id === id);
t('01 기간 일정: 시작 전은 "시작 D-n", 기간 중은 "종료 D-n", 종료 후는 "종료됨"', () => { const it = by('consent-window'); assert.equal(C.dday(it, '2026-11-21').text, '시작 D-10'); assert.equal(C.dday(it, '2026-12-01').text, '종료 D-' + C.diff('2026-12-01', '2027-01-19')); assert.equal(C.dday(it, '2027-01-19').text, '종료 D-DAY'); assert.equal(C.dday(it, '2027-01-20').text, '종료됨'); });
t('02 미리보기 종료(12/18)는 11/21 기준 종료 D-27, 지금 진행 중', () => { const it = by('preview-check'); assert.equal(C.dday(it, '2026-11-21').text, '종료 D-27'); assert(C.isNow(it, '2026-11-21')); assert(!C.isNow(it, '2026-10-27')); });
t('03 단일 날짜(12/31)는 D-n, 당일 D-DAY, 이후 지남', () => { const it = by('pension-1231'); assert.equal(C.dday(it, '2026-11-21').text, 'D-40'); assert.equal(C.dday(it, '2026-12-31').text, 'D-DAY'); assert.equal(C.dday(it, '2027-01-01').text, '지남'); });
t('04 대략 일정(1월 중순)·날짜 없는 항목은 D-day 를 표시하지 않는다', () => { assert.equal(C.dday(by('simplified-open'), '2026-11-21'), null); assert.equal(C.dday(by('company-schedule'), '2026-11-21'), null); });
t('05 한국시간 날짜 변환(UTC 15:00 = 다음 날 00:00 KST)', () => { assert.equal(C.kstToday(Date.UTC(2026, 10, 20, 14, 59)), '2026-11-20'); assert.equal(C.kstToday(Date.UTC(2026, 10, 20, 15, 0)), '2026-11-21'); });
t('06 데이터: id 중복 없음, 구간 A~D, 항목 13개, 상태·행동 유형이 허용값', () => { const ids = D.items.map(i => i.id); assert.equal(new Set(ids).size, ids.length); assert.deepEqual(D.phases.map(p => p.id), ['A', 'B', 'C', 'D']); assert.equal(D.items.length, 13); for (const i of D.items) { assert(D.phases.some(p => p.id === i.phase), i.id); assert(C.STATUS[i.status], i.id); assert(C.ACTION_TYPES.includes(i.action.type), i.id); } });
t('07 "공식 일정 확인"(official)은 출처가 있고, 지금은 미리보기 종료 1건만이다(원문 확인 전 항목을 공식으로 표시하지 않음)', () => { const off = D.items.filter(i => i.status === 'official'); assert.deepEqual(off.map(i => i.id), ['preview-check']); for (const i of off) assert(i.source && i.source.name); });
t('08 날짜를 주장하는 항목(start 또는 when)은 self 가 아니고 출처가 있다', () => { for (const i of D.items) if (i.start || i.when) { assert(i.status !== 'self', i.id); assert(i.source, i.id); } });
t('09 허브 카드 항목은 4개이며 제목이 있다', () => { const h = D.items.filter(i => i.hub); assert.equal(h.length, 4); for (const i of h) assert(i.hub.label && i.hub.title, i.id); });
t('10 체크업 버튼은 4개 항목에만 연결되고, 나머지는 목적에 맞는 행동(홈택스·계산 흐름·준비중·없음)이다', () => { assert.deepEqual(D.items.filter(i => i.action.type === 'checkup').map(i => i.id), ['dependents', 'missing-deductions', 'evidence', 'life-changes']); assert(D.items.filter(i => i.action.type === 'ext').length >= 3); });
for (const [s, n] of T) console.log(s, n); const f = T.filter(x => x[0] === 'FAIL').length; console.log(f ? 'FAILED ' + f : 'ALL PASS', T.length + '건'); process.exit(f ? 1 : 0);
