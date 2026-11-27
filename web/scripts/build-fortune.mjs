// 새해 재테크 운세 계산 엔진을 브라우저용 단일 파일로 묶는다 (redesign/pages/fortune-engine.js, 저장소에는 올리지 않는 생성물).
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await build({
  entryPoints: [path.join(root, 'redesign/fortune/engine.mjs')], bundle: true, minify: true, format: 'iife', globalName: 'DBFortuneEngine',
  target: ['es2019'], platform: 'browser', outfile: path.join(root, 'redesign/pages/fortune-engine.js'), legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
});
console.log('fortune-engine.js 생성');
