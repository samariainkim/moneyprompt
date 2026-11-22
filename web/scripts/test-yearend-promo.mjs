// announce() 켜짐 조건 시험: node scripts/test-yearend-promo.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { announce } from '../redesign/shared/chrome.mjs';
const menu = JSON.parse(readFileSync(new URL('../redesign/data/menu.json', import.meta.url), 'utf8'));
const on = () => true, off = (p) => p !== '/yearend/';
const d = (s) => new Date(s + 'T03:00:00+09:00');
assert.ok(announce(menu, on, d('2026-11-24')), '기간 안·페이지 켜짐 → 표시');
assert.equal(announce(menu, off, d('2026-11-24')), null, '특집 페이지가 꺼진 환경(운영 미공개) → 숨김');
assert.equal(announce(menu, on, d('2026-10-31')), null, '시작 전 → 숨김');
assert.equal(announce(menu, on, d('2027-02-01')), null, '종료 후 → 숨김');
assert.equal(announce({ announce: { ...menu.announce, enabled: false } }, on, d('2026-11-24')), null, 'enabled=false → 숨김');
console.log('yearend-promo: 5 passed');
