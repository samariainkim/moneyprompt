// 재물 신호 규칙 — ⚠ '시안 샘플'. 고전 근거 기반 규칙표는 사용자 확정 전까지 sample:true.
// 근거(evidence)는 실제 계산값이고, 문장(text)만 샘플이다. 세 관점 점수화·다수결 결론은 내지 않는다.
export const RULES_VERSION = 'sample-0';
const WEALTH_STARS_Z = ['재백', '복덕', '전택'];
const stars = (p) => p.major.map((s) => s.n).join('·') || '주성 없음';

export function deriveSignals(c) {
  const s = c.saju, z = c.ziwei, w = c.western;
  const wealthTG = ['정재', '편재'];
  const cai = s.pillars.filter((p) => p.hidden.some((h) => wealthTG.includes(h.tg)) || wealthTG.includes(p.stemTG)).map((p) => p.label);
  const zw = z.palaces.filter((p) => WEALTH_STARS_Z.includes(p.name)).map((p) => ({ name: p.name, stars: stars(p), at: p.stem + p.branch }));
  const astro = [2, 8, 10].map((n) => ({ house: n, sign: w.houseSign[n - 1] }));
  const wealthPlanets = ['jupiter', 'saturn', 'venus'].map((k) => w.bodies.find((b) => b.k === k)).map((b) => ({ n: b.ko, sign: b.sign, house: b.house }));
  const evidence = {
    saju: `${cai.length ? '재성이 ' + cai.join('·') + '에 있어요' : '재성(정재·편재)이 드러나지 않아요'} · 2027 세운 ${s.sewoon.gz}(${s.sewoon.tg})`,
    ziwei: zw.map((p) => `${p.name}궁 ${p.stars}`).join(' / '),
    western: astro.map((a) => `${a.house}하우스 ${a.sign}`).join(' · '),
  };
  return {
    sample: true, rulesVersion: RULES_VERSION,
    keySentence: '새해에는 들어오는 돈을 늘리는 일보다, 새는 구멍을 먼저 살피면 좋은 흐름이에요.',
    keywords: ['축적', '변화', '지출 점검'],
    topics: { earn: { label: '돈 벌기' }, save: { label: '돈 모으기' }, invest: { label: '투자 습관' } },
    evidence, parts: { cai, zw, astro, wealthPlanets },
  };
}
