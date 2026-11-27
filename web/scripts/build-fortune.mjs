// 새해 재테크 운세 번들: 계산 엔진(결과 단계)과 음력 변환(음력 선택 시)을 브라우저용 파일로 묶는다.
// 생성물(redesign/pages/fortune-engine.js, fortune-lunar.js)은 저장소에 올리지 않는다.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const [entry, name, out] of [['engine.mjs', 'DBFortuneEngine', 'fortune-engine.js'], ['lunar.mjs', 'DBFortuneLunar', 'fortune-lunar.js']]) {
  await build({ entryPoints: [path.join(root, 'redesign/fortune', entry)], bundle: true, minify: true, format: 'iife', globalName: name, target: ['es2019'], platform: 'browser',
    outfile: path.join(root, 'redesign/pages', out), legalComments: 'none', define: { 'process.env.NODE_ENV': '"production"' } });
}
console.log('fortune-engine.js, fortune-lunar.js 생성');
