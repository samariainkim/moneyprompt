// anim.html 의 window.render(t) 를 프레임마다 호출해 JPEG 로 저장한다(결정적 렌더링: 시간 t 만으로 화면이 정해진다).
// 사용: node render_frames.js <anim.html> <frames폴더> <길이(초)> <fps> <너비> <높이> [워커수=4]
// 글꼴은 anim.html 과 같은 폴더의 fonts/ (Pretendard)를 쓴다 → setup_fonts.sh 로 먼저 설치.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const [, , html, out, dur, fps, w, h, workers] = process.argv;
if (!html || !out || !dur) { console.log('사용: node render_frames.js <anim.html> <frames> <dur> <fps> <w> <h> [workers]'); process.exit(1); }
const FPS = +fps || 30, N = Math.round(FPS * +dur), W = +workers || 4;
(async () => {
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const t0 = Date.now();
  await Promise.all([...Array(W).keys()].map(async k => {
    const p = await b.newPage({ viewport: { width: +w, height: +h } });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.resolve(html)); await p.waitForTimeout(800);
    if (errs.length) { console.error('페이지 오류:', errs[0]); process.exit(2); }
    for (let i = k; i < N; i += W) {
      await p.evaluate(t => window.render(t), i / FPS);
      await p.screenshot({ path: path.join(out, `f${String(i).padStart(6, '0')}.jpg`), type: 'jpeg', quality: 92 });
    }
    await p.close();
  }));
  console.log(`프레임 ${N}장 (${((Date.now() - t0) / 1000).toFixed(0)}초)`); await b.close();
})();
