// 사용: node shot.js <out 폴더>
// out/*.html(01.html~07.html) 을 1080×1350 PNG 로 저장하고, 글자 넘침 점검용 위치(metrics.json)와
// 카드 속 글자 전체(alt.json: 검색·접근성용 대체 텍스트)를 함께 만든다.
// playwright 는 전역 설치본을 쓴다(NODE_PATH=$(npm root -g) 또는 이 환경에 미리 설치된 것).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const dir = path.resolve(process.argv[2] || 'out');
  const files = fs.readdirSync(dir).filter((x) => /^\d\d\.html$/.test(x)).sort();
  if (!files.length) { console.error('out 폴더에 01.html 같은 카드가 없습니다.'); process.exit(2); }
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  const metrics = [], alts = [];
  for (const f of files) {
    await p.goto('file://' + path.join(dir, f));
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(250);
    const bad = await p.evaluate(() => [...document.fonts].filter((f) => f.status === 'error').map((f) => f.family + f.weight));
    if (bad.length) { console.error('글꼴 로드 실패(fonts/ 폴더 확인): ' + bad.join(', ')); process.exit(3); }
    const r = await p.evaluate(() => {
      const box = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; };
      const card = document.querySelector('.card').cloneNode(true);
      card.querySelectorAll('.bar,.dots,.wm,.badge,script,style').forEach((e) => e.remove());
      const w = document.createTreeWalker(card, NodeFilter.SHOW_TEXT), parts = []; let n;
      while ((n = w.nextNode())) { const t = n.nodeValue.replace(/\s+/g, ' ').trim(); if (t) parts.push(t); }
      return {
        m: { body: box('.body'), src: box('.src'), sub: box('.cover .s'), num: box('.num'), ctaBody: box('.cta .p'), pills: box('.pills'), btn: box('.btn'), dots: box('.dots'), title: box('.t') },
        alt: parts.join(' ').replace(/ ([,.)])/g, '$1').trim(),
      };
    });
    metrics.push({ file: f, ...r.m });
    alts.push(r.alt);
    await p.screenshot({ path: path.join(dir, f.replace('.html', '.png')) });
  }
  await b.close();
  fs.writeFileSync(path.join(dir, 'metrics.json'), JSON.stringify(metrics, null, 1));
  fs.writeFileSync(path.join(dir, 'alt.json'), JSON.stringify(alts, null, 1));
  console.log(`${files.length}장 캡처 완료`);
})();
