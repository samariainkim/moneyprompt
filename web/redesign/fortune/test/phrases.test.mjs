// 화면·규칙 문구에 투자 권유·수익 보장처럼 읽히는 표현이 없는지 검사한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const files = ['../../pages/fortune.js', '../../pages/fortune.html', '../rules.mjs', '../../pages/fortune-result.js'].map((f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8'));
const BAD = ['수익 보장', '반드시 오른', '무조건', '매수하세요', '매도하세요', '추천 종목', '대박', '원금 보장', '확실히 오'];
test('금지 표현 없음', () => { for (const t of files) for (const b of BAD) assert.ok(!t.includes(b), b); });
test('시작 화면에 참고자료·투자 권유 아님 고지가 있다', () => { assert.ok(files[0].includes('투자 권유가 아닙니다')); });
