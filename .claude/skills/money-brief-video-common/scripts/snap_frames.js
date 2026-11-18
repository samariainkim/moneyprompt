// anim.html 의 특정 시각 화면을 PNG 로 저장한다. 사용: node snap_frames.js <anim.html> <출력폴더> <너비> <높이> <t1,t2,...>
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const [, , html, out, w, h, ts] = process.argv;
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(html)); await p.waitForTimeout(800);
  if (errs.length) { console.error('페이지 오류:', errs[0]); process.exit(2); }
  for (const t of ts.split(',').map(Number)) { await p.evaluate(x => window.render(x), t); await p.screenshot({ path: path.join(out, `t${String(t).replace('.', '_')}.png`) }); }
  await b.close();
})();
