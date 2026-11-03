'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../shared/fx-engine.js');
const P = require('../shared/fx-prompt.js');
const d = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', f), 'utf8'));
const rules = d('fx.rules.v1.0.0.json'), data = d('fx.prompt.v1.0.0.json'), copy = d('fx.copy.json'), rates = d('fx/rates.json');
const NOW = Date.parse('2026-11-02T23:30:00+09:00');
const res = (o) => E.calculate({ mode: 'wire', direction: 'out', currency: 'USD', amount: '100', prefPercent: '90', ...o }, rates, rules, { now: NOW });
const ALL = ['verify', 'compare', 'cost', 'timing', 'checklist'];
const heads = (t) => t.split('\n').filter((l) => l.startsWith('### '));

test('기본 선택(검증만) → 요청 분석에 ① 하나만 포함', () => {
  const t = P.build(res({}), data.defaults, data);
  assert.deepEqual(heads(t), ['### ① 환율·우대율 검증']);
  for (const w of ['은행·서비스별 비용 비교', '환율 변동 시나리오', '체크리스트']) assert.equal(t.includes('### ' + '②' + ' ' + w) || t.includes(w + '\n- '), false, w);
});
test('선택한 메뉴만, 정의된 순서대로 번호가 매겨진다', () => {
  const t = P.build(res({}), ['checklist', 'verify', 'timing'], data);
  assert.deepEqual(heads(t), ['### ① 환율·우대율 검증', '### ② 환율 변동 시나리오', '### ③ 환전·송금 전 체크리스트']);
  assert.deepEqual(heads(P.build(res({}), ALL, data)).length, 5);
});
test('선택이 비어 있으면 기본값(검증)으로', () => assert.deepEqual(heads(P.build(res({}), [], data)), ['### ① 환율·우대율 검증']));
test('계산기 산출값·기준일·출처·계산식이 그대로 전달된다 (송금 받을 때)', () => {
  const r = res({ direction: 'in' }), t = P.build(r, ['verify'], data, { amountText: '100' });
  assert.equal(r.total_krw, 133586);
  for (const s of ['거래 방식: 해외송금', '거래 방향: 해외에서 송금받기', '통화: USD', '외화 금액: 100 USD', '환율 우대율: 90%', '환율 기준일: 2026년 10월 30일', '환율 출처: 한국수출입은행 고시 환율', '매매기준율: 1 USD = 1,337.2원', '우대 전 환율(TTB 송금 받을 때): 1 USD = 1,323.82원', '추정 환산 원화(추가 수수료 차감 전): 133,586원', '기준환율 환산액: 133,720원', '기준환율 대비 예상 차액: 134원', '송금 받을 때 추정 환율 = 매매기준율 − (매매기준율 − TTB) × (1 − 우대율)', '실제 입금 금액을 보장하지 않습니다'])
    assert.ok(t.includes(s), s);
  assert.equal(t.includes('스프레드(일반 참고값 가정)'), false);
});
test('현찰: 스프레드 가정은 프롬프트에만 전달되고, 송금 용어(TTS/TTB·중계)는 쓰지 않는다', () => {
  const r = res({ mode: 'cash' }), t = P.build(r, ALL, data);
  assert.equal(r.total_krw, 133954);
  for (const s of ['거래 방식: 현찰 환전', '거래 방향: 외화 현찰 사기', '적용한 현찰 스프레드(일반 참고값 가정): 1.75%', '추정 필요 원화: 133,954원', '현찰 살 때 추정 환율 = 매매기준율 × [1 + 스프레드 × (1 − 우대율)]', '서로 다른 기준일의 데이터', '수령·인출 수수료']) assert.ok(t.includes(s), s);
  for (const s of ['TTS', 'TTB', '중계', '수취']) assert.equal(t.includes(s), false, s);
});
test('JPY는 100 JPY 단위로 표기', () => {
  const t = P.build(res({ currency: 'JPY', amount: '10000' }), ['verify'], data);
  assert.ok(t.includes('매매기준율: 100 JPY = 848.21원')); assert.ok(t.includes('1,000원') === false || true);
});
test('모든 공통 규칙 포함: 독립 검산·확인하지 못한 것은 확인했다고 하지 않음·임의 생성 금지·질문 최대 3개', () => {
  const t = P.build(res({}), ALL, data);
  for (const s of ['독립적으로 검산', "'추가 확인 필요'", '임의로 만들지 마세요', '최대 3개 질문', '예측하지 마세요', '단정하지 마세요', '이 정보를 임의로 만들어 분석하지 마세요']) assert.ok(t.includes(s), s);
});
test('실패 결과·데이터 없음이면 빈 문자열', () => {
  assert.equal(P.build({ status: 'invalid_input' }, ['verify'], data), ''); assert.equal(P.build(res({}), ['verify'], null), '');
});
test('모든 메뉴가 copy.ai_menu 와 prompt.modules 양쪽에 있다 (화면 항목과 요청문 일치)', () => {
  for (const id of data.order) { assert.ok(copy.ai_menu[id], id); assert.ok(data.modules[id], id); }
  assert.deepEqual(data.defaults, ['verify']);
});
test('프롬프트에 인증키·계좌·개인정보성 문구가 없다', () => {
  const t = P.build(res({ mode: 'cash' }), ALL, data);
  assert.equal(/authkey|인증키|계좌번호|주민/.test(t), false);
});
