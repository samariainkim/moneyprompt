/* 새해 재테크 운세 — 결과 화면(요약 → 세 가지 운명 지도 → 세 관점 해석 → AI 프롬프트 → 카드 공유).
   차트는 모두 SVG 로 그려 화면 표시·확대·이미지 저장에 같은 그림을 쓴다. 문장은 '시안 샘플', 근거 값은 실제 계산 결과. */
(function () {
  'use strict';
  var E, C, S, X, st = { noDates: false, tab: 'int', mode: 'y2027', topic: 'save', zwLayer: 'y2027', hl: true, astroLayer: 'y2027', ai2027: true, extra: '', pinfo: false, aiOk: false }, root;
  var FONT = "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif";
  var COL = { wood: '#3E8E5A', fire: '#D9503B', earth: '#B8893A', metal: '#7C8696', water: '#2F6BB5' };
  var EKO = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };
  var OR = '#BC6727', ORT = '#94582A', NAVY = '#27364D', MUT = '#6B6458', LINE = '#E7DFD2', CREAM = '#FBF1E6';
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function curLuck() { var l = C.saju.luck2027; return l && l.current; }
  function isCurLuck(c) { var cl = curLuck(); return !!cl && c.from === cl.from; }
  function isNextLuck(c) { var l = C.saju.luck2027; return !!(l && l.next && c.from === l.next.from); }
  function fromTxt(c) { return st.noDates || !c.from ? '' : c.from.replace(/-/g, '.'); }
  function isCai(tg) { return tg === '정재' || tg === '편재'; }
  function pHasCai(p) { return isCai(p.stemTG) || p.hidden.some(function (h) { return isCai(h.tg); }); }
  function svgWrap(vb, inner, label) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" role="img" aria-label="' + esc(label) + '" font-family="' + FONT + '"><rect x="-40" y="-40" width="500" height="520" fill="#FFFFFF"/>' + inner + '</svg>'; }
  function T(x, y, t, o) { o = o || {}; return '<text x="' + x + '" y="' + y + '" text-anchor="' + (o.a || 'middle') + '" font-size="' + (o.s || 12) + '" font-weight="' + (o.w || 600) + '" fill="' + (o.c || NAVY) + '"' + (o.ls ? ' letter-spacing="' + o.ls + '"' : '') + '>' + esc(t) + '</text>'; }

  /* ───── 차트 SVG ───── */
  function sajuSvg() {
    var s = C.saju, g = '', cnt = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    s.pillars.forEach(function (p) { cnt[E.EL_STEM[p.stem]]++; cnt[E.EL_BR[p.branch]]++; });
    s.pillars.forEach(function (p, i) {
      var x = 16 + i * 92, w = 84, cai = pHasCai(p), cx = x + w / 2;
      g += '<rect x="' + x + '" y="12" width="' + w + '" height="216" rx="14" fill="' + (cai ? CREAM : '#fff') + '" stroke="' + (cai ? OR : LINE) + '" stroke-width="' + (cai ? 2 : 1.5) + '"/>';
      g += T(cx, 32, p.label, { s: 12, w: 800, c: MUT }) + T(cx, 52, p.stemTG, { s: 12, w: isCai(p.stemTG) ? 900 : 600, c: isCai(p.stemTG) ? ORT : MUT });
      g += T(cx, 92, p.stem, { s: 36, w: 800, c: COL[E.EL_STEM[p.stem]] }) + T(cx, 134, p.branch, { s: 36, w: 800, c: COL[E.EL_BR[p.branch]] });
      g += '<line x1="' + (x + 10) + '" y1="148" x2="' + (x + w - 10) + '" y2="148" stroke="' + LINE + '"/>' + T(cx, 164, '지장간', { s: 10, c: MUT });
      p.hidden.forEach(function (h, j) { g += T(cx, 182 + j * 15, h.s + ' ' + h.tg, { s: 12, w: isCai(h.tg) ? 900 : 600, c: isCai(h.tg) ? ORT : NAVY }); });
    });
    g += T(16, 252, '오행 분포 (8글자)', { a: 'start', s: 12, w: 800, c: MUT });
    ['wood', 'fire', 'earth', 'metal', 'water'].forEach(function (e, i) { var x = 16 + i * 74; g += '<circle cx="' + (x + 6) + '" cy="272" r="6" fill="' + COL[e] + '"/>' + T(x + 18, 277, EKO[e] + ' ' + cnt[e], { a: 'start', s: 13, w: 800 }); });
    g += T(16, 308, '대운 흐름 (10년 단위)', { a: 'start', s: 12, w: 800, c: MUT });
    s.cycles.slice(1, 6).forEach(function (c, i) {
      var x = 16 + i * 74, now = isCurLuck(c);
      g += '<rect x="' + x + '" y="318" width="68" height="58" rx="12" fill="' + (now ? CREAM : '#fff') + '" stroke="' + (now ? OR : LINE) + '" stroke-width="' + (now ? 2 : 1.5) + '"/>' + T(x + 34, 336, c.age + '세 · ' + c.year, { s: 10, c: MUT }) + T(x + 34, 358, c.gz, { s: 18, w: 800 }) + T(x + 34, 371, c.tg, { s: 10, c: now ? ORT : MUT, w: 700 });
    });
    if (st.mode === 'y2027') g += '<rect x="16" y="390" width="368" height="34" rx="17" fill="' + NAVY + '"/>' + T(200, 412, '2027 정미년 세운 · ' + s.sewoon.gz + ' (' + s.sewoon.tg + ')', { s: 13, w: 800, c: '#fff' });
    return svgWrap('0 0 400 ' + (st.mode === 'y2027' ? 436 : 392), g, '사주 만세력');
  }
  function ziweiSvg() {
    var z = C.ziwei, cells = {}, g = '', yMut = ['록', '권', '과', '기'], y27 = st.mode === 'y2027';
    z.palaces.forEach(function (p) { cells[E.GRID[p.branch].join(',')] = p; });
    var WL = E.ZW_WEALTH.map(function (x) { return x[0]; });
    for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) {
      if ((r === 1 || r === 2) && (c === 1 || c === 2)) continue;
      var p = cells[r + ',' + c], x = 6 + c * 98, y = 6 + r * 98, w = st.hl && WL.indexOf(p.name) >= 0;
      g += '<rect x="' + x + '" y="' + y + '" width="94" height="94" rx="10" fill="' + (w ? CREAM : '#fff') + '" stroke="' + (w ? OR : LINE) + '" stroke-width="' + (w ? 2 : 1.2) + '"/>';
      g += T(x + 7, y + 17, p.name, { a: 'start', s: 11, w: 900, c: w ? ORT : MUT }) + T(x + 88, y + 17, p.stem + p.branch, { a: 'end', s: 10, c: MUT });
      p.major.forEach(function (s, i) {
        var b = ''; if (y27) { var k = z.mutagen.indexOf(s.n); if (k >= 0) b = yMut[k]; } else if (s.m) b = s.m;
        g += T(x + 7, y + 38 + i * 16, s.n, { a: 'start', s: 13, w: 800 });
        if (b) g += '<circle cx="' + (x + 7 + s.n.length * 13 + 11) + '" cy="' + (y + 34 + i * 16) + '" r="7" fill="' + (b === '기' ? '#D9503B' : OR) + '"/>' + T(x + 7 + s.n.length * 13 + 11, y + 38 + i * 16, b, { s: 9, w: 900, c: '#fff' });
      });
      if (!p.major.length) g += T(x + 7, y + 40, '주성 없음', { a: 'start', s: 11, c: '#B5AFA3' });
      if (p.isBody) g += T(x + 88, y + 88, '신궁', { a: 'end', s: 9, w: 800, c: ORT });
    }
    g += '<rect x="104" y="104" width="190" height="190" rx="14" fill="' + NAVY + '"/>' + T(199, 134, z.five, { s: 13, w: 800, c: '#E5B98A' }) + T(199, 156, '명궁 ' + z.soul + ' · 신궁 ' + z.body, { s: 13, w: 700, c: '#fff' });
    g += T(199, 186, y27 ? '2027 유년 사화' : '생년 사화', { s: 12, w: 800, c: '#E5B98A' });
    var lines = []; if (y27) z.mutagen.forEach(function (n, i) { lines.push('화' + yMut[i] + ' ' + n); }); else z.palaces.forEach(function (p) { p.major.forEach(function (s) { if (s.m) lines.push('화' + s.m + ' ' + s.n); }); });
    lines.slice(0, 4).forEach(function (l, i) { g += T(199, 210 + i * 20, l, { s: 14, w: 800, c: '#fff' }); });
    return svgWrap('0 0 400 400', g, '자미두수 명반');
  }
  function astroSvgInner(y27, withAsp) {
    var w = C.western, rot = 180 - w.asc, g = '';
    function pt(lon, r) { var a = (lon + rot) * Math.PI / 180; return [170 + r * Math.cos(-a), 170 + r * Math.sin(-a)]; }
    g += '<circle cx="170" cy="170" r="150" fill="#fff" stroke="' + NAVY + '" stroke-width="1.5"/><circle cx="170" cy="170" r="108" fill="none" stroke="' + LINE + '"/>';
    for (var i = 0; i < 12; i++) { var a = pt(i * 30, 108), b = pt(i * 30, 150), m = pt(i * 30 + 15, 129); g += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + LINE + '"/>' + T(m[0], m[1] + 6, E.SIGN_GL[i], { s: 17, c: MUT, w: 400 }); }
    w.cusps.forEach(function (c, i) { var a = pt(c, 40), b = pt(c, 108), hl = [1, 4, 7, 9].indexOf(i) >= 0; g += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + (hl ? OR : '#CFC6B6') + '" stroke-width="' + (hl ? 2.2 : 1) + '"/>'; var n = pt(c + 12, 96); g += T(n[0], n[1] + 4, i + 1, { s: 10, w: 800, c: hl ? ORT : '#A8A196' }); });
    if (withAsp) w.aspects.forEach(function (q) { var A = w.bodies.filter(function (b) { return b.k === q.a; })[0], B = w.bodies.filter(function (b) { return b.k === q.b; })[0]; if (!A || !B) return; var p1 = pt(A.lon, 50), p2 = pt(B.lon, 50), col = q.t === 'trine' || q.t === 'sextile' ? '#2F6BB5' : q.t === 'conjunction' ? '#9A9285' : '#D9503B'; g += '<line x1="' + p1[0] + '" y1="' + p1[1] + '" x2="' + p2[0] + '" y2="' + p2[1] + '" stroke="' + col + '" stroke-width="1" opacity=".55"/>'; });
    w.bodies.forEach(function (bd) { var q = pt(bd.lon, 72), wp = ['jupiter', 'saturn', 'venus'].indexOf(bd.k) >= 0; g += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="13" fill="' + (wp ? CREAM : '#fff') + '" stroke="' + (wp ? OR : '#CFC6B6') + '"/>' + T(q[0], q[1] + 5, bd.gl, { s: 14, w: 400 }); });
    if (y27) w.transit.forEach(function (t) {
      var p1 = pt(t.start.lon, 160), p2 = pt(t.end.lon, 160), l1 = pt(t.start.lon, 178), sweep = ((t.end.lon - t.start.lon + 360) % 360) > 0 ? 0 : 1;
      g += '<path d="M' + p1[0] + ' ' + p1[1] + ' A160 160 0 0 ' + sweep + ' ' + p2[0] + ' ' + p2[1] + '" fill="none" stroke="' + OR + '" stroke-width="3" stroke-linecap="round" opacity=".55"/><circle cx="' + p1[0] + '" cy="' + p1[1] + '" r="5.5" fill="#fff" stroke="' + OR + '" stroke-width="2"/><circle cx="' + p2[0] + '" cy="' + p2[1] + '" r="5.5" fill="' + OR + '"/>' + T(l1[0], l1[1] + 4, t.ko, { s: 11, w: 800, c: ORT });
    });
    return '<rect x="-34" y="-34" width="408" height="408" fill="#fff"/>' + g;
  }
  function astroSvg() { return svgWrap('-34 -34 408 408', astroSvgInner(st.mode === 'y2027', false), '점성 차트'); }
  var SVG = { saju: sajuSvg, ziwei: ziweiSvg, astro: astroSvg };

  /* ───── 풀버전 명반 섹션(폭 440 기준 SVG 조각) — 화면 표시와 이미지 저장이 같은 조각을 쓴다 ───── */
  var W = 440, STEMS = '甲乙丙丁戊己庚辛壬癸', BRS = '子丑寅卯辰巳午未申酉戌亥';
  var GL = { conjunction: ['☌', '#27364D'], sextile: ['⚹', '#2F6BB5'], square: ['□', '#D9503B'], trine: ['△', '#2F6BB5'], opposition: ['☍', '#D9503B'] };
  var PK = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  function sec(h, inner) { return { h: h, svg: inner }; }
  function secSvg(sc, w) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + sc.h + '" role="img" font-family="' + FONT + '"' + (w ? ' width="' + w + '"' : '') + '><rect width="' + W + '" height="' + sc.h + '" fill="#fff"/>' + sc.svg + '</svg>'; }
  function box(x, y, w, h, o) { o = o || {}; return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (o.r || 10) + '" fill="' + (o.f || '#fff') + '" stroke="' + (o.s || LINE) + '" stroke-width="' + (o.sw || 1.2) + '"/>'; }
  function degS(lon) { var d = ((lon % 360) + 360) % 360, s = d % 30; return Math.floor(s) + '°' + String(Math.round((s % 1) * 60)).padStart(2, '0') + "'"; }
  function signOf(lon) { return E.SIGN_GL[Math.floor((((lon % 360) + 360) % 360) / 30)] + ' ' + ['양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리', '천칭자리', '전갈자리', '사수자리', '염소자리', '물병자리', '물고기자리'][Math.floor((((lon % 360) + 360) % 360) / 30)]; }
  function gzOfYear(y) { var i = ((y - 4) % 60 + 60) % 60; return STEMS[i % 10] + BRS[i % 12]; }
  function tbl(cols, rows, o) {
    o = o || {}; var rh = o.rh || 26, hh = 26, y0 = 0, g = '', x = 0, xs = [];
    cols.forEach(function (c) { xs.push(x); x += c.w; });
    g += '<rect x="0" y="0" width="' + W + '" height="' + hh + '" rx="8" fill="#F7F2E9"/>';
    cols.forEach(function (c, i) { g += T(c.a === 'start' ? xs[i] + 8 : xs[i] + c.w / 2, 17, c.h, { a: c.a === 'start' ? 'start' : 'middle', s: 11, w: 800, c: MUT }); });
    rows.forEach(function (r, j) {
      var y = hh + j * rh, hl = r.hl; g += hl ? '<rect x="0" y="' + y + '" width="' + W + '" height="' + rh + '" fill="' + CREAM + '"/>' : '';
      g += '<line x1="0" y1="' + (y + rh) + '" x2="' + W + '" y2="' + (y + rh) + '" stroke="' + LINE + '"/>';
      r.c.forEach(function (cell, i) { var o2 = typeof cell === 'object' ? cell : { t: cell }; g += T(cols[i].a === 'start' ? xs[i] + 8 : xs[i] + cols[i].w / 2, y + rh / 2 + 4.5, o2.t, { a: cols[i].a === 'start' ? 'start' : 'middle', s: o2.s || 12, w: o2.w || 700, c: o2.c || NAVY }); });
    });
    return sec(hh + rows.length * rh + 4, g);
  }
  function birthLines(personal) {
    var s = C.saju, L = [], lu = s.lunar;
    var sol = S.conv || { y: S.y, m: S.m, d: S.d };
    L.push('양력 ' + sol.y + '.' + String(sol.m).padStart(2, '0') + '.' + String(sol.d).padStart(2, '0') + ' ' + String(S.hh).padStart(2, '0') + ':' + String(S.mm).padStart(2, '0') + ' (한국 표준시 입력)');
    if (lu) L.push('음력(한국 기준) ' + lu.y + '.' + String(lu.m).padStart(2, '0') + '.' + String(lu.d).padStart(2, '0') + (lu.leap ? ' (윤달)' : ''));
    if (s.trueSolar) L.push('사주 시각: 진태양시 ' + s.trueSolar.time + ' (경도 보정 ' + s.trueSolar.lonMin + '분, 균시차 ' + (s.trueSolar.eotMin >= 0 ? '+' : '') + s.trueSolar.eotMin + '분) · 자시 23시 기준');
    if (personal) { L.push('출생지 ' + (S.place ? S.place.label : '-') + ' · ' + (S.gender === 'male' ? '남성' : '여성') + (S.name ? ' · ' + S.name : '')); }
    return L;
  }
  function basisLines(k, pub) {
    var b = pub ? C.basisPublic : C.basis, B = { saju: [b.saju, b.periods.sewoon, '십성은 일간(' + C.saju.dm + ') 기준 · 대운 나이는 엔진 기준(시작 일자 병기), 자미두수 대한은 세는나이(허수)와 달라요'], ziwei: [b.ziwei, b.periods.yearly, '사화·유년은 엔진(iztro) 기본 학파 기준 · 베트남식 기준과의 일치는 검증 중이에요'], astro: [b.astro, b.periods.transit, '애스펙트는 주요 5종(합·섹스타일·스퀘어·트라인·오포지션) · 트랜짓은 목성·토성만 계산해요'] };
    return B[k];
  }

  function sajuSections() {
    var s = C.saju, out = [], x0 = 56, cw = 93, g = '', cnt = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    s.pillars.forEach(function (p) { cnt[E.EL_STEM[p.stem]]++; cnt[E.EL_BR[p.branch]]++; });
    // 명식표
    var rows = [['천간 십성', 28], ['천간', 58], ['지지', 58], ['지장간', 68]], ys = [], y = 8; rows.forEach(function (r) { ys.push(y); y += r[1] + 4; });
    rows.forEach(function (r, i) { g += T(4, ys[i] + r[1] / 2 + 4, r[0], { a: 'start', s: 11, w: 800, c: MUT }); });
    s.pillars.forEach(function (p, i) {
      var x = x0 + i * cw, cx = x + (cw - 6) / 2, cai = pHasCai(p);
      g += '<text x="' + cx + '" y="0"></text>';
      g += box(x, 8 - 6, cw - 6, y - 8 + 8, { f: cai && st.hl ? CREAM : '#fff', s: cai && st.hl ? OR : LINE, sw: cai && st.hl ? 2 : 1.2, r: 12 });
      g += T(cx, -0, '', {});
      g += T(cx, ys[0] + 18, p.stemTG, { s: 13, w: isCai(p.stemTG) && st.hl ? 900 : 700, c: isCai(p.stemTG) && st.hl ? ORT : NAVY });
      g += T(cx, ys[1] + 42, p.stem, { s: 38, w: 800, c: COL[E.EL_STEM[p.stem]] }) + T(cx, ys[2] + 42, p.branch, { s: 38, w: 800, c: COL[E.EL_BR[p.branch]] });
      p.hidden.forEach(function (h, j) { g += T(cx, ys[3] + 18 + j * 19, h.s + ' ' + h.tg, { s: 12.5, w: isCai(h.tg) && st.hl ? 900 : 600, c: isCai(h.tg) && st.hl ? ORT : NAVY }); });
      g += T(cx, 2, '', {});
    });
    // 열 머리(시·일·월·년) — 표 위에 다시 그린다
    var head = ''; s.pillars.forEach(function (p, i) { head += T(x0 + i * cw + (cw - 6) / 2, 20, p.label, { s: 12.5, w: 800, c: MUT }); });
    var shift = 30; g = '<g transform="translate(0,' + shift + ')">' + g + '</g>' + head;
    out.push(sec(y + shift + 8, g));
    // 오행 분포 / 합충 / 대운 / 세운 / 월운 (각각 별도 조각)
    g = T(4, 18, '오행 분포 (8글자)', { a: 'start', s: 12, w: 800, c: MUT });
    ['wood', 'fire', 'earth', 'metal', 'water'].forEach(function (e, i) { var x = 8 + i * 84; g += '<circle cx="' + (x + 6) + '" cy="40" r="6" fill="' + COL[e] + '"/>' + T(x + 18, 45, EKO[e] + ' ' + cnt[e], { a: 'start', s: 14, w: 800 }); });
    out.push(sec(58, g));
    g = T(4, 18, '합·충 등 관계 (엔진 감지)', { a: 'start', s: 12, w: 800, c: MUT });
    var rel = s.relations.length ? s.relations : [{ text: '뚜렷한 관계 없음', where: '' }];
    rel.forEach(function (r, i) { g += T(8, 40 + i * 20, r.text + (r.where ? '  ·  ' + r.where : ''), { a: 'start', s: 13, w: 700 }); });
    out.push(sec(48 + rel.length * 20, g));
    g = T(4, 18, '대운 (10년 단위) · 첫 대운 ' + (s.cycles[0] ? s.cycles[0].age + '세' : '') + (s.luck2027 && s.luck2027.switchDate ? ' · 2027년 중 대운 전환' : ''), { a: 'start', s: 12, w: 800, c: MUT });
    s.cycles.slice(0, 8).forEach(function (c, i) {
      var x = 8 + (i % 4) * 106, y = 30 + Math.floor(i / 4) * 80, now = isCurLuck(c), nx = isNextLuck(c);
      g += box(x, y, 100, 72, { f: now ? CREAM : '#fff', s: now ? OR : (nx ? '#E5B98A' : LINE), sw: now ? 2 : (nx ? 1.8 : 1.2), r: 12 }) + T(x + 50, y + 16, c.age + '~' + (c.endAge || c.age + 9) + '세', { s: 11, w: 700, c: MUT }) + T(x + 50, y + 30, fromTxt(c) ? fromTxt(c) + ' 시작' : (c.year + '~' + (c.endYear || c.year + 9)), { s: 10, c: MUT }) + T(x + 50, y + 54, c.gz, { s: 22, w: 800 }) + T(x + 50, y + 67, c.tg + (now ? ' · 2027 초' : nx ? ' · 2027 중 전환' : ''), { s: 10.5, w: 800, c: now || nx ? ORT : MUT });
    });
    out.push(sec(196, g));
    g = T(4, 18, '세운 (연도별)', { a: 'start', s: 12, w: 800, c: MUT });
    [2025, 2026, 2027, 2028, 2029].forEach(function (yr, i) {
      var gz = gzOfYear(yr), now = yr === 2027, x = 8 + i * 84;
      g += box(x, 30, 78, 64, { f: now ? CREAM : '#fff', s: now ? OR : LINE, sw: now ? 2 : 1.2, r: 12 }) + T(x + 39, 46, yr, { s: 11, w: 700, c: MUT }) + T(x + 39, 70, gz, { s: 22, w: 800 }) + T(x + 39, 87, E.tenGod(s.dm, gz[0]), { s: 11, w: 800, c: now ? ORT : MUT });
    });
    out.push(sec(104, g));
    var ys27 = { 甲: '丙', 己: '丙', 乙: '戊', 庚: '戊', 丙: '庚', 辛: '庚', 丁: '壬', 壬: '壬', 戊: '甲', 癸: '甲' }[gzOfYear(2027)[0]], mb = '寅卯辰巳午未申酉戌亥子丑';
    g = T(4, 18, '2027년 월운 (절기 기준 월)', { a: 'start', s: 12, w: 800, c: MUT });
    for (var m = 0; m < 12; m++) { var st2 = STEMS[(STEMS.indexOf(ys27) + m) % 10], x2 = 8 + (m % 4) * 106, y2 = 30 + Math.floor(m / 4) * 54; g += box(x2, y2, 100, 48, { r: 10 }) + T(x2 + 50, y2 + 18, mb[m] + '月', { s: 11, w: 700, c: MUT }) + T(x2 + 50, y2 + 38, st2 + mb[m] + ' · ' + E.tenGod(s.dm, st2), { s: 13, w: 800 }); }
    g += T(4, 206, '월운은 입춘(2월초)부터 시작하는 절기 기준 12개월이며, 양력 날짜는 해마다 조금씩 달라요.', { a: 'start', s: 10.5, w: 500, c: MUT });
    out.push(sec(216, g));
    return out;
  }

  function ziweiSections() {
    var z = C.ziwei, out = [], cells = {}, g = '', yMut = ['록', '권', '과', '기'], y27 = st.zwLayer === 'y2027', WLn = E.ZW_WEALTH.map(function (x) { return x[0]; }), cs = 104;
    z.palaces.forEach(function (p, i) { cells[E.GRID[p.branch].join(',')] = { p: p, i: i }; });
    var focus = {}; if (st.hl) WLn.forEach(function (n) { focus[n] = 1; });
    for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) {
      if ((r === 1 || r === 2) && (c === 1 || c === 2)) continue;
      var o = cells[r + ',' + c], p = o.p, x = 4 + c * (cs + 4), y = 4 + r * (cs + 4), w = focus[p.name], cur = z.curDecadal === o.i;
      g += box(x, y, cs, cs, { f: w ? CREAM : '#fff', s: w ? OR : LINE, sw: w ? 2 : 1.2, r: 9 });
      g += T(x + 6, y + 15, p.name + '궁', { a: 'start', s: 11, w: 900, c: w ? ORT : NAVY }) + T(x + cs - 6, y + 15, p.stem + p.branch, { a: 'end', s: 10, c: MUT });
      p.major.forEach(function (s, i) {
        var b = ''; if (y27) { var k = z.mutagen.indexOf(s.n); if (k >= 0) b = yMut[k]; } else if (s.m) b = s.m;
        g += T(x + 6, y + 33 + i * 15, s.n, { a: 'start', s: 13, w: 800 });
        if (b) g += '<circle cx="' + (x + 6 + s.n.length * 13 + 10) + '" cy="' + (y + 29 + i * 15) + '" r="6.5" fill="' + (b === '기' ? '#D9503B' : OR) + '"/>' + T(x + 6 + s.n.length * 13 + 10, y + 32.5 + i * 15, b, { s: 8.5, w: 900, c: '#fff' });
      });
      if (!p.major.length) g += T(x + 6, y + 34, '주성 없음', { a: 'start', s: 10, c: '#B5AFA3' });
      p.minor.slice(0, 4).forEach(function (s, i) { var mm = ''; g += T(x + 6, y + 66 + i * 10, s.n, { a: 'start', s: 9, w: 600, c: MUT }); });
      g += T(x + cs - 6, y + cs - 5, p.range[0] + '~' + p.range[1] + (cur ? ' ★' : ''), { a: 'end', s: 9.5, w: cur ? 900 : 600, c: cur ? ORT : MUT });
      if (y27) g += T(x + cs - 6, y + 26, p.yname, { a: 'end', s: 8.5, w: 700, c: '#2F6BB5' });
      if (p.isBody) g += T(x + cs - 6, y + cs - 16, '신궁', { a: 'end', s: 9, w: 800, c: ORT });
    }
    var cx0 = 4 + cs + 4, cw2 = 2 * cs + 4;
    g += '<rect x="' + cx0 + '" y="' + cx0 + '" width="' + cw2 + '" height="' + cw2 + '" rx="12" fill="' + NAVY + '"/>';
    g += T(cx0 + cw2 / 2, cx0 + 24, '紫微斗數 명반', { s: 13, w: 800, c: '#E5B98A' }) + T(cx0 + cw2 / 2, cx0 + 46, z.five + ' · 명궁 ' + z.soul + ' · 신궁 ' + z.body, { s: 12.5, w: 700, c: '#fff' });
    var bm = {}; z.palaces.forEach(function (p) { p.major.forEach(function (s) { if (s.m) bm[s.m] = s.n; }); });
    function four(map) { return ['록', '권', '과', '기'].map(function (m) { return '화' + m + ' ' + (map[m] || '-'); }); }
    var ym = {}; z.mutagen.forEach(function (n, i) { ym[yMut[i]] = n; });
    g += T(cx0 + cw2 / 2, cx0 + 70, '생년 사화', { s: 11, w: 800, c: '#E5B98A' });
    four(bm).forEach(function (l, i) { g += T(cx0 + 26 + (i % 2) * 78 + 39, cx0 + 88 + Math.floor(i / 2) * 16, l, { s: 11.5, w: 700, c: '#fff' }); });
    g += T(cx0 + cw2 / 2, cx0 + 132, '2027 유년 사화', { s: 11, w: 800, c: '#E5B98A' });
    four(ym).forEach(function (l, i) { g += T(cx0 + 26 + (i % 2) * 78 + 39, cx0 + 150 + Math.floor(i / 2) * 16, l, { s: 11.5, w: 700, c: '#fff' }); });
    g += T(cx0 + cw2 / 2, cx0 + 192, (z.curDecadal >= 0 ? '현재 대한 ' + z.palaces[z.curDecadal].range[0] + '~' + z.palaces[z.curDecadal].range[1] + '세 (' + z.age + '세)' : ''), { s: 11, w: 700, c: '#CBD5E6' }) + T(cx0 + cw2 / 2, cx0 + 206, '★ 현재 대한 · 파란 글씨: 2027 유년 12궁', { s: 9.5, w: 500, c: '#9FB0CC' });
    out.push(sec(4 * (cs + 4) + 4, g));
    // 재물 관련 주요 궁
    var rows = E.ZW_WEALTH.map(function (zw) { var p = z.palaces.filter(function (q) { return q.name === zw[0]; })[0]; return { c: [{ t: zw[0] + '궁', w: 900, c: ORT }, p.stem + p.branch, (p.major.map(function (s) { return s.n + (s.m ? '(화' + s.m + ')' : ''); }).join('·') || '주성 없음'), (z.sanfang[zw[0]] || []).join('·')] }; });
    out.push(tbl([{ h: '궁', w: 70 }, { h: '간지', w: 60 }, { h: '주성(생년 사화)', w: 180 }, { h: '삼방사정', w: 130 }], rows, { rh: 30 }));
    // 사화 표
    function where(n) { var q = z.palaces.filter(function (p) { return p.major.concat(p.minor).some(function (s) { return s.n === n; }); })[0]; return q ? n + '(' + q.name + ')' : n; }
    var birthM = {}; z.palaces.forEach(function (p) { p.major.forEach(function (s) { if (s.m) birthM[s.m] = where(s.n); }); });
    out.push(tbl([{ h: '구분', w: 76, a: 'start' }, { h: '화록', w: 91 }, { h: '화권', w: 91 }, { h: '화과', w: 91 }, { h: '화기', w: 91 }], [
      { c: ['생년', birthM['록'] || '-', birthM['권'] || '-', birthM['과'] || '-', birthM['기'] || '-'].map(function (t, i) { return i ? { t: t, s: 11 } : t; }) },
      { c: ['대한'].concat((z.decMutagen || []).map(function (n) { return { t: where(n), s: 11 }; })), hl: false },
      { c: ['2027 유년'].concat(z.mutagen.map(function (n) { return { t: where(n), s: 11 }; })), hl: true }], { rh: 28 }));
    // 대한 표
    var ord = z.palaces.map(function (p, i) { return { p: p, i: i }; }).sort(function (a, b) { return a.p.range[0] - b.p.range[0]; });
    out.push(tbl([{ h: '나이', w: 70 }, { h: '본명 궁', w: 80 }, { h: '간지', w: 60 }, { h: '주성', w: 230, a: 'start' }], ord.map(function (o) { var cur = o.i === z.curDecadal; return { hl: cur, c: [{ t: o.p.range[0] + '~' + o.p.range[1] + (cur ? ' ★' : ''), w: cur ? 900 : 700 }, o.p.name + '궁', o.p.stem + o.p.branch, { t: (o.p.major.map(function (s) { return s.n; }).join('·') || '주성 없음'), s: 11.5 }] }; }), { rh: 25 }));
    return out;
  }

  function astroSections() {
    var w = C.western, out = [], g = '', tr = st.astroLayer === 'y2027';
    var inner = astroSvgInner(tr, true);
    out.push(sec(440, '<svg x="0" y="0" width="440" height="440" viewBox="-34 -34 408 408">' + inner + '</svg>'));
    var dsc = (w.asc + 180) % 360, ic = (w.mc + 180) % 360;
    out.push(tbl([{ h: '주요 지점', w: 110, a: 'start' }, { h: '별자리', w: 170 }, { h: '도수', w: 160 }], [['ASC (상승점)', w.asc], ['DSC (하강점)', dsc], ['MC (천정)', w.mc], ['IC (천저)', ic]].map(function (a) { return { c: [{ t: a[0], a: 'start' }, signOf(a[1]), degS(a[1])] }; }), { rh: 26 }));
    out.push(tbl([{ h: '행성', w: 100, a: 'start' }, { h: '별자리', w: 130 }, { h: '도수', w: 80 }, { h: '하우스', w: 70 }, { h: '역행', w: 60 }], w.bodies.map(function (b) { var wp = ['jupiter', 'saturn', 'venus'].indexOf(b.k) >= 0; return { hl: st.hl && wp, c: [{ t: b.gl + ' ' + b.ko, a: 'start', w: 800 }, b.sign, degS(b.lon), b.house + 'H', b.retro ? '℞' : ''] }; }), { rh: 26 }));
    out.push(tbl([{ h: '하우스', w: 80, a: 'start' }, { h: '시작점(별자리)', w: 160 }, { h: '도수', w: 70 }, { h: '재물 관련 의미', w: 130, a: 'start' }], w.cusps.map(function (c, i) { var m = E.AS_WEALTH.filter(function (x) { return x[0] === i + 1; })[0]; return { hl: st.hl && !!m, c: [{ t: (i + 1) + '하우스', a: 'start', w: 800 }, signOf(c), degS(c), { t: m ? m[1] : '', a: 'start', s: 11, c: ORT }] }; }), { rh: 25 }));
    // 애스펙트 매트릭스
    var cs = 36, g2 = '', k = 0; g2 += T(4, 18, '애스펙트 매트릭스 (주요 5종 · 숫자는 오브)', { a: 'start', s: 12, w: 800, c: MUT });
    var ox = 40, oy = 54;
    PK.forEach(function (a, i) { var bd = w.bodies.filter(function (b) { return b.k === a; })[0]; g2 += T(ox + i * cs + cs / 2, oy - 6, bd.gl, { s: 14, w: 400 }) + T(ox - 14, oy + i * cs + cs / 2 + 5, bd.gl, { s: 14, w: 400 }); });
    for (var i2 = 0; i2 < 10; i2++) for (var j2 = 0; j2 < 10; j2++) {
      if (j2 > i2) continue; var x = ox + j2 * cs, y = oy + i2 * cs; g2 += '<rect x="' + x + '" y="' + y + '" width="' + cs + '" height="' + cs + '" fill="' + (i2 === j2 ? '#F7F2E9' : '#fff') + '" stroke="' + LINE + '"/>';
      if (i2 !== j2) { var asp = w.aspects.filter(function (q) { return (q.a === PK[i2] && q.b === PK[j2]) || (q.a === PK[j2] && q.b === PK[i2]); })[0]; if (asp && GL[asp.t]) g2 += T(x + cs / 2, y + 20, GL[asp.t][0], { s: 17, w: 700, c: GL[asp.t][1] }) + T(x + cs / 2, y + 31, asp.orb.toFixed(1), { s: 8, c: MUT, w: 600 }); }
    }
    g2 += T(4, oy + 10 * cs + 22, '☌ 합  ⚹ 섹스타일  □ 스퀘어  △ 트라인  ☍ 오포지션', { a: 'start', s: 11, w: 700, c: MUT });
    out.push(sec(oy + 10 * cs + 34, g2));
    out.push(tbl([{ h: '2027 트랜짓', w: 92, a: 'start' }, { h: '연초 (1/1)', w: 130 }, { h: '연말 (12/31)', w: 130 }, { h: '출생 하우스', w: 88 }], w.transit.map(function (t) { return { c: [{ t: t.ko, a: 'start', w: 800 }, t.start.sign + ' ' + degS(t.start.lon), t.end.sign + ' ' + degS(t.end.lon), t.start.house + 'H → ' + t.end.house + 'H'] }; }), { rh: 28 }));
    // 2027 트랜짓 — 월별 위치 / 별자리·하우스 진입 및 순행·역행 전환 (한국 정오 기준, 일 단위)
    var rowsM = []; for (var mo = 0; mo < 12; mo++) { var jm = w.transit[0].months[mo], sm = w.transit[1].months[mo]; rowsM.push({ c: [{ t: (mo + 1) + '월 1일', a: 'start', w: 700 }, { t: jm.sign.replace('자리', '') + ' ' + degS(jm.lon) + ' ' + jm.house + 'H' + (jm.retro ? ' ℞' : ''), s: 11.5 }, { t: sm.sign.replace('자리', '') + ' ' + degS(sm.lon) + ' ' + sm.house + 'H' + (sm.retro ? ' ℞' : ''), s: 11.5 }] }); }
    out.push(tbl([{ h: '월별 위치', w: 80, a: 'start' }, { h: '목성 (별자리·도수·하우스)', w: 180 }, { h: '토성', w: 180 }], rowsM, { rh: 25 }));
    var evs = w.transit[0].events.concat(w.transit[1].events).sort(function (a, b) { return a.doy - b.doy; });
    out.push(tbl([{ h: '날짜', w: 100, a: 'start' }, { h: '이동·전환', w: 340, a: 'start' }], (evs.length ? evs : [{ date: '-', text: '2027년 중 별자리·하우스 이동 없음' }]).map(function (e) { return { c: [{ t: e.date, a: 'start', w: 700 }, { t: e.text, a: 'start', w: 700 }] }; }), { rh: 26 }));
    return out;
  }
  function sections(k) { return k === 'saju' ? sajuSections() : k === 'ziwei' ? ziweiSections() : astroSections(); }
  /* ───── 데이터 텍스트(복사·AI 프롬프트 공용) — 이름·생년월일은 넣지 않는다 ───── */
  function dataText(k, y27) {
    var s = C.saju, z = C.ziwei, w = C.western, L = [];
    if (k === 'saju') {
      L.push('사주팔자 (시·일·월·년): ' + s.pillars.map(function (p) { return p.label + ' ' + p.stem + p.branch; }).join(', ') + ' / 일간 ' + s.dm);
      L.push('십성(천간): ' + s.pillars.map(function (p) { return p.label + ' ' + p.stemTG; }).join(', '));
      L.push('지장간: ' + s.pillars.map(function (p) { return p.label + ' ' + p.hidden.map(function (h) { return h.s + '(' + h.tg + ')'; }).join(' '); }).join(' / '));
      var cnt = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }; s.pillars.forEach(function (p) { cnt[E.EL_STEM[p.stem]]++; cnt[E.EL_BR[p.branch]]++; });
      L.push('오행 분포(8글자): ' + ['wood', 'fire', 'earth', 'metal', 'water'].map(function (e) { return EKO[e] + ' ' + cnt[e]; }).join(', '));
      L.push('합·충 등 관계: ' + (s.relations.map(function (r) { return r.text + '(' + r.where + ')'; }).join(', ') || '없음'));
      L.push('대운(시작 나이 기준): ' + s.cycles.slice(0, 8).map(function (c) { return c.age + '세 ' + c.gz + '(' + c.tg + ')'; }).join(', '));
      if (y27 && s.luck2027 && s.luck2027.current) L.push('2027년 초 적용 대운: ' + s.luck2027.current.gz + '(' + s.luck2027.current.tg + ')' + (s.luck2027.next ? ' → 2027년 ' + (+s.luck2027.switchDate.slice(5, 7)) + '월경 ' + s.luck2027.next.gz + '(' + s.luck2027.next.tg + ')로 전환' : ''));
      if (s.trueSolar) L.push('시각 기준: 진태양시 ' + s.trueSolar.time + ', 자시 23시 기준');
      if (y27) { var ys27 = { 甲: '丙', 己: '丙', 乙: '戊', 庚: '戊', 丙: '庚', 辛: '庚', 丁: '壬', 壬: '壬', 戊: '甲', 癸: '甲' }[gzOfYear(2027)[0]], mb = '寅卯辰巳午未申酉戌亥子丑', ms = []; for (var m = 0; m < 12; m++) { var st2 = STEMS[(STEMS.indexOf(ys27) + m) % 10]; ms.push(st2 + mb[m] + '(' + E.tenGod(s.dm, st2) + ')'); }
        L.push('2027 세운: ' + s.sewoon.gz + '(' + s.sewoon.tg + ') / 2025~2029 세운: ' + [2025, 2026, 2027, 2028, 2029].map(function (y) { return gzOfYear(y) + '(' + E.tenGod(s.dm, gzOfYear(y)[0]) + ')'; }).join(', ')); L.push('2027 월운(절기 기준 인월~축월): ' + ms.join(', ')); }
    } else if (k === 'ziwei') {
      L.push('오행국: ' + z.five + ', 명궁 ' + z.soul + ', 신궁 ' + z.body);
      L.push('12궁(궁 간지 대한나이(세는나이) 주성·보조성): ' + z.palaces.map(function (p) { return p.name + '(' + p.stem + p.branch + ' ' + p.range[0] + '~' + p.range[1] + ') ' + (p.major.map(function (x) { return x.n + (x.m ? '화' + x.m : ''); }).join('·') || '주성 없음') + (p.minor.length ? ' + ' + p.minor.map(function (x) { return x.n; }).join('·') : ''); }).join('\n'));
      L.push('재물 관련 궁의 삼방사정: ' + Object.keys(z.sanfang).map(function (n) { return n + '→' + z.sanfang[n].join('·'); }).join(', '));
      L.push('생년 사화: ' + z.palaces.reduce(function (a, p) { p.major.forEach(function (x) { if (x.m) a.push('화' + x.m + ' ' + x.n + '(' + p.name + ')'); }); return a; }, []).join(', '));
      if (y27) { L.push('현재 대한: ' + (z.curDecadal >= 0 ? z.palaces[z.curDecadal].range[0] + '~' + z.palaces[z.curDecadal].range[1] + '세' : '-') + ', 대한 사화: ' + (z.decMutagen || []).join('·')); L.push('2027 유년 사화: ' + ['록', '권', '과', '기'].map(function (m, i) { return '화' + m + ' ' + z.mutagen[i]; }).join(', ')); L.push('2027 유년 12궁(본명 궁 → 유년 궁): ' + z.palaces.map(function (p) { return p.name + '→' + p.yname; }).join(', ')); }
    } else {
      L.push('주요 지점: ASC ' + signOf(w.asc) + ' ' + degS(w.asc) + ', DSC ' + signOf((w.asc + 180) % 360) + ', MC ' + signOf(w.mc) + ' ' + degS(w.mc) + ', IC ' + signOf((w.mc + 180) % 360) + ' (트로피컬·플라시더스)');
      L.push('행성: ' + w.bodies.map(function (b) { return b.ko + ' ' + b.sign + ' ' + degS(b.lon) + ' ' + b.house + '하우스' + (b.retro ? '(역행)' : ''); }).join(', '));
      L.push('하우스 시작점: ' + w.cusps.map(function (c, i) { return (i + 1) + 'H ' + signOf(c).replace(/^\S+ /, '') + ' ' + degS(c); }).join(', '));
      L.push('재물 관련 하우스(2·5·8·10): ' + E.AS_WEALTH.map(function (a) { var inH = w.bodies.filter(function (b) { return b.house === a[0]; }).map(function (b) { return b.ko; }); return a[0] + 'H ' + w.houseSign[a[0] - 1] + (inH.length ? '(' + inH.join('·') + ')' : '(행성 없음)'); }).join(', '));
      var NAME = { conjunction: '합', sextile: '섹스타일', square: '스퀘어', trine: '트라인', opposition: '오포지션' }, nm = {}; w.bodies.forEach(function (b) { nm[b.k] = b.ko; });
      L.push('애스펙트(주요 5종): ' + w.aspects.map(function (q) { return nm[q.a] + '-' + nm[q.b] + ' ' + NAME[q.t] + '(오브 ' + q.orb.toFixed(1) + ')'; }).join(', '));
      if (y27) {
        L.push('2027 트랜짓(목성·토성만 계산, 한국 정오 기준 일 단위): ' + w.transit.map(function (t) { return t.ko + ' 연초 ' + t.start.sign + ' ' + degS(t.start.lon) + '(출생 ' + t.start.house + 'H) → 연말 ' + t.end.sign + ' ' + degS(t.end.lon) + '(출생 ' + t.end.house + 'H)'; }).join(', '));
        L.push('2027 월별(매월 1일, ℞=역행): ' + w.transit.map(function (t) { return t.ko + ' ' + t.months.map(function (x) { return x.m + '월 ' + x.sign.replace('자리', '') + x.house + 'H' + (x.retro ? '℞' : ''); }).join(' '); }).join(' / '));
        L.push('2027 진입·전환일: ' + (w.transit[0].events.concat(w.transit[1].events).sort(function (a, b) { return a.doy - b.doy; }).map(function (e) { return e.date + ' ' + e.text; }).join(', ') || '없음'));
      }
    }
    return L.join('\n');
  }
  var TITLE = { saju: '사주팔자 만세력', ziwei: '자미두수 명반', astro: '서양 점성 출생차트' };
  var MASTER = {
    int: {
      role: '당신은 동서양 세 가지 운세 체계(사주팔자·자미두수·서양 점성술)를 이해하는 해석 도우미입니다. 운세는 오락·참고용이며 재무 판단을 대신하지 않는다는 점을 전제로 답해 주세요.',
      task: '1) 세 체계 각각의 관점에서 돈 벌기·돈 모으기·돈 불리기·돈 지키기를 해석해 주세요.\n2) 세 관점이 공통적으로 보는 부분과 서로 다르게 보는 부분을 나눠 정리해 주세요.\n3) 타고난 재물 성향(원국·본명반·출생차트)과 2027년 흐름(세운·유년·트랜짓)을 구분해 주세요.',
      out: '① 타고난 재물 성향 ② 2027년 재물 흐름 ③ 세 관점의 공통점과 차이점 ④ 쉬운 말로 한 줄 요약', keys: ['saju', 'ziwei', 'astro'] }
  };
  var PNAMES = { saju: '사주팔자', ziwei: '자미두수', astro: '서양 점성술' };
  function aiPrompt(type) {
    var M = MASTER.int, P = [], y27 = st.ai2027;
    P.push('[ROLE]\n' + M.role);
    M.keys.forEach(function (k, i) { P.push('[DATA ' + (M.keys.length > 1 ? (i + 1) + ' · ' : '') + PNAMES[k] + ']\n' + dataText(k, y27)); });
    var ctx = []; if (S.useAi) { if (S.job) ctx.push('현재 상황: ' + S.job); if (S.wants.length) ctx.push('새해 바라는 점: ' + S.wants.join(', ')); if (S.habit) ctx.push('바꾸고 싶은 돈 습관: ' + S.habit); if (S.ask) ctx.push('궁금한 점: ' + S.ask); }
    if (st.extra) ctx.push('추가로 궁금한 내용: ' + st.extra);
    if (ctx.length) P.push('[CONTEXT]\n' + ctx.join('\n'));
    P.push('[BASIS · 계산 기준과 적용 기간]\n- ' + [C.basisPublic.saju, C.basisPublic.ziwei, C.basisPublic.astro, C.basisPublic.periods.sewoon, C.basisPublic.periods.yearly, C.basisPublic.periods.transit].join('\n- ') + '\n- 사주 대운 나이와 자미두수 대한 나이는 산정 방식이 달라 같은 시기라도 숫자가 다를 수 있습니다.\n- 12운성·별 밝기(묘왕평함) 등 검증되지 않은 항목은 제공하지 않았습니다.');
    P.push('[TASK]\n' + M.task + (y27 ? '' : '\n(2027년 데이터는 포함하지 않았으니 타고난 성향 중심으로 답해 주세요.)'));
    P.push('[VERIFY]\n위 데이터는 이미 계산된 값입니다. 명반을 다시 계산하거나 없는 데이터를 만들어 내지 말고, 주어진 값에 근거해서만 해석해 주세요. 근거가 부족하면 모른다고 답해 주세요.');
    P.push('[OUTPUT]\n' + M.out);
    P.push('[ACTION]\n운세와 구분해서, 지금 바로 해 볼 수 있는 현실적인 가계 점검 질문 3가지를 제안해 주세요.');
    P.push('[주의]\n특정 종목·금융상품 추천, 매수·매도 시점, 수익률 예측은 하지 마세요. 이름과 생년월일은 이 질문에 포함하지 않았습니다. 재성의 개수나 위치만으로 부유함을 판단하지 말고, 주성이 없는 궁을 부정적으로 해석하지 마세요. 트랜짓은 목성·토성만 계산되었으며 다른 행성의 연간 흐름은 알 수 없습니다.');
    return P.join('\n\n');
  }
  /* ───── 화면 조각 ───── */
  var MAPS = [
    ['saju', 'SAJU', '사주팔자', '四柱', '재성 · 오행 · 십성', '전체 만세력 보기 →', '주황색: 재성(정재·편재)이 있는 기둥과 글자'],
    ['ziwei', 'ZIWEI', '자미두수', '紫微斗數', '재백궁 · 관록궁 · 전택궁 · 복덕궁', '전체 명반 보기 →', '주황색: 재물 관련 궁 · 동그라미: 사화'],
    ['astro', 'ASTRO', '점성술', '트로피컬 · 플라시더스', '행성 · 별자리 · 하우스', '전체 차트 보기 →', '주황색: 2·5·8·10하우스와 참고 주요 행성 · 바깥 호: 2027 목성·토성']
  ];
  function mapsHtml() {
    return '<div class="maps">' + MAPS.map(function (m) { var k = m[0]; return '<article class="mapc"><div class="mapsvg">' + SVG[k]() + '</div><div class="mapt"><div class="rk">' + m[1] + '</div><h3>' + m[2] + ' <small>' + m[3] + '</small></h3><div class="mp-sub">' + m[4] + '</div><button type="button" class="go" data-tab="' + k + '">' + m[5] + '</button></div></article>'; }).join('') + '</div>';
  }
  function proEvidence(k) {
    var s = C.saju, z = C.ziwei, w = C.western, y27 = true, sg = C.signals.parts, r = [];
    if (k === 'saju') { r.push(sg.cai.length ? '재성(정재·편재, 지장간 포함): ' + sg.cai.join('·') : '재성(정재·편재)이 드러나지 않음'); if (y27) { var lk = s.luck2027, nd = lk && lk.current; r.push('2027 세운 ' + s.sewoon.gz + '(' + s.sewoon.tg + ')' + (nd ? ' · 대운 ' + nd.gz + '(' + nd.tg + ')' + (lk.next ? ' → ' + lk.next.gz + '(2027년 중 전환)' : '') : '')); } }
    else if (k === 'zw') { r.push(E.ZW_WEALTH.map(function (zw) { var p = z.palaces.filter(function (q) { return q.name === zw[0]; })[0]; return zw[0] + '궁 ' + (p.major.map(function (x) { return x.n; }).join('·') || '주성 없음'); }).join(' / ')); if (y27) r.push('2027 유년 사화 ' + ['록', '권', '과', '기'].map(function (m, i) { return '화' + m + ' ' + z.mutagen[i]; }).join(' · ')); }
    else { r.push(sg.astro.map(function (a) { return a.house + '하우스 ' + a.sign; }).join(' · ')); r.push(sg.wealthPlanets.map(function (p) { return p.n + ' ' + p.sign + '(' + p.house + 'H)'; }).join(', ')); if (y27) r.push('2027 ' + w.transit.map(function (t) { return t.ko + ' ' + t.start.sign + '(' + t.start.house + 'H) → ' + t.end.sign + '(' + t.end.house + 'H)'; }).join(' · ')); }
    return r.map(function (x) { return '<div>' + esc(x) + '</div>'; }).join('');
  }
  function compareHtml() {
    var tp = E.TOPICS4[st.topic];
    function card(sys, key, arr) { return '<div class="v3"><span class="s">' + sys + '</span><p class="t">' + arr[0] + '</p><p class="x">' + arr[1] + '</p><div class="ev"><b>근거</b>' + proEvidence(key) + '</div></div>'; }
    var chips = ['사주', '자미두수', '점성술'].map(function (n) { return '<i>' + n + '</i>'; }).join('');
    return '<div class="seg tabs4" role="tablist">' + Object.keys(E.TOPICS4).map(function (k) { return '<button class="chip' + (k === st.topic ? ' on' : '') + '" role="tab" aria-selected="' + (k === st.topic) + '" data-topic="' + k + '">' + E.TOPICS4[k].label + '</button>'; }).join('') + '</div>' +
      '<div class="keybox"><div class="kb-a"><div class="kb-k">COMMON</div><h4>공통적으로 나타나는 해석</h4><div class="kb-sys">' + chips + '</div><p class="serif">' + tp.same + '</p></div>' +
      '<div class="kb-vs" aria-hidden="true"><span>≠</span></div>' +
      '<div class="kb-b"><div class="kb-k">DIFFERENT</div><h4>서로 다르게 보는 부분</h4><div class="kb-rows">' + tp.diffs.map(function (d) { return '<div><b>' + d[0] + '</b><span>' + d[1] + '</span></div>'; }).join('') + '</div></div></div>' +
      '<div class="v3head">세 관점 자세히 보기</div><div class="v3row">' + card('사주팔자', 'saju', tp.saju) + card('자미두수', 'zw', tp.zw) + card('점성술', 'as', tp.as) + '</div>';
  }
  function aiBuilder() {
    return '<section class="ai" id="ai"><div class="k">AI INTEGRATED FORTUNE</div><h2>세 가지 운명 지도에 AI를 더하다.</h2><p>나의 명반 3종과 재테크 관심사를 담은 세상에 하나뿐인 통합 재물운 프롬프트를 만들어 드려요.</p>' +
      '<ul class="inc"><li>사주팔자 만세력·대운·세운·월운</li><li>자미두수 12궁 명반·사화·대한·유년</li><li>서양 점성차트·애스펙트·2027 트랜짓</li><li>내가 선택한 재테크 관심사와 고민 <em>(선택)</em></li></ul>' +
      '<button class="b" data-act2="aiopen">통합 AI 재물운 프롬프트 만들기 →</button><div id="aibox"' + (st.aiOpen ? '' : ' hidden') + '>' + builderPanel() + '</div></section>';
  }
  function builderPanel() {
    return '<div class="warn">아래 프롬프트에는 <b>내 명반을 계산한 데이터</b>가 들어 있어요. 이름·생년월일은 넣지 않았지만, 복사해서 붙여 넣으면 <b>사용하는 AI 서비스로 내용이 전달</b>돼요. 내용을 확인한 뒤 원할 때만 사용하세요.</div>' +
      '<div class="aiopts"><label><input type="checkbox" id="ai2027"' + (st.ai2027 ? ' checked' : '') + '> 2027년 운세 데이터 포함</label><label><input type="checkbox" id="aiuse"' + (S.useAi ? ' checked' : '') + '> 내가 고른 관심사·고민 포함</label></div>' +
      '<label class="lbl2">추가로 궁금한 내용 <em>(선택, 100자)</em></label><textarea id="aiextra" maxlength="100" class="aix" placeholder="예: 올해 지출 습관에서 먼저 점검할 부분이 궁금해요">' + esc(st.extra) + '</textarea>' +
      '<label class="lbl2">프롬프트 미리보기</label><textarea id="aip" readonly>' + esc(aiPrompt('int')) + '</textarea>' +
      '<label class="swl"><input type="checkbox" id="aiok"' + (st.aiOk ? ' checked' : '') + '> 위 안내와 프롬프트 내용을 확인했어요</label><div class="aibtn"><button class="b" data-act2="aicopy" id="aicopy"' + (st.aiOk ? '' : ' disabled') + '>프롬프트 복사하기</button></div><div class="aitools">복사한 뒤 평소 쓰는 AI에서 붙여 넣어 보세요: <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer">ChatGPT</a> · <a href="https://claude.ai" target="_blank" rel="noopener noreferrer">Claude</a> · <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer">Gemini</a></div>';
  }
  var TABS = [['int', '통합 재물운'], ['saju', '사주팔자'], ['ziwei', '자미두수'], ['astro', '점성술']];
  function tabsBar() { return '<div class="rtabwrap"><nav class="rtabs" role="tablist" aria-label="결과 보기">' + TABS.map(function (t) { return '<button role="tab" aria-selected="' + (st.tab === t[0]) + '" class="' + (st.tab === t[0] ? 'on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</nav></div>'; }

  function paneInt() {
    var sg = C.signals, th = E.THEME, ts = C.saju.trueSolar ? '진태양시 ' + C.saju.trueSolar.time + ' · ' : '';
    return '<div class="rh"><div class="rh-in"><div class="th-l">2027년 나의 재물운 테마</div><div class="th serif">' + th.name + '</div><div class="th-s">' + th.sub + '</div>' +
      '<h1 class="serif">' + sg.keySentence + '</h1><div class="tags">' + th.keywords.map(function (k) { return '<span># ' + k + '</span>'; }).join('') + '</div>' +
      '<p class="ds">사주팔자 · 자미두수 · 점성술 3종 관점 · 2027 정미년' + (C.saju.trueSolar ? ' · 진태양시 ' + C.saju.trueSolar.time + ' 기준' : '') + '</p></div></div>' +
      '<nav class="anch" aria-label="페이지 안 바로가기"><a href="#sum">재물운 요약</a><a href="#maps">운명 지도</a><a href="#cmp">세 가지 해석</a><a href="#ai">AI 프롬프트</a><a href="#share">행운 카드</a></nav><div class="rd">' +
      '<section class="rdc" id="sum"><div class="rk">MY MONEY FORTUNE</div><h3>한눈에 보는 나의 재물운</h3><p class="hint" style="margin:-6px 0 12px">2027년, 나의 돈 이야기를 네 가지 관점에서 살펴봤어요.</p><div class="sum4">' + E.SUMMARY4.map(function (s4) { return '<div class="s4"><i>' + s4.label + '</i><b class="serif">' + s4.title + '</b><span>' + s4.text + '</span></div>'; }).join('') + '</div></section>' +
      '<section class="rdc" id="maps"><div class="rk">MY THREE FORTUNE MAPS</div><h3>나의 세 가지 운명 지도</h3><p class="hint" style="margin:-6px 0 12px">서로 다른 세 가지 운세 체계로 나의 재물운을 살펴봐요. 전체 명반은 각 탭에서 확인할 수 있어요.</p><div id="mapsbody">' + mapsHtml() + '</div></section>' +
      '<section class="rdc" id="cmp"><div class="rk">THREE PERSPECTIVES</div><h3>나의 재물운, 세 가지 해석</h3><div id="cmpbody">' + compareHtml() + '</div></section>' + aiBuilder() +
      '<section class="rdc fcsec" id="share"><div class="rk">2027 DONBUFF FORTUNE CARD</div><h3>나의 행운 카드가 도착했어요</h3><p class="hint" style="margin:-6px 0 0">당신의 새해를 상징하는 행운 카드가 도착했어요.<br>8가지 재물운 카드 중 나의 운세와 어울리는 카드는 무엇일까요?</p>' +
      '<div class="fcwrap"><div class="fcard" id="fcard" role="button" tabindex="0" aria-label="카드 뒤집기"><div class="fcf fcbk"><canvas id="cvb" width="540" height="675"></canvas></div><div class="fcf fcfr"><canvas id="cv" width="1080" height="1350" role="img" aria-label="나의 2027년 재물운 카드 미리보기"></canvas></div></div></div>' +
      '<p class="fcmsg" id="fcmsg"></p>' +
      '<div class="shbtn"><button class="btn2 shp" data-act2="save">나의 행운 카드 저장하기</button><div class="shrow"><button class="btn2 g" data-act2="nshare" id="nshare" hidden>친구에게 공유하기</button><button class="btn2 g" data-act2="cards">전체 카드 보기</button></div></div></section></div>';
  }
  var HEAD = { saju: ['SAJU · 四柱八字', '나의 사주팔자 만세력', '나의 타고난 명식과 시간에 따른 운세의 흐름'], ziwei: ['ZIWEI · 紫微斗數', '나의 자미두수 명반', '12궁과 별의 배치로 읽는 나의 운명 지도'], astro: ['ASTRO · NATAL CHART', '나의 서양 점성차트', '태어난 순간의 행성과 별자리가 담긴 운명 지도'] };
  function card(title, sc, idx, extra) { return '<section class="dsec"><div class="dh"><h4>' + title + '</h4>' + (extra || '') + '</div><div class="dsvg">' + secSvg(sc) + '</div></section>'; }
  function layerSeg(k) {
    if (k === 'ziwei') return '<div class="seg lay"><button class="chip' + (st.zwLayer === 'birth' ? ' on' : '') + '" data-lay="birth">타고난 명반 (생년 사화)</button><button class="chip' + (st.zwLayer === 'y2027' ? ' on' : '') + '" data-lay="y2027">2027 유년 사화</button></div>';
    if (k === 'astro') return '<div class="seg lay"><button class="chip' + (st.astroLayer === 'birth' ? ' on' : '') + '" data-lay="birth">출생차트</button><button class="chip' + (st.astroLayer === 'y2027' ? ' on' : '') + '" data-lay="y2027">2027 트랜짓</button></div>';
    return '';
  }
  function coreCards(k) {
    var z = C.ziwei, w = C.western, s = C.saju, sg = C.signals.parts, cards = [];
    if (k === 'saju') {
      var lk = s.luck2027, nd = lk && lk.current, cnt = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
      s.pillars.forEach(function (p) { cnt[E.EL_STEM[p.stem]]++; cnt[E.EL_BR[p.branch]]++; });
      cards = [['재성 (정재·편재)', sg.cai.length ? sg.cai.join('·') : '드러나지 않음', sg.caiDetail.length ? sg.caiDetail.slice(0, 3).join(' / ') : '위치 구분: 천간·지장간 본기·중기·여기'], ['2027년 대운', nd ? nd.gz + ' · ' + nd.tg + (lk.next ? ' → ' + lk.next.gz : '') : '-', lk && lk.next ? (st.noDates ? '2027년 중 전환' : lk.switchDate.replace(/-/g, '.') + ' 전환') : (nd ? nd.age + '~' + (nd.endAge || nd.age + 9) + '세' : '')], ['2027 세운', s.sewoon.gz + ' · ' + s.sewoon.tg, '정미년'], ['오행 분포', ['wood', 'fire', 'earth', 'metal', 'water'].map(function (e) { return EKO[e] + cnt[e]; }).join(' '), '8글자 기준']];
    } else if (k === 'ziwei') {
      cards = E.ZW_WEALTH.map(function (zw) { var p = z.palaces.filter(function (q) { return q.name === zw[0]; })[0]; return [zw[0] + '궁', p.major.map(function (x) { return x.n + (x.m ? '(화' + x.m + ')' : ''); }).join('·') || '주성 없음', zw[1]]; });
    } else {
      cards = E.AS_WEALTH.map(function (a) { var inH = w.bodies.filter(function (b) { return b.house === a[0]; }).map(function (b) { return b.ko; }); return [a[0] + '하우스 · ' + w.houseSign[a[0] - 1], inH.length ? inH.join('·') + ' 위치' : '들어 있는 행성 없음', a[1]]; });
      cards.push(['2027 트랜짓', w.transit.map(function (t) { return t.ko + ' ' + t.start.sign.replace('자리', '') + '→' + t.end.sign.replace('자리', ''); }).join(' / '), '목성·토성만 계산']);
    }
    return '<div class="wcells">' + cards.map(function (c) { return '<div class="wcell"><i>' + c[0] + '</i><b>' + c[1] + '</b><span>' + c[2] + '</span></div>'; }).join('') + '</div>';
  }
  var DETAIL = {
    saju: [['오행 분포', 1], ['합·충 관계', 2], ['대운 전체표', 3], ['세운 (2025~2029)', 4], ['2027 월운', 5]],
    ziwei: [['재물 궁 · 삼방사정', 1], ['사화 (생년 · 대한 · 2027 유년)', 2], ['대한 전체표 (10년 단위)', 3]],
    astro: [['주요 지점', 1], ['행성 위치표', 2], ['하우스 위치표', 3], ['애스펙트 매트릭스', 4], ['2027 트랜짓 · 연초·연말', 5], ['2027 트랜짓 · 월별 위치', 6], ['2027 트랜짓 · 별자리·하우스 진입, 순행·역행 전환', 7]]
  };
  function paneDetail(k) {
    var h = HEAD[k], secs = sections(k), gl = E.GLOSSARY[k === 'ziwei' ? 'zw' : k === 'astro' ? 'as' : 'saju'];
    var det = DETAIL[k].map(function (d) { return card(d[0], secs[d[1]], d[1]); }).join('');
    var birth = '<div class="bl">' + birthLines(true).map(function (l) { return '<div>' + esc(l) + '</div>'; }).join('') + basisLines(k).map(function (l) { return '<div class="bs">' + esc(l) + '</div>'; }).join('') + '</div><dl class="gdl">' + gl.map(function (g2) { return '<dt>' + g2[0] + '</dt><dd>' + g2[1] + '</dd>'; }).join('') + '</dl>';
    return '<div class="rd"><div class="ptitle"><div class="rk">' + h[0] + '</div><h2 class="serif">' + h[1] + '</h2><p>' + h[2] + '</p></div>' +
      '<section class="dsec mainc">' + layerSeg(k) + '<div class="dsvg">' + secSvg(secs[0]) + '</div><div class="imgbar"><button class="btn2" data-act2="imgdl" data-tab-k="' + k + '">' + ({ saju: '만세력', ziwei: '명반', astro: '점성차트' }[k]) + ' 이미지 저장</button></div></section>' +
      '<section class="dsec"><div class="dh"><h4>재물운 관련 핵심 정보</h4></div>' + coreCards(k) + '</section>' +
      '<details class="dsec fold"><summary>상세 전문 데이터 보기</summary><div class="foldin"><button class="btn2 g sm cp" data-act2="datacopy" data-tab-k="' + k + '">이 명반 데이터 복사</button>' + det + '</div></details>' +
      '<details class="dsec fold"><summary>출생 정보(계산기준)</summary><div class="foldin">' + birth + '</div></details>' +
      '</div>';
  }
  function paneHtml() { return st.tab === 'int' ? paneInt() : paneDetail(st.tab); }
  function html(ctx) {
    E = ctx.E; C = ctx.chart; S = ctx.S; X = ctx;
    return '<div id="rwrap"><div class="rtop"><div class="ey">DONBUFF · 2027 MONEY FORTUNE</div><div class="rh-t">' + (S.name ? esc(S.name) + '님의 ' : '나의 ') + '2027년 재테크 운세</div></div>' + tabsBar() + '<div id="tabpane">' + paneHtml() + '</div><div class="zoomov" id="colov" hidden></div>' +
      '</div>';
  }

  /* ───── 공유 카드(1080×1350 네이비 골드) ───── */
  function wrapText(c, t, x, y, mw, lh) { var line = '', yy = y; for (var i = 0; i < t.length; i++) { var test = line + t[i]; if (c.measureText(test).width > mw && line) { c.fillText(line, x, yy); line = t[i]; yy += lh; } else line = test; } c.fillText(line, x, yy); return yy + lh; }
  function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  function fit(c, text, maxW, size, weight, font) { var s = size; c.font = weight + ' ' + s + 'px ' + font; while (c.measureText(text).width > maxW && s > 20) { s -= 2; c.font = weight + ' ' + s + 'px ' + font; } return s; }
  /* ───── DONBUFF FORTUNE CARD (8종) ───── */
  var ARTDIR = '/redesign/img/fortune/cards/', artC = {};
  function loadArt(name, cb) { if (name in artC) { cb(artC[name]); return; } artC[name] = null; var im = new Image(); im.onload = function () { artC[name] = im; cb(im); }; im.onerror = function () { artC[name] = false; cb(false); }; im.src = ARTDIR + name; }
  function curCard() {
    var c = E.pickCard(E.THEME);
    if (location.hostname.indexOf('donbuff.com') < 0) { var m = /[?&]card=([1-8])\b/.exec(location.search); if (m) c = E.CARDS[+m[1] - 1]; }  // 미리보기 전용: ?card=1..8
    return c;
  }
  function coverDraw(c, im, W0, H0) { var r = Math.max(W0 / im.width, H0 / im.height), w = im.width * r, h = im.height * r; c.drawImage(im, (W0 - w) / 2, (H0 - h) / 2, w, h); }
  function emblem(c, no, cx, cy, r, GOLD) {
    c.save(); c.strokeStyle = GOLD; c.fillStyle = GOLD; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
    function ring(x, y, rad) { c.beginPath(); c.arc(x, y, rad, 0, 7); c.stroke(); }
    if (no === 1) { ring(cx, cy, r * .42); for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8, r1 = r * .52, r2 = r * (i % 2 ? .72 : .9); c.beginPath(); c.moveTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a)); c.lineTo(cx + r2 * Math.cos(a), cy + r2 * Math.sin(a)); c.stroke(); } }
    else if (no === 2) { c.beginPath(); c.moveTo(cx, cy + r * .9); c.lineTo(cx, cy - r * .1); c.moveTo(cx, cy + r * .3); c.lineTo(cx - r * .35, cy + r * .05); c.moveTo(cx, cy + r * .1); c.lineTo(cx + r * .35, cy - r * .15); c.stroke(); ring(cx, cy - r * .35, r * .55); for (var j = 0; j < 7; j++) { c.beginPath(); c.arc(cx + (j - 3) * r * .15, cy - r * .35 + ((j % 3) - 1) * r * .2, 7, 0, 7); c.fill(); } }
    else if (no === 3) { ring(cx, cy, r * .85); ring(cx, cy, r * .72); c.beginPath(); c.moveTo(cx, cy - r * .6); c.lineTo(cx + r * .14, cy); c.lineTo(cx, cy + r * .6); c.lineTo(cx - r * .14, cy); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(cx - r * .6, cy); c.lineTo(cx, cy + r * .12); c.lineTo(cx + r * .6, cy); c.lineTo(cx, cy - r * .12); c.closePath(); c.stroke(); c.beginPath(); c.arc(cx, cy, 9, 0, 7); c.fill(); }
    else if (no === 4) { c.beginPath(); c.moveTo(cx - r * .62, cy - r * .7); c.lineTo(cx + r * .62, cy - r * .7); c.lineTo(cx + r * .62, cy + r * .05); c.quadraticCurveTo(cx + r * .6, cy + r * .6, cx, cy + r * .9); c.quadraticCurveTo(cx - r * .6, cy + r * .6, cx - r * .62, cy + r * .05); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(cx, cy - r * .5); c.lineTo(cx, cy + r * .55); c.moveTo(cx - r * .32, cy - r * .08); c.lineTo(cx + r * .32, cy - r * .08); c.stroke(); }
    else if (no === 5) { c.beginPath(); c.moveTo(cx, cy - r * .8); c.lineTo(cx, cy + r * .75); c.moveTo(cx - r * .38, cy + r * .78); c.lineTo(cx + r * .38, cy + r * .78); c.moveTo(cx - r * .75, cy - r * .5); c.lineTo(cx + r * .75, cy - r * .5); c.stroke(); [-1, 1].forEach(function (d) { var x = cx + d * r * .75; c.beginPath(); c.moveTo(x, cy - r * .5); c.lineTo(x - r * .3, cy + r * .1); c.lineTo(x + r * .3, cy + r * .1); c.closePath(); c.stroke(); c.beginPath(); c.arc(x, cy + r * .1, r * .3, 0, Math.PI); c.stroke(); }); }
    else if (no === 6) { ring(cx - r * .38, cy - r * .38, r * .3); c.beginPath(); c.moveTo(cx - r * .17, cy - r * .17); c.lineTo(cx + r * .6, cy + r * .6); c.moveTo(cx + r * .3, cy + r * .3); c.lineTo(cx + r * .5, cy + r * .1); c.moveTo(cx + r * .46, cy + r * .46); c.lineTo(cx + r * .66, cy + r * .26); c.stroke(); }
    else if (no === 7) { for (var k = -2; k <= 2; k++) { c.save(); c.translate(cx, cy + r * .45); c.rotate(k * .42); c.beginPath(); c.ellipse(0, -r * .5, r * .17, r * .5, 0, 0, 7); c.stroke(); c.restore(); } c.beginPath(); c.ellipse(cx, cy + r * .5, r * .95, r * .16, 0, 0, Math.PI); c.stroke(); }
    else { ring(cx, cy, r * .85); ring(cx, cy, r * .62); for (var q = 0; q < 8; q++) { var an = q * Math.PI / 4 - Math.PI / 2; c.beginPath(); c.moveTo(cx + r * .62 * Math.cos(an), cy + r * .62 * Math.sin(an)); c.lineTo(cx + r * .3 * Math.cos(an + Math.PI / 8), cy + r * .3 * Math.sin(an + Math.PI / 8)); c.lineTo(cx + r * .62 * Math.cos(an + Math.PI / 4), cy + r * .62 * Math.sin(an + Math.PI / 4)); c.stroke(); } c.beginPath(); c.arc(cx, cy, 8, 0, 7); c.fill(); }
    c.restore();
  }
  function paintBack(cv, im) {
    var c = cv.getContext('2d'), W0 = cv.width, H0 = cv.height, GOLD = '#E5B98A', SERIF = "'Noto Serif KR','Nanum Myeongjo',serif";
    if (im) { coverDraw(c, im, W0, H0); return; }
    var g = c.createLinearGradient(0, 0, 0, H0); g.addColorStop(0, '#1E2D47'); g.addColorStop(1, '#0F182B'); c.fillStyle = g; c.fillRect(0, 0, W0, H0);
    c.strokeStyle = 'rgba(229,185,138,.7)'; c.lineWidth = 2; rr(c, 22, 22, W0 - 44, H0 - 44, 22); c.stroke(); c.strokeStyle = 'rgba(229,185,138,.35)'; rr(c, 38, 38, W0 - 76, H0 - 76, 16); c.stroke();
    var cx = W0 / 2, cy = H0 / 2 - 20; c.strokeStyle = 'rgba(229,185,138,.55)'; c.beginPath(); c.arc(cx, cy, 150, 0, 7); c.stroke(); c.beginPath(); c.arc(cx, cy, 120, 0, 7); c.stroke();
    for (var k = 0; k < 12; k++) { var an = k * Math.PI / 6; c.beginPath(); c.moveTo(cx + 120 * Math.cos(an), cy + 120 * Math.sin(an)); c.lineTo(cx + 150 * Math.cos(an), cy + 150 * Math.sin(an)); c.stroke(); }
    c.fillStyle = GOLD; c.textAlign = 'center'; c.font = '900 64px ' + SERIF; c.fillText('D', cx, cy + 22); c.font = '900 22px ' + FONT; c.fillText('D O N B U F F', cx, H0 - 120); c.font = '700 18px ' + FONT; c.fillStyle = 'rgba(255,255,255,.6)'; c.fillText('F O R T U N E   C A R D  ·  2 0 2 7', cx, H0 - 88); c.textAlign = 'left';
  }
  function paintCard(cv, card, art) {
    var c = cv.getContext('2d'), S4 = E.SUMMARY4, GOLD = '#E5B98A', G2 = '#D9B26A', SANS = FONT, SERIF = "'Noto Serif KR','Nanum Myeongjo',serif", W0 = 1080, H0 = 1350, CX = W0 / 2;
    c.clearRect(0, 0, W0, H0); c.textAlign = 'left';
    var g = c.createLinearGradient(0, 0, 0, H0); g.addColorStop(0, card.c1); g.addColorStop(1, card.c2); c.fillStyle = g; c.fillRect(0, 0, W0, H0);
    if (art) { coverDraw(c, art, W0, H0); }
    else {
      var gl = c.createRadialGradient(CX, 330, 10, CX, 330, 430); gl.addColorStop(0, 'rgba(229,185,138,.30)'); gl.addColorStop(1, 'rgba(229,185,138,0)'); c.fillStyle = gl; c.fillRect(0, 0, W0, H0);
      var seed = 11 + card.no; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      for (var i = 0; i < 80; i++) { c.fillStyle = 'rgba(229,185,138,' + (0.10 + rnd() * .45) + ')'; c.beginPath(); c.arc(rnd() * W0, rnd() * H0, 0.8 + rnd() * 2.2, 0, 7); c.fill(); }
      c.strokeStyle = 'rgba(229,185,138,.35)'; c.lineWidth = 2; c.beginPath(); c.arc(CX, 330, 200, 0, 7); c.stroke(); c.beginPath(); c.arc(CX, 330, 184, 0, 7); c.stroke();
      emblem(c, card.no, CX, 330, 130, GOLD);
    }
    if (!art) { c.strokeStyle = 'rgba(229,185,138,.9)'; c.lineWidth = 3; rr(c, 26, 26, W0 - 52, H0 - 52, 30); c.stroke(); c.strokeStyle = 'rgba(229,185,138,.4)'; c.lineWidth = 1.5; rr(c, 44, 44, W0 - 88, H0 - 88, 22); c.stroke(); }
    // 글자 영역: 그림 아래 빈 공간(y 640~1120). 상단·하단 장식은 그림에 맡기고 글자는 최소화
    c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,.82)'; c.font = '700 24px ' + SANS; c.fillText('M Y   M O N E Y   F O R T U N E   C A R D', CX, 668);
    c.fillStyle = GOLD; c.font = '700 26px ' + SANS; c.fillText('✧  ' + card.roman + '  ·  2027  ✧', CX, 710);
    c.fillStyle = '#fff'; fit(c, card.en, 820, 68, 700, SERIF); c.fillText(card.en, CX, 786);
    c.fillStyle = GOLD; c.font = '800 38px ' + SANS; c.fillText(card.ko, CX, 840);
    c.fillStyle = 'rgba(255,255,255,.8)'; c.font = '600 25px ' + SANS; c.fillText('나의 2027년 재물운  ·  ' + card.theme, CX, 884);
    c.fillStyle = '#fff'; fit(c, '“' + card.quote + '”', 800, 29, 600, SERIF); c.fillText('“' + card.quote + '”', CX, 928); c.textAlign = 'left';
    var cw = 404, ch = 62, gp = 14, x0 = (W0 - 2 * cw - gp) / 2, y0 = 954;
    S4.forEach(function (s4, i) { var bx = x0 + (i % 2) * (cw + gp), by = y0 + Math.floor(i / 2) * (ch + gp); c.fillStyle = 'rgba(0,0,0,.28)'; rr(c, bx, by, cw, ch, 14); c.fill(); c.strokeStyle = 'rgba(229,185,138,.45)'; c.lineWidth = 1.5; rr(c, bx, by, cw, ch, 14); c.stroke(); c.fillStyle = GOLD; c.font = '800 21px ' + SANS; c.fillText(E.TOPICS4[s4.id].label, bx + 18, by + 39); var lw = c.measureText(E.TOPICS4[s4.id].label).width; c.fillStyle = '#fff'; fit(c, s4.title, cw - 48 - lw, 26, 800, SANS); c.fillText(s4.title, bx + 32 + lw, by + 41); });
    c.textAlign = 'center'; c.fillStyle = G2; c.font = '800 26px ' + SANS; c.fillText(card.kw.map(function (k) { return '#' + k; }).join('   '), CX, 1128);
    c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '600 21px ' + SANS; c.fillText('donbuff.com', CX, 1162); c.textAlign = 'left';
  }
  function cardMsg(card) { return '당신의 카드는 <b>' + card.short + '</b>이에요.<br>올해의 재물운 테마는 ‘' + card.theme + '’이에요.<br><i>“' + card.quote + '”</i>'; }
  function setupCard(el) {
    var cv = el.querySelector('#cv'), cvb = el.querySelector('#cvb'), fc = el.querySelector('#fcard'); if (!cv || !fc) return;
    var card = curCard(); st.card = card;
    paintCard(cv, card, null); paintBack(cvb, null);
    loadArt('card-0' + card.no + '.jpg', function (im) { if (im) paintCard(cv, card, im); });
    loadArt('card-back.jpg', function (im) { if (im) paintBack(cvb, im); });
    var m = el.querySelector('#fcmsg'); if (m) m.innerHTML = cardMsg(card);
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function flip() { fc.classList.add('flip'); }
    if (reduce || !('IntersectionObserver' in window)) flip();
    else { var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); setTimeout(flip, 500); } }, { threshold: .55 }); io.observe(fc); }
    fc.onclick = function () { fc.classList.toggle('flip'); };
    fc.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fc.classList.toggle('flip'); } };
  }
  function cardBlob(el, cb) { // 그림이 아직 로딩 중이면 마무리 후 저장
    var card = st.card || curCard(), cv = el.querySelector('#cv');
    loadArt('card-0' + card.no + '.jpg', function (im) { paintCard(cv, card, im || null); cv.toBlob(cb); });
  }
  function collectionHtml() {
    var my = (st.card || curCard()).no;
    return '<div class="zoomin colin"><button class="zclose" data-act2="cardsx" aria-label="닫기">×</button><div class="rk">DONBUFF FORTUNE COLLECTION</div><h3>8가지 재물운 카드</h3><div class="cgrid">' + E.CARDS.map(function (cd) {
      return '<div class="cc' + (cd.no === my ? ' me' : '') + '" style="background:linear-gradient(160deg,' + cd.c1 + ',' + cd.c2 + ')"><canvas class="ccv" data-cn="' + cd.no + '" width="300" height="375"></canvas>' + (cd.no === my ? '<span class="cme">나의 카드</span>' : '') + '<b>' + cd.roman + '</b><i>' + cd.en + '</i><span>' + cd.ko + '</span></div>';
    }).join('') + '</div><p class="shs" style="text-align:center">모든 카드는 서로 다른 재물운의 상징과 이야기를 담고 있어요.</p></div>';
  }
  function openCollection(el) {
    var ov = el.querySelector('#colov'); ov.innerHTML = collectionHtml(); ov.hidden = false; document.body.style.overflow = 'hidden';
    ov.querySelectorAll('.ccv').forEach(function (cv) {
      var no = +cv.getAttribute('data-cn'), cd = E.CARDS[no - 1], c = cv.getContext('2d'); c.clearRect(0, 0, 300, 375);
      var gl = c.createRadialGradient(150, 150, 5, 150, 150, 150); gl.addColorStop(0, 'rgba(229,185,138,.28)'); gl.addColorStop(1, 'rgba(229,185,138,0)'); c.fillStyle = gl; c.fillRect(0, 0, 300, 375);
      c.strokeStyle = 'rgba(229,185,138,.5)'; c.lineWidth = 1.5; c.strokeRect(10, 10, 280, 355); emblem(c, no, 150, 170, 80, '#E5B98A');
      loadArt('card-0' + no + '.jpg', function (im) { if (im) { c.clearRect(0, 0, 300, 375); coverDraw(c, im, 300, 375); } });
    });
    var x = ov.querySelector('.zclose'); if (x) x.focus(); X.ev('fortune_cards_open');
  }
  function closeCollection(el) { var ov = el.querySelector('#colov'); ov.hidden = true; ov.innerHTML = ''; document.body.style.overflow = ''; }

  /* ───── 명반 이미지 저장(전문 명반 이미지: 공유 카드와 별개) ───── */
  function compose(k) {
    var secs = sections(k), M = 20, w = W + 2 * M, y = M, g = '';
    g += T(M, y + 14, 'DONBUFF · 2027 MY MONEY FORTUNE', { a: 'start', s: 12, w: 900, c: ORT, ls: 1.5 }); y += 40;
    g += T(M, y, TITLE[k], { a: 'start', s: 26, w: 800 }); y += 22;
    basisLines(k, !st.pinfo).forEach(function (l) { g += T(M, y, l, { a: 'start', s: 11, w: 600, c: MUT }); y += 16; });
    if (st.pinfo) birthLines(true).forEach(function (l) { g += T(M, y, l, { a: 'start', s: 11, w: 700, c: NAVY }); y += 16; });
    y += 10;
    secs.forEach(function (sc) { g += '<g transform="translate(' + M + ',' + y + ')">' + sc.svg + '</g>'; y += sc.h + 16; });
    g += '<line x1="' + M + '" y1="' + y + '" x2="' + (w - M) + '" y2="' + y + '" stroke="' + LINE + '"/>'; y += 22;
    g += T(M, y, 'DONBUFF · donbuff.com', { a: 'start', s: 13, w: 900, c: NAVY }); y += 18; g += T(M, y, '오락·참고용 · 투자 권유가 아닙니다 · 상업용 재배포 금지', { a: 'start', s: 10.5, w: 600, c: MUT }); y += 26;
    return { w: w, h: y, svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + y + '" width="' + w + '" height="' + y + '" font-family="' + FONT + '"><rect width="' + w + '" height="' + y + '" fill="#FFFDF9"/>' + g + '</svg>' };
  }
  function rasterize(svgStr, w, h, name) {
    var img = new Image(); img.onload = function () { var sc = Math.max(2.25, 2100 / Math.max(w, h)); sc = Math.min(sc, 4096 / Math.max(w, h)); var cv = document.createElement('canvas'); cv.width = Math.round(w * sc); cv.height = Math.round(h * sc); var c = cv.getContext('2d'); c.fillStyle = '#FFFDF9'; c.fillRect(0, 0, cv.width, cv.height); c.drawImage(img, 0, 0, cv.width, cv.height); cv.toBlob(function (b) { download(b, name); }); };
    img.onerror = function () { X.toast('이미지를 만들지 못했어요'); }; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
  }
  function download(b, name) { var u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(function () { URL.revokeObjectURL(u); }, 1000); X.toast('이미지를 저장했어요'); }
  function copy(text, okMsg) { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { X.toast(okMsg); }, function () { X.toast('복사하지 못했어요. 직접 선택해서 복사해 주세요.'); }); }

  /* ───── 이벤트 ───── */
  function refreshPane(el, keepScroll) { var y = window.scrollY; el.querySelector('#tabpane').innerHTML = paneHtml(); if (st.tab === 'int') { setupCard(el); if (navigator.canShare) { var n = el.querySelector('#nshare'); if (n) n.hidden = false; } } if (keepScroll) window.scrollTo(0, y); }
  function setTab(el, k) { st.tab = k; st.aiOpen = false; el.querySelector('.rtabwrap').outerHTML = tabsBar(); refreshPane(el, false); var top = el.querySelector('.rtabwrap').getBoundingClientRect().top + window.scrollY - 0; window.scrollTo(0, Math.max(0, top - 1)); X.ev('fortune_tab', { tab: k }); }
  function refreshPrompt(el) { var p = el.querySelector('#aip'); if (p) p.value = aiPrompt('int'); }
  function bind(el) {
    root = el; refreshPane(el, false);
    el.addEventListener('click', function (e) {
      if (e.target.id === 'colov') { closeCollection(el); return; }
      var t = e.target.closest('[data-tab],[data-topic],[data-lay],[data-act2]'); if (!t) return;
      if (t.hasAttribute('data-tab')) { setTab(el, t.getAttribute('data-tab')); return; }
      if (t.hasAttribute('data-topic')) { st.topic = t.getAttribute('data-topic'); el.querySelector('#cmpbody').innerHTML = compareHtml(); X.ev('fortune_topic', { topic: st.topic }); return; }
      if (t.hasAttribute('data-lay')) { if (st.tab === 'ziwei') st.zwLayer = t.getAttribute('data-lay'); else st.astroLayer = t.getAttribute('data-lay'); refreshPane(el, true); return; }
      var a = t.getAttribute('data-act2');
      if (a === 'save') { cardBlob(el, function (b) { download(b, 'donbuff-2027-fortune-card.png'); X.ev('fortune_share', { channel: 'image' }); }); }
      else if (a === 'cards') { openCollection(el); }
      else if (a === 'cardsx') { closeCollection(el); }
      else if (a === 'link') { copy(location.origin + '/fortune/?utm_source=share&utm_medium=link&utm_campaign=fortune2027', '링크를 복사했어요'); X.ev('fortune_share', { channel: 'link' }); }
      else if (a === 'nshare') { cardBlob(el, function (b) { var f = new File([b], 'donbuff-2027-fortune-card.png', { type: 'image/png' }); var d = { files: [f], title: '돈버프 새해 재테크 운세', text: '나의 2027년 행운 카드 · donbuff.com' }; if (navigator.canShare(d)) navigator.share(d).then(function () { X.ev('fortune_share', { channel: 'native' }); }, function () {}); else X.toast('이 기기에서는 이미지 공유를 지원하지 않아요'); }); }
      else if (a === 'imgdl') { var k = t.getAttribute('data-tab-k'), hl0 = st.hl; st.hl = false; st.pinfo = false; st.noDates = true; var cp = compose(k); st.hl = hl0; st.noDates = false; rasterize(cp.svg, cp.w, cp.h, 'donbuff-' + k + '-2027.png'); X.ev('fortune_map', { action: 'save', system: k }); }
      else if (a === 'datacopy') { var k2 = t.getAttribute('data-tab-k'); copy(TITLE[k2] + '\n' + dataText(k2, true), '데이터를 복사했어요. 붙여 넣는 곳으로 내용이 전달돼요.'); X.ev('fortune_map', { action: 'copy', system: k2 }); }
      else if (a === 'aiopen') { st.aiOpen = !st.aiOpen; var bx = el.querySelector('#aibox'); bx.hidden = !st.aiOpen; if (st.aiOpen) { bx.innerHTML = builderPanel(); X.ev('fortune_ai_open'); } }
      else if (a === 'aicopy') { if (!st.aiOk) { X.toast('먼저 안내 확인에 체크해 주세요'); return; } copy(el.querySelector('#aip').value, '프롬프트를 복사했어요'); X.ev('fortune_ai_copy'); }
    });
    el.addEventListener('change', function (e) {
      var id = e.target.id;
      if (id === 'ai2027') { st.ai2027 = e.target.checked; refreshPrompt(el); }
      else if (id === 'aiuse') { S.useAi = e.target.checked; refreshPrompt(el); }
      else if (id === 'aiok') { st.aiOk = e.target.checked; var cb = el.querySelector('#aicopy'); if (cb) cb.disabled = !st.aiOk; }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var ov = el.querySelector('#colov'); if (ov && !ov.hidden) closeCollection(el); } });
    el.addEventListener('input', function (e) { if (e.target.id === 'aiextra') { st.extra = e.target.value.slice(0, 100); refreshPrompt(el); } });
  }
  window.DBR = { html: html, bind: bind };
})();
