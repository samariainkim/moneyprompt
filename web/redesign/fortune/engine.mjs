export { THEME, SUMMARY4, TOPICS4, EASY, GLOSSARY, ZW_WEALTH, AS_WEALTH } from './rules.mjs';
// 돈버프 새해 재테크 운세 — 계산 엔진 (브라우저에서만 실행, 서버 전송 없음)
// 사주: @openfate/bazi-engine · 자미두수: iztro · 점성술: circular-natal-horoscope-js
// ※ 재물 신호 문장·키워드는 rules.mjs 의 '시안 샘플'이며 규칙표 확정 전까지 sample:true 로 표시한다.
import * as baziPkg from '@openfate/bazi-engine';
import * as iztroPkg from 'iztro';
import * as natalPkg from 'circular-natal-horoscope-js';
import KoreanLunarCalendar from 'korean-lunar-calendar';
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

const SIGN_EN = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const SIGN_OF = (lon) => SIGN_KO[SIGN_EN[Math.floor((((lon % 360) + 360) % 360) / 30)]];
const pad2 = (n) => String(n).padStart(2, '0');
const mkHs = (o, cfg) => new Horoscope({ origin: new Origin(o), houseSystem: 'placidus', zodiac: 'tropical', aspectPoints: cfg ? ['bodies', 'angles'] : ['bodies'], aspectWithPoints: cfg ? ['bodies', 'angles'] : ['bodies'], aspectTypes: ['major'], customOrbs: {}, language: 'en' });

/** 양력 → 한국 음력 (한국천문연구원 자료 기반 라이브러리). 지원 범위 밖이면 null */
export function koLunar(y, m, d) {
  try { const k = new KoreanLunarCalendar(); if (!k.setSolarDate(y, m, d)) return null; const l = k.getLunarCalendar(); return { y: l.year, m: l.month, d: l.day, leap: !!l.intercalation }; } catch (e) { return null; }
}
/** 한국 음력 → 양력 */
export function koSolar(y, m, d, leap) {
  try { const k = new KoreanLunarCalendar(); if (!k.setLunarDate(y, m, d, !!leap)) return null; const s = k.getSolarCalendar(); return { y: s.year, m: s.month, d: s.day }; } catch (e) { return null; }
}

/** 황경(lon)이 속한 하우스 번호(1~12). cusps: 12개 하우스 시작 황경. 시작점에 정확히 놓이면 그 하우스에 속한다. */
export function houseOf(lon, cusps) {
  if (!Number.isFinite(lon) || !Array.isArray(cusps) || cusps.length !== 12 || cusps.some((c) => !Number.isFinite(c))) throw new Error('houseOf: invalid input');
  const n = (x) => ((x % 360) + 360) % 360, L = n(lon);
  for (let i = 0; i < 12; i++) { const a = n(cusps[i]), b = n(cusps[(i + 1) % 12]), span = (b - a + 360) % 360, off = (L - a + 360) % 360; if (span > 0 && off < span) return i + 1; }
  throw new Error('houseOf: no house');
}

/** 2027년 목성·토성: 연초·연말 위치, 매월 1일 위치, 별자리·하우스 진입일, 순행·역행 전환일 (각 날짜 한국 정오 기준 일 단위) */
function transits2027(cusps, lat, lon) {
  const cache = new Map();
  const state = (doy) => {
    if (cache.has(doy)) return cache.get(doy);
    const dt = new Date(Date.UTC(YEAR, 0, 1 + doy)), hs = mkHs({ year: YEAR, month: dt.getUTCMonth(), date: dt.getUTCDate(), hour: 12, minute: 0, latitude: lat, longitude: lon }, false), o = {};
    for (const k of ['jupiter', 'saturn']) { const b = hs.CelestialBodies[k], l = b.ChartPosition.Ecliptic.DecimalDegrees; o[k] = { lon: l, sign: SIGN_OF(l), signIdx: Math.floor(l / 30), house: houseOf(l, cusps), retro: b.isRetrograde }; }
    cache.set(doy, o); return o;
  };
  const fmt = (doy) => { const dt = new Date(Date.UTC(YEAR, 0, 1 + doy)); return YEAR + '-' + pad2(dt.getUTCMonth() + 1) + '-' + pad2(dt.getUTCDate()); };
  const grid = []; for (let d = 0; d < 365; d += 6) grid.push(d); if (grid[grid.length - 1] !== 364) grid.push(364);
  return [['jupiter', '목성'], ['saturn', '토성']].map(([k, ko]) => {
    const ev = [];
    for (let i = 0; i + 1 < grid.length; i++) {
      const a = state(grid[i])[k], b = state(grid[i + 1])[k];
      for (const [kind, key] of [['sign', 'signIdx'], ['house', 'house'], ['retro', 'retro']]) {
        if (a[key] === b[key]) continue;
        let lo = grid[i], hi = grid[i + 1]; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (state(mid)[k][key] === a[key]) lo = mid; else hi = mid; }
        const t = state(hi)[k];
        ev.push({ doy: hi, date: fmt(hi), kind, text: kind === 'sign' ? ko + ' ' + t.sign + ' 진입' : kind === 'house' ? ko + ' 출생 ' + t.house + '하우스 진입' : ko + (t.retro ? ' 역행 시작' : ' 순행 전환') });
      }
    }
    ev.sort((x, y) => x.doy - y.doy);
    const months = []; for (let mo = 0; mo < 12; mo++) { const doy = Math.round((Date.UTC(YEAR, mo, 1) - Date.UTC(YEAR, 0, 1)) / 864e5), t = state(doy)[k]; months.push({ m: mo + 1, lon: t.lon, sign: t.sign, house: t.house, retro: t.retro }); }
    const s0 = state(0)[k], s1 = state(364)[k];
    return { k, ko, start: { lon: s0.lon, sign: s0.sign, house: s0.house }, end: { lon: s1.lon, sign: s1.sign, house: s1.house }, months, events: ev };
  });
}

/** 자미두수 엔진 호출 — 확정된 양력 출생일을 그대로 iztro(bySolar)에 넣는다(공통 산출 정책, fortune/POLICY.md).
 *  iztro 가 내부에서 쓴 음력(엔진 음력, 중국식)과 한국 음력은 따로 보관하고, 둘이 다른 경계일이면 표시한다. */
export function ziweiCore({ y, m, d, hh, mm, gender }) {
  const zw = astro.bySolar(`${y}-${m}-${d}`, timeIndex(hh, mm), gender === 'male' ? '男' : '女', true, 'ko-KR'), kl = koLunar(y, m, d);
  const r = zw.rawDates && zw.rawDates.lunarDate, engineLunar = r ? { y: r.lunarYear, m: r.lunarMonth, d: r.lunarDay, leap: !!r.isLeap } : null;
  const mismatch = !!(kl && engineLunar && (kl.y !== engineLunar.y || kl.m !== engineLunar.m || kl.d !== engineLunar.d || kl.leap !== engineLunar.leap));
  return { zw, src: 'solar', kl, engineLunar, mismatch };
}

const SHICHEN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子(만)'];

/** input: { y, m, d, hh, mm, gender:'male'|'female', lat, lon } (양력, 한국 표준시 입력) */
export function calculate(input) {
  const { y, m, d, hh, mm, gender, lat, lon } = input, withTransit = input.transit !== false;
  const bz = eng.calculateBaziChart({ year: y, month: m, day: d, hour: hh, minute: mm, gender, longitude: lon, timezoneId: 'Asia/Seoul', enableTrueSolarTime: true, dayBoundaryMode: 'ZI_HOUR_23' });
  const DM = bz.dayMaster.char;
  const pillars = ['hour', 'day', 'month', 'year'].map((k) => {
    const p = bz.pillars[k];
    return { key: k, label: { hour: '시주', day: '일주', month: '월주', year: '년주' }[k], stem: p.stem, branch: p.branch,
      stemTG: k === 'day' ? '나(일간)' : (TG[p.stemTenGod] || p.stemTenGod),
      hidden: p.hiddenStems.map((h) => ({ s: h.stem, tg: TG[h.tenGod] || h.tenGod, main: h.isMain })) };
  });
  // 대운: 엔진은 첫 대운 시작 일시(startDate)와 10년 단위 주기를 준다. 각 대운의 시작 일자를 같이 둔다.
  const base = /^(\d+)-(\d+)-(\d+)/.exec(bz.daYun.startDate || '');
  const cycles = bz.daYun.cycles.slice(0, 8).map((c, i) => ({ age: c.startAge, endAge: c.endAge, endYear: c.endYear, year: c.startYear, gz: c.ganZhi, tg: TG[c.stemTenGod] || c.stemTenGod, from: base ? (+base[1] + 10 * i) + '-' + base[2] + '-' + base[3] : null }));
  const asOf = YEAR + '-01-01', cur = cycles.filter((c) => c.from && c.from <= asOf).slice(-1)[0] || null, nxt = cur ? cycles[cycles.indexOf(cur) + 1] : null;
  const luck2027 = { current: cur, next: nxt && nxt.from && +nxt.from.slice(0, 4) === YEAR ? nxt : null, switchDate: nxt && nxt.from && +nxt.from.slice(0, 4) === YEAR ? nxt.from : null };
  const sewoon = { ...SEWOON, tg: tenGod(DM, SEWOON.stem) };
  const relations = (bz.interactions || []).map((it) => { const mm2 = /\(([^)]*)\)/.exec(it.description || ''); return { text: (mm2 ? mm2[1] : it.type).replace(/\s*—.*$/, ''), where: (it.pillars || []).map((k) => PNAME[k] || k).join('·') }; });
  const kl = koLunar(y, m, d);

  // 자미두수: 한국 음력(한국천문연구원 자료 기반)을 기준으로 명반을 만든다. 범위 밖이면 엔진 기본(양력 입력)으로 대체.
  const zwT = timeIndex(hh, mm);
  // 자미두수는 확정된 양력 출생일을 그대로 iztro(bySolar)에 넣는다. iztro 가 내부에서 쓰는 음력(중국식)과 한국 음력은 따로 보관한다.
  const zz = ziweiCore({ y, m, d, hh, mm, gender }), zw = zz.zw, zwSrc = zz.src;
  const zwY = zw.horoscope(`${YEAR}-2-10`);
  const palaces = zw.palaces.map((p, i) => ({ name: p.name, stem: p.heavenlyStem, branch: p.earthlyBranch, range: p.decadal.range, dname: zwY.decadal.palaceNames[i], yname: zwY.yearly.palaceNames[i],
    major: p.majorStars.map((s) => ({ n: s.name, m: s.mutagen })), minor: p.minorStars.map((s) => ({ n: s.name, m: s.mutagen })), isBody: p.isBodyPalace }));
  const sanfang = {}; ['재백', '관록', '전택', '복덕'].forEach((n) => { try { const r = zw.surroundedPalaces(n); sanfang[n] = [r.opposite, r.wealth, r.career].map((x) => x && x.name).filter(Boolean); } catch (e) { sanfang[n] = []; } });
  const curDec = palaces.findIndex((p) => zwY.age && p.range[0] <= zwY.age.nominalAge && zwY.age.nominalAge <= p.range[1]);
  const ziwei = { calendarSource: zwSrc, engineLunar: zz.engineLunar, lunarMismatch: zz.mismatch, solarInput: { y, m, d }, palaces, sanfang, curDecadal: curDec, age: zwY.age ? zwY.age.nominalAge : null, mutagen: zwY.yearly.mutagen, decMutagen: zwY.decadal.mutagen, lunar: zw.lunarDate, soul: zw.earthlyBranchOfSoulPalace, body: zw.earthlyBranchOfBodyPalace, five: zw.fiveElementsClass };

  const hs = mkHs({ year: y, month: m - 1, date: d, hour: hh, minute: mm, latitude: lat, longitude: lon }, true);
  // 하우스는 라이브러리의 House.id 를 쓰지 않고 시작점(cusp) 기준으로 직접 판정한다.
  // (라이브러리는 12하우스가 0°를 가로지를 때 행성에 하우스를 주지 않아 약 3%의 출생 입력에서 오류가 났다.)
  const cuspLons = hs.Houses.map((h) => h.ChartPosition.StartPosition.Ecliptic.DecimalDegrees);
  const bodies = BODIES.map(([k, ko, gl]) => { const b = hs.CelestialBodies[k]; const l = b.ChartPosition.Ecliptic.DecimalDegrees; return { k, ko, gl, lon: l, sign: SIGN_KO[b.Sign.label], deg: b.ChartPosition.Ecliptic.ArcDegreesFormatted30, house: houseOf(l, cuspLons), retro: b.isRetrograde }; });
  const western = { bodies, cusps: cuspLons, houseSign: hs.Houses.map((h) => SIGN_KO[h.Sign.label]),
    asc: hs.Ascendant.ChartPosition.Ecliptic.DecimalDegrees, mc: hs.Midheaven.ChartPosition.Ecliptic.DecimalDegrees, mcSign: SIGN_KO[hs.Midheaven.Sign.label],
    transit: withTransit ? transits2027(cuspLons, lat, lon) : [], aspects: (hs.Aspects.all || []).filter((a) => BODIES.some((b) => b[0] === a.point1Key) && BODIES.some((b) => b[0] === a.point2Key)).map((a) => ({ a: a.point1Key, b: a.point2Key, t: a.aspectKey, orb: a.orb })) };

  const si = bz.solarTimeInfo; const tst = si ? { time: si.trueSolarTime, lonMin: Math.round(si.longitudeCorrectionMinutes), eotMin: Math.round(si.equationOfTimeMinutes) } : null;
  // 체계별 계산 기준·적용 기간 (화면·이미지·AI 프롬프트에 같이 전달한다)
  const s1 = koSolar(YEAR, 1, 1, false), s2 = koSolar(YEAR + 1, 1, 1, false), pd = (o) => (o ? o.y + '-' + pad2(o.m) + '-' + pad2(o.d) : '');
  const utc = hs.origin && hs.origin.utcTime && hs.origin.utcTime.format ? hs.origin.utcTime.format('YYYY-MM-DD HH:mm') : '';
  const basis = {
    saju: '진태양시 ' + (tst ? tst.time : '-') + ' 기준 · 자시 23시 경계 · 절기(입춘) 기준 연·월',
    ziwei: '입력한 시계 시각 ' + pad2(hh) + ':' + pad2(mm) + ' → ' + SHICHEN[zwT] + '시 · 양력 출생일을 자미두수 엔진(iztro)에 입력 → 엔진 음력(' + (zz.engineLunar ? zz.engineLunar.y + '.' + zz.engineLunar.m + '.' + zz.engineLunar.d + (zz.engineLunar.leap ? ' 윤달' : '') : '-') + ') 기준 명반' + (zz.mismatch ? ' · 한국 음력(' + kl.y + '.' + kl.m + '.' + kl.d + (kl.leap ? ' 윤달' : '') + ')과 날짜가 다른 경계일이에요(역법 적합성 검증 중)' : '') + ' · 윤달 보정 fixLeap',
    astro: '출생지 시간대 기준 UTC ' + utc + ' 환산 · 트로피컬 · 플라시더스',
    periods: { sewoon: '사주 세운·월운: 입춘 기준(2027년 2월 4일경 ~ 다음 입춘)', yearly: '자미두수 유년: 음력 설 기준(' + pd(s1) + ' ~ ' + pd(s2) + ' 전날)', transit: '점성술 트랜짓: 2027-01-01 ~ 2027-12-31 (한국 정오 기준)' },
  };
  // 이미지·AI 프롬프트에 쓰는 공개용 계산 기준: 출생 날짜·음력 날짜·UTC 일시를 뺀다.
  const basisPublic = { saju: '진태양시 보정 적용 · 자시 23시 경계 · 절기(입춘) 기준 연·월', ziwei: '입력한 시계 시각의 시진 · 양력 출생일을 엔진(iztro)에 입력해 엔진 음력(중국식) 기준 명반' + (zz.mismatch ? ' · 한국 음력과 다른 경계일(역법 적합성 검증 중)' : '') + ' · 윤달 보정 fixLeap', astro: '출생지 시간대 기준 UTC 환산 · 트로피컬 · 플라시더스', periods: basis.periods };
  const chart = { year: YEAR, kLunar: kl, basis, basisPublic, saju: { dm: DM, pillars, cycles, luck2027, sewoon, relations, lunar: kl, trueSolar: tst || null }, ziwei, western };
  chart.signals = deriveSignals(chart);
  return chart;
}
