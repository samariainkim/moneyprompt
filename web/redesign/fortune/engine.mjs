export { THEME, SUMMARY4, TOPICS4, EASY, GLOSSARY, ZW_WEALTH, AS_WEALTH } from './rules.mjs';
// 돈버프 새해 재테크 운세 — 계산 엔진 (브라우저에서만 실행, 서버 전송 없음)
// 사주: @openfate/bazi-engine · 자미두수: iztro · 점성술: circular-natal-horoscope-js
// ※ 재물 신호 문장·키워드는 rules.mjs 의 '시안 샘플'이며 규칙표 확정 전까지 sample:true 로 표시한다.
import * as baziPkg from '@openfate/bazi-engine';
import * as iztroPkg from 'iztro';
import * as natalPkg from 'circular-natal-horoscope-js';
import { deriveSignals } from './rules.mjs';

const eng = baziPkg.default || baziPkg;
const astro = (iztroPkg.astro || (iztroPkg.default && iztroPkg.default.astro));
const { Origin, Horoscope } = natalPkg.Origin ? natalPkg : natalPkg.default;
export const YEAR = 2027;
export const SEWOON = { gz: '丁未', stem: '丁', branch: '未' };

export const STEM = { 甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무', 己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계' };
export const BR = { 子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사', 午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해' };
const TG = { 比肩: '비견', 劫财: '겁재', 劫財: '겁재', 食神: '식신', 伤官: '상관', 傷官: '상관', 偏财: '편재', 偏財: '편재', 正财: '정재', 正財: '정재', 七杀: '편관', 七殺: '편관', 偏官: '편관', 正官: '정관', 偏印: '편인', 正印: '정인', 日主: '나(일간)' };
export const EL_STEM = { 甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth', 己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water' };
export const EL_BR = { 子: 'water', 丑: 'earth', 寅: 'wood', 卯: 'wood', 辰: 'earth', 巳: 'fire', 午: 'fire', 未: 'earth', 申: 'metal', 酉: 'metal', 戌: 'earth', 亥: 'water' };
const STAGE = { 長生: '장생', 长生: '장생', 沐浴: '목욕', 冠帶: '관대', 冠带: '관대', 臨官: '건록', 临官: '건록', 帝旺: '제왕', 衰: '쇠', 病: '병', 死: '사', 墓: '묘', 絕: '절', 绝: '절', 胎: '태', 養: '양', 养: '양' };
const PNAME = { year: '년지', month: '월지', day: '일지', hour: '시지' };
const POL = { 甲: 1, 乙: 0, 丙: 1, 丁: 0, 戊: 1, 己: 0, 庚: 1, 辛: 0, 壬: 1, 癸: 0 };
const EL_ORDER = ['wood', 'fire', 'earth', 'metal', 'water'];
export function tenGod(dm, s) {
  const rel = (EL_ORDER.indexOf(EL_STEM[s]) - EL_ORDER.indexOf(EL_STEM[dm]) + 5) % 5;
  return [['비견', '겁재'], ['식신', '상관'], ['편재', '정재'], ['편관', '정관'], ['편인', '정인']][rel][POL[s] === POL[dm] ? 0 : 1];
}
export const GRID = { 사: [0, 0], 오: [0, 1], 미: [0, 2], 신: [0, 3], 진: [1, 0], 유: [1, 3], 묘: [2, 0], 술: [2, 3], 인: [3, 0], 축: [3, 1], 자: [3, 2], 해: [3, 3] };
export const SIGN_KO = { Aries: '양자리', Taurus: '황소자리', Gemini: '쌍둥이자리', Cancer: '게자리', Leo: '사자자리', Virgo: '처녀자리', Libra: '천칭자리', Scorpio: '전갈자리', Sagittarius: '사수자리', Capricorn: '염소자리', Aquarius: '물병자리', Pisces: '물고기자리' };
export const SIGN_GL = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const BODIES = [['sun', '태양', '☉'], ['moon', '달', '☽'], ['mercury', '수성', '☿'], ['venus', '금성', '♀'], ['mars', '화성', '♂'], ['jupiter', '목성', '♃'], ['saturn', '토성', '♄'], ['uranus', '천왕성', '♅'], ['neptune', '해왕성', '♆'], ['pluto', '명왕성', '♇']];

// 입력 시각(시:분) → 자미두수 시진 번호 (0=조자시, 1=축 … 11=해, 12=만자시). 자시 구분은 23:00 기준.
export function timeIndex(h, m) {
  if (h === 23) return 12;
  if (h === 0 && m >= 0) return 0;
  return Math.floor((h + 1) / 2);
}

/** input: { y, m, d, hh, mm, gender:'male'|'female', lat, lon } (양력, 한국 표준시 입력) */
function houseOf(lon, cusps) { for (let i = 0; i < 12; i++) { const a = cusps[i], b = cusps[(i + 1) % 12]; const span = (b - a + 360) % 360, off = (lon - a + 360) % 360; if (off < span) return i + 1; } return 1; }
const SIGN_OF = (lon) => SIGN_KO[['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][Math.floor((((lon % 360) + 360) % 360) / 30)]];

/** 2027년 느린 행성(목성·토성)의 연초·연말 위치와, 출생차트 하우스 기준 어디를 지나는지 */
function transits2027(cusps, lat, lon) {
  const at = (m, d) => new Horoscope({ origin: new Origin({ year: YEAR, month: m, date: d, hour: 12, minute: 0, latitude: lat, longitude: lon }), houseSystem: 'placidus', zodiac: 'tropical', aspectPoints: ['bodies'], aspectWithPoints: ['bodies'], aspectTypes: ['major'], customOrbs: {}, language: 'en' });
  const a = at(0, 1), b = at(11, 31);
  return [['jupiter', '목성'], ['saturn', '토성']].map(([k, ko]) => {
    const l1 = a.CelestialBodies[k].ChartPosition.Ecliptic.DecimalDegrees, l2 = b.CelestialBodies[k].ChartPosition.Ecliptic.DecimalDegrees;
    return { k, ko, start: { lon: l1, sign: SIGN_OF(l1), house: houseOf(l1, cusps) }, end: { lon: l2, sign: SIGN_OF(l2), house: houseOf(l2, cusps) } };
  });
}

export function calculate(input) {
  const { y, m, d, hh, mm, gender, lat, lon } = input;
  const bz = eng.calculateBaziChart({ year: y, month: m, day: d, hour: hh, minute: mm, gender, longitude: lon, timezoneId: 'Asia/Seoul', enableTrueSolarTime: true, dayBoundaryMode: 'ZI_HOUR_23' });
  const DM = bz.dayMaster.char;
  const pillars = ['hour', 'day', 'month', 'year'].map((k) => {
    const p = bz.pillars[k];
    return { key: k, label: { hour: '시주', day: '일주', month: '월주', year: '년주' }[k], stem: p.stem, branch: p.branch, stage: STAGE[p.growthStage] || p.growthStage || '', mainTG: (p.hiddenStems.filter((h) => h.isMain)[0] ? TG[p.hiddenStems.filter((h) => h.isMain)[0].tenGod] : ''),
      stemTG: k === 'day' ? '나(일간)' : (TG[p.stemTenGod] || p.stemTenGod),
      hidden: p.hiddenStems.map((h) => ({ s: h.stem, tg: TG[h.tenGod] || h.tenGod, main: h.isMain })) };
  });
  const cycles = bz.daYun.cycles.slice(0, 8).map((c) => ({ age: c.startAge, endAge: c.endAge, endYear: c.endYear, year: c.startYear, gz: c.ganZhi, tg: TG[c.stemTenGod] || c.stemTenGod }));
  const sewoon = { ...SEWOON, tg: tenGod(DM, SEWOON.stem) };
  const relations = (bz.interactions || []).map((it) => { const m = /\(([^)]*)\)/.exec(it.description || ''); return { text: (m ? m[1] : it.type).replace(/\s*—.*$/, ''), where: (it.pillars || []).map((k) => PNAME[k] || k).join('·') }; });
  const lunar = bz.calendar && bz.calendar.lunar ? { y: bz.calendar.lunar.year, m: bz.calendar.lunar.month, d: bz.calendar.lunar.day, leap: !!bz.calendar.lunar.isLeapMonth } : null;

  const zw = astro.bySolar(`${y}-${m}-${d}`, timeIndex(hh, mm), gender === 'male' ? '男' : '女', true, 'ko-KR');
  const zwY = zw.horoscope(`${YEAR}-2-10`);
  const palaces = zw.palaces.map((p, i) => ({ name: p.name, stem: p.heavenlyStem, branch: p.earthlyBranch, range: p.decadal.range, c12: p.changsheng12, b12: p.boshi12, dname: zwY.decadal.palaceNames[i], yname: zwY.yearly.palaceNames[i],
    major: p.majorStars.map((s) => ({ n: s.name, m: s.mutagen, b: s.brightness })), minor: p.minorStars.map((s) => ({ n: s.name, m: s.mutagen })), isBody: p.isBodyPalace }));
  const sanfang = {}; ['재백', '관록', '전택', '복덕'].forEach((n) => { try { const r = zw.surroundedPalaces(n); sanfang[n] = [r.opposite, r.wealth, r.career].map((x) => x && x.name).filter(Boolean); } catch (e) { sanfang[n] = []; } });
  const curDec = palaces.findIndex((p) => zwY.age && p.range[0] <= zwY.age.nominalAge && zwY.age.nominalAge <= p.range[1]);
  const ziwei = { palaces, sanfang, curDecadal: curDec, age: zwY.age ? zwY.age.nominalAge : null, mutagen: zwY.yearly.mutagen, decMutagen: zwY.decadal.mutagen, lunar: zw.lunarDate, soul: zw.earthlyBranchOfSoulPalace, body: zw.earthlyBranchOfBodyPalace, five: zw.fiveElementsClass };

  const origin = new Origin({ year: y, month: m - 1, date: d, hour: hh, minute: mm, latitude: lat, longitude: lon });
  const hs = new Horoscope({ origin, houseSystem: 'placidus', zodiac: 'tropical', aspectPoints: ['bodies', 'angles'], aspectWithPoints: ['bodies', 'angles'], aspectTypes: ['major'], customOrbs: {}, language: 'en' });
  const bodies = BODIES.map(([k, ko, gl]) => { const b = hs.CelestialBodies[k]; return { k, ko, gl, lon: b.ChartPosition.Ecliptic.DecimalDegrees, sign: SIGN_KO[b.Sign.label], deg: b.ChartPosition.Ecliptic.ArcDegreesFormatted30, house: b.House.id, retro: b.isRetrograde }; });
  const western = { bodies, cusps: hs.Houses.map((h) => h.ChartPosition.StartPosition.Ecliptic.DecimalDegrees), houseSign: hs.Houses.map((h) => SIGN_KO[h.Sign.label]),
    asc: hs.Ascendant.ChartPosition.Ecliptic.DecimalDegrees, mc: hs.Midheaven.ChartPosition.Ecliptic.DecimalDegrees, mcSign: SIGN_KO[hs.Midheaven.Sign.label],
    transit: null, aspects: (hs.Aspects.all || []).filter((a) => BODIES.some((b) => b[0] === a.point1Key) && BODIES.some((b) => b[0] === a.point2Key)).map((a) => ({ a: a.point1Key, b: a.point2Key, t: a.aspectKey, orb: a.orb })) };

  western.transit = transits2027(western.cusps, lat, lon);
  const si = bz.solarTimeInfo; const tst = si ? { time: si.trueSolarTime, lonMin: Math.round(si.longitudeCorrectionMinutes), eotMin: Math.round(si.equationOfTimeMinutes) } : null;
  const chart = { year: YEAR, saju: { dm: DM, pillars, cycles, sewoon, relations, lunar, trueSolar: tst || null }, ziwei, western };
  chart.signals = deriveSignals(chart);
  return chart;
}
