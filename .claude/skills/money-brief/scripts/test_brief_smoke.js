// MONEY BRIEF 반영 점검(스모크 시험). brief.json 에서 기대값을 읽어 /brief/ 를 실제 브라우저로 확인한다.
// 사용: node web/scripts/sync-static.mjs && (cd web/public && python3 -m http.server 5180 &) && node .claude/skills/money-brief/scripts/test_brief_smoke.js [주소]
// 기본 주소 http://127.0.0.1:5180 . 운영 확인에도 쓸 수 있다: node test_brief_smoke.js https://donbuff.com
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = (process.argv[2] || 'http://127.0.0.1:5180').replace(/\/$/, '');
let root = __dirname; while (root !== '/' && !fs.existsSync(path.join(root, '.git'))) root = path.dirname(root);
const issues = JSON.parse(fs.readFileSync(path.join(root, 'web/redesign/data/brief.json'), 'utf8')).issues.sort((a, b) => b.no - a.no);
const latest = issues[0], oldest = issues[issues.length - 1];
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
(async () => {
  const b = await chromium.launch({ proxy: BASE.startsWith('https://') && process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  async function open(w, h, touch) {
    const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: !!touch, isMobile: !!touch, ignoreHTTPSErrors: true });
    await c.route(/fonts\.googleapis|fonts\.gstatic|googletagmanager|open\.kakao/, (r) => r.abort());
    const p = await c.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::|404/.test(m.text())) errs.push(m.text()); });
    return { c, p, errs };
  }
  // PC
  let { c, p, errs } = await open(1280, 900);
  await p.goto(BASE + '/brief/'); await p.waitForTimeout(800);
  let r = await p.evaluate(() => ({ no: document.querySelector('#bfNo').textContent, bc: document.querySelectorAll('#bfRail .bc').length, tiles: [...document.querySelectorAll('.pp h4')].map((x) => x.textContent), alts: [...document.querySelectorAll('#bfRail img')].every((i) => i.alt.length > 20) }));
  ok(r.no === 'No.' + latest.no, `최신호가 No.${latest.no}`);
  ok(r.bc === 7 && r.alts, '카드 7장, 대체 텍스트 있음');
  if (issues.length > 1) ok(r.tiles.join() === issues.map((i) => 'No.' + i.no).join(), '지난 호 목록이 번호 내림차순');
  const lastCard = latest.cards[6];
  await p.locator('#bfRail .bc').nth(6).scrollIntoViewIfNeeded(); await p.locator('#bfRail .bc').nth(6).click();
  r = await p.evaluate(() => ({ open: !document.querySelector('#lb').hidden, cnt: document.querySelector('#lbCount').textContent, hot: !document.querySelector('#lbHot').hidden, href: document.querySelector('#lbHot').getAttribute('href') }));
  ok(r.open && r.cnt === '7 / 7', '카드 7 확대, 7 / 7');
  if (lastCard.link) ok(r.hot && r.href === lastCard.link.href, `카드 7 연동 링크 → ${lastCard.link.href}`); else ok(!r.hot, '링크 없는 카드는 연동 영역 없음');
  await p.keyboard.press('Home'); ok((await p.textContent('#lbCount')) === '1 / 7', 'Home → 1 / 7');
  await p.keyboard.press('ArrowRight'); ok((await p.textContent('#lbCount')) === '2 / 7', '→ 키 2 / 7');
  await p.keyboard.press('Escape'); ok(await p.evaluate(() => document.querySelector('#lb').hidden), 'Esc 로 닫힘');
  for (const it of issues) { // 호마다 연동 링크가 정확한지
    await p.goto(BASE + '/brief/?n=' + it.no); await p.waitForTimeout(300);
    const cl = it.cards.find((x) => x.link);
    ok((await p.textContent('#bfNo')) === 'No.' + it.no, `?n=${it.no} 로 열림`);
    if (cl) { await p.locator('#bfRail .bc').nth(cl.n - 1).click(); ok((await p.getAttribute('#lbHot', 'href')) === cl.link.href, `No.${it.no} 카드${cl.n} 링크 ${cl.link.href}`); await p.keyboard.press('Escape'); }
  }
  const ov = await p.evaluate(() => { const o = []; document.querySelectorAll('.site *').forEach((e) => { const r = e.getBoundingClientRect(); if (r.width > 0 && r.right > innerWidth + 1 && !e.closest('#bfRail') && !e.closest('.fan')) o.push(e.className); }); return o.slice(0, 3); });
  ok(ov.length === 0, 'PC 가로 넘침 없음 ' + JSON.stringify(ov));
  ok(errs.length === 0, '콘솔 오류 없음 ' + errs.join('|')); await c.close();
  // 메인 배너·메뉴
  ({ c, p, errs } = await open(1280, 900));
  await p.goto(BASE + '/'); await p.waitForTimeout(600);
  r = await p.evaluate(() => ({ banner: !!document.querySelector('#svc-brief'), btn: (document.querySelector('#svc-brief .go') || {}).textContent, nav: !!document.querySelector('nav.pc a[data-nav="brief"]'), figs: [...document.querySelectorAll('#svc-brief figcaption')].length }));
  ok(r.banner && r.btn === '뉴스 보러가기 →' && r.nav, '메인 배너("뉴스 보러가기 →")와 헤더 메뉴');
  ok(r.figs === Math.min(3, issues.length), `배너 표지 ${Math.min(3, issues.length)}장`);
  await c.close();
  // 모바일
  ({ c, p, errs } = await open(390, 760, true));
  await p.goto(BASE + '/brief/'); await p.waitForTimeout(800);
  const mo = await p.evaluate(() => { const o = []; document.querySelectorAll('.site *').forEach((e) => { const r = e.getBoundingClientRect(); if (r.width > 0 && r.right > innerWidth + 1 && !e.closest('#bfRail') && !e.closest('.fan')) o.push(e.className || e.tagName); }); return o.slice(0, 3); });
  ok(mo.length === 0, '모바일 가로 넘침 없음 ' + JSON.stringify(mo));
  await p.locator('#bfRail .bc').first().tap();
  const mr = await p.evaluate(() => { const r = document.querySelector('#lbImg').getBoundingClientRect(); return [Math.round(r.bottom), innerHeight]; });
  ok(mr[0] <= mr[1], '모바일 확대 이미지가 화면 안 ' + mr);
  ok(errs.length === 0, '모바일 콘솔 오류 없음'); await c.close(); await b.close();
  console.log(fails ? `\n실패 ${fails}건` : '\n모두 통과'); process.exit(fails ? 1 : 0);
})();
