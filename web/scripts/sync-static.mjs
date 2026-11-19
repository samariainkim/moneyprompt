// 저장소 루트의 기존 정적 페이지를 web/public 으로 복사한다. (루트 파일은 그대로 둔다)
// 개발·테스트 문서(tests, *.md)는 복사하지 않는다.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify } from 'terser';
import vm from 'node:vm';
import { navHtml, allBtnHtml, megaInnerHtml, mobileListHtml, footerHtml } from '../redesign/shared/chrome.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const out = join(here, '..', 'public');

const ITEMS = [
  'index.html', 'manifest.json', 'icon-512.png', 'book-cover.png', 'favicon.ico',
  'assets', 'calc', 'fee', 'prompt', 'invest-mbti', 'new', 'archive',
];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

let n = 0;
for (const item of ITEMS) {
  const src = join(root, item);
  if (!existsSync(src)) { console.warn(`[sync-static] 없음, 건너뜀: ${item}`); continue; }
  cpSync(src, join(out, item), {
    recursive: true,
    filter: (p) => { const b = basename(p); return b !== 'tests' && !b.endsWith('.md'); },
  });
  n++;
}
console.log(`[sync-static] ${n}개 항목을 web/public 으로 복사했습니다.`);

// ───────── 리뉴얼 페이지 (web/redesign) ─────────
// pages.json 의 스위치에 따라, 켜진 주소의 파일을 새 디자인 페이지로 바꿔 넣는다. 저장소 루트의 원본은 그대로 둔다.
//  - 운영(VERCEL_ENV=production)은 production 목록, 그 외(미리보기·로컬)는 preview 목록을 쓴다.
const RD_DIR = join(here, '..', 'redesign');
const rdCfg = JSON.parse(readFileSync(join(RD_DIR, 'pages.json'), 'utf8'));
const rdEnv = process.env.VERCEL_ENV === 'production' ? 'production' : 'preview';
const rdOn = (rdCfg[rdEnv] || []).filter((u) => rdCfg.pages[u]);
const menuCfg = JSON.parse(readFileSync(join(RD_DIR, 'data', 'menu.json'), 'utf8'));
const isOn = (p) => rdOn.includes(p.endsWith('/') ? p : p + '/'); // 헤더·메뉴·푸터 링크는 이 환경에서 켜진 페이지만
// Next.js 앱(회원 화면)이 그리는 주소: 정적 파일은 만들지 않지만, 공통 틀(frame.css·member.css 등)은 같이 내보낸다.
const rdNextOn = (rdCfg[rdEnv] || []).filter((u) => (rdCfg.nextPages || []).includes(u));
const targetOf = (u) => (u === '/' ? 'index.html' : join(u.replace(/^\/|\/$/g, ''), 'index.html'));

// ───────── 투자 성향 '8가지 성향' 소개 페이지: 검사 원본(invest-mbti/index.html)의 데이터에서 만든다 ─────────
const MBTI_AXES_COPY = { // 갈림길 제목(소개 페이지 문구)
  decision: ['01', '결정 방식', '결론은 어디서 얻나요?'],
  information: ['02', '정보를 보는 방식', '무엇을 먼저 보나요?'],
  judgment: ['03', '판단 기준', '무엇으로 판단하나요?'],
  operation: ['04', '운영 방식', '어떻게 지켜보나요?']
};
const escHtml = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function mbtiPathsHtml() {
  const src = readFileSync(join(root, 'invest-mbti', 'index.html'), 'utf8');
  const code = ['AXES', 'AXIS_POLES', 'AXIS_LABELS', 'KEYWORDS_RAW', 'SCENARIOS'].map((n) => extractConst(src, n)).join('\n');
  const reflect = extractConst(readFileSync(join(RD_DIR, 'pages', 'mbti-reflect.js'), 'utf8'), 'POLE_REFLECT');
  const d = vm.runInNewContext(`${code}\n${reflect}\n;({ AXES, AXIS_POLES, AXIS_LABELS, KEYWORDS_RAW, SCENARIOS, POLE_REFLECT })`);
  if (d.AXES.length !== 4 || d.SCENARIOS.length !== 4) throw new Error('[sync-static] 투자 성향 데이터(축·갈림길)가 4개가 아닙니다.');
  const card = (pole, side, scn) => {
    const l = d.AXIS_LABELS[pole], kw = d.KEYWORDS_RAW[pole], r = d.POLE_REFLECT[pole];
    if (!l || !l.name || !l.descLong || !Array.isArray(kw) || kw.length < 3 || !r || !r.s || !r.c) throw new Error(`[sync-static] 성향 '${pole}' 의 설명 데이터가 부족합니다.`);
    return `<div class="pcard ${side}"><div class="ph"><i>${pole}</i><div><b class="serif">${escHtml(l.name)}</b><small>${escHtml(l.en)}</small></div></div>
<p class="pd">${escHtml(l.descLong)}</p>
<div class="blk"><span class="bl">이런 단어에 끌려요</span><div class="kw">${kw.map((k) => `<span>${escHtml(k)}</span>`).join('')}</div></div>
<div class="blk"><span class="bl">갈림길에서는</span><p class="q">“${escHtml(scn)}”</p></div>
<div class="two"><div class="st"><span class="bl">강점</span><p>${escHtml(r.s)}</p></div><div class="ca"><span class="bl">주의할 점</span><p>${escHtml(r.c)}</p></div></div></div>`;
  };
  return d.AXES.map((axis, i) => {
    const [a, b] = d.AXIS_POLES[axis], sc = d.SCENARIOS.find((x) => x.axis === axis), copy = MBTI_AXES_COPY[axis];
    if (!sc || !copy) throw new Error(`[sync-static] 갈림길 데이터가 없습니다: ${axis}`);
    const text = (pole) => (sc.A.pole === pole ? sc.A.text : sc.B.pole === pole ? sc.B.text : null);
    if (!text(a) || !text(b)) throw new Error(`[sync-static] 갈림길 선택지와 성향이 맞지 않습니다: ${axis}`);
    return `<section class="ax" id="path-${axis}"><div class="ax-h"><span class="no serif">${copy[0]}</span><div><small>${copy[1]}</small><h2 class="serif">${copy[2]}</h2><p class="sit">상황: ${escHtml(sc.situation.replace(/\n/g, ' '))}</p></div></div>
<div class="vs">${card(a, 'l', text(a))}<div class="vsm"><span>VS</span></div>${card(b, 'r', text(b))}</div></section>`;
  }).join('\n');
}
// 프롬프트 개수는 데이터에서 자동으로 센다. (프롬프트가 늘면 화면의 숫자도 따라간다)
// 기존 prompt/index.html 의 데이터 상수(const NAME = …;)를 문장 끝까지 정확히 잘라 낸다. (문자열·템플릿 리터럴·주석 안의 괄호·세미콜론은 무시)
// ───────── MONEY BRIEF(카드뉴스) 홈: web/redesign/data/brief.json 에서 만든다 ─────────
// 호가 늘면 brief.json 에 항목을 추가하고 카드 이미지(img/brief/<id>/01~07.jpg)만 넣으면 된다.
function briefParts() {
  const data = JSON.parse(readFileSync(join(RD_DIR, 'data', 'brief.json'), 'utf8'));
  const issues = [...data.issues].sort((a, b) => b.no - a.no);
  if (!issues.length) throw new Error('[sync-static] brief.json 에 발행된 호가 없습니다.');
  const nos = new Set();
  const imgPath = (id, n) => join(RD_DIR, 'img', 'brief', id, `${String(n).padStart(2, '0')}.jpg`);
  const src = (id, n) => `/redesign/img/brief/${id}/${String(n).padStart(2, '0')}.jpg`;
  for (const it of issues) {
    if (nos.has(it.no)) throw new Error(`[sync-static] brief.json 호 번호 중복: ${it.no}`);
    nos.add(it.no);
    if (!/^\d{3}$/.test(it.id) || !it.title || !it.short || !it.topic || !it.category || !it.base_date) throw new Error(`[sync-static] brief.json ${it.no}호 필수 항목(id·title·short·topic·category·base_date)이 비었습니다.`);
    if (!Array.isArray(it.cards) || it.cards.length !== 7) throw new Error(`[sync-static] brief.json ${it.no}호 카드가 7장이 아닙니다.`);
    it.cards.forEach((c, i) => {
      if (c.n !== i + 1) throw new Error(`[sync-static] brief.json ${it.no}호 카드 번호가 순서와 다릅니다.`);
      if (!c.alt || c.alt.length < 20) throw new Error(`[sync-static] brief.json ${it.no}호 ${c.n}번 카드의 대체 텍스트(alt)가 너무 짧습니다.`);
      if (!existsSync(imgPath(it.id, c.n))) throw new Error(`[sync-static] 카드 이미지가 없습니다: img/brief/${it.id}/${String(c.n).padStart(2, '0')}.jpg`);
      if (c.link) {
        const l = c.link;
        if (!/^(\/[^/]|https:\/\/)/.test(l.href || '') || !l.label) throw new Error(`[sync-static] brief.json ${it.no}호 ${c.n}번 카드 링크가 올바르지 않습니다.`);
        for (const k of ['x', 'y', 'w', 'h']) if (typeof l[k] !== 'number' || l[k] < 0 || l[k] > 100) throw new Error(`[sync-static] brief.json ${it.no}호 ${c.n}번 카드 링크 영역(${k})이 0~100 이 아닙니다.`);
      }
    });
  }
  for (const h of data.hero || []) { const [id, n] = h.split('/'); if (!existsSync(imgPath(id, Number(n)))) throw new Error(`[sync-static] 히어로 이미지가 없습니다: ${h}`); }
  const latest = issues[0];
  const strip = (it) => it.cards.map((c) => `<button type="button" class="bc" data-n="${c.n}" aria-label="${it.no}호 ${c.n}번 카드 크게 보기"><img src="${src(it.id, c.n)}" alt="${escHtml(c.alt)}" width="1080" height="1350" loading="${c.n <= 3 ? 'eager' : 'lazy'}" decoding="async"></button>`).join('');
  const latestHtml = `<section class="sec" id="latest"><div class="wrap">
 <div class="eyebrow" id="bfEyebrow">LATEST · 최신호</div><h2 id="bfH2">지금 가장 먼저 볼 카드뉴스</h2><p class="ld" id="bfLd" hidden></p>
 <div class="lh"><span class="tag"><span id="bfNo">No.${latest.no}</span> <em id="bfCat">${escHtml(latest.category)}</em></span><h3 id="bfTitle">${escHtml(latest.title)}</h3></div>
 <div class="strip"><div class="rail" id="bfRail" role="group" aria-label="카드뉴스 카드 목록">${strip(latest)}</div>
  <button type="button" class="go prev" id="bfPrev" aria-label="이전 카드" hidden>‹</button><button type="button" class="go next" id="bfNext" aria-label="다음 카드">›</button></div>
 <div class="hintc">🔍 카드를 누르면 크게 볼 수 있어요</div>
</div></section>`;
  const archiveHtml = issues.length < 2 ? '' : `<section class="sec" id="archive"><div class="wrap"><div class="eyebrow">ARCHIVE</div><h2 class="h2s">지난 MONEY BRIEF</h2><p class="ld">놓친 호도 카드로 다시 볼 수 있어요.</p>
<div class="pp">${issues.map((it) => `<a href="?n=${it.no}" data-n="${it.no}"${it === latest ? ' aria-current="true"' : ''}><div class="cv${it === latest ? ' cur' : ''}"><img src="${src(it.id, 1)}" alt="" width="1080" height="1350" loading="lazy" decoding="async"></div><h4>No.${it.no}</h4><p>${escHtml(it.short)}</p></a>`).join('')}</div></div></section>`;
  // 메인 페이지 배너: 최신 3개 호의 표지(번호순)와 최신호 제목
  const bannerFigs = issues.slice(0, 3).reverse().map((it) => `<figure><img src="${src(it.id, 1)}" alt="" width="1080" height="1350" loading="lazy" decoding="async"><figcaption>No.${it.no} ${escHtml(it.topic)}</figcaption></figure>`).join('');
  const bannerHtml = `<a class="bfx" id="svc-brief" href="/brief/" data-ga="brief_banner"><div><div class="ck">MONEY BRIEF · 돈 되는 뉴스</div><h3>돈 되는 최신 금융 정보를<br><em>한 눈에</em>, 내게 맞는 솔루션까지!</h3>
<div class="l1">정책과 금리, 수수료가 바뀌면 내 돈은 얼마가 달라질까요? 쉽게 정리해 드려요.</div>
<div class="new"><i>No.${latest.no}</i>${escHtml(latest.title)}</div><span class="go">뉴스 보러가기 →</span></div>
<div class="cards">${bannerFigs}</div></a>`;
  const hero = (data.hero || []).map((h) => { const [id, n] = h.split('/'); return `<img src="${src(id, Number(n))}" alt="" width="1080" height="1350" loading="eager" decoding="async">`; }).join('');
  const json = JSON.stringify({ issues: issues.map((it) => ({ no: it.no, id: it.id, category: it.category, title: it.title, base_date: it.base_date, cards: it.cards.map((c) => ({ n: c.n, alt: c.alt, ...(c.link ? { link: c.link } : {}) })) })) }).replace(/</g, '\\u003c');
  return { latestHtml, archiveHtml, hero, json, bannerHtml };
}
function extractConst(src, name) {
  const m = new RegExp(`(^|\\n)const ${name}\\s*=`).exec(src);
  if (!m) throw new Error(`[sync-static] 원본 페이지에서 const ${name} 를 찾지 못했습니다.`);
  const start = m.index + (m[1] ? 1 : 0);
  let i = src.indexOf('=', start) + 1, depth = 0;
  const tpl = []; // 템플릿 리터럴 안의 ${ } 깊이 기록
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i = src.indexOf('*/', i + 2) + 2; continue; }
    if (c === '"' || c === "'") { const q = c; i++; while (src[i] !== q) { if (src[i] === '\\') i++; i++; } i++; continue; }
    if (c === '`') {
      i++;
      for (;;) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '`') { i++; break; }
        if (src[i] === '$' && src[i + 1] === '{') { tpl.push(depth); depth = 0; i += 2; break; }
        i++;
      }
      continue;
    }
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') {
      if (c === '}' && depth === 0 && tpl.length) { depth = tpl.pop(); i++; // ${ } 끝 → 템플릿 문자열 이어서 읽기
        for (;;) { if (src[i] === '\\') { i += 2; continue; } if (src[i] === '`') { i++; break; } if (src[i] === '$' && src[i + 1] === '{') { tpl.push(depth); depth = 0; i += 2; break; } i++; }
        continue; }
      depth--;
    } else if (c === ';' && depth === 0 && !tpl.length) return src.slice(start, i + 1);
    i++;
  }
  throw new Error(`[sync-static] const ${name} 의 끝을 찾지 못했습니다.`);
}
const PROMPT_DATA = ['AI_LINKS', 'PROMPTS', 'REVIEWS', 'CHALLENGE_REVIEWS', 'NEW_PROMPTS', 'catSections', 'catLabels'];
function promptData() {
  const src = readFileSync(join(root, 'prompt', 'index.html'), 'utf8').replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/g, '');
  const code = PROMPT_DATA.map((n) => extractConst(src, n)).join('\n');
  // 잘라 낸 코드가 올바른지 실제로 실행해서 검증한다. (이상하면 빌드를 멈춘다)
  const r = vm.runInNewContext(`${code}\n;({ prompts: PROMPTS, links: AI_LINKS, sections: catSections, labels: catLabels, reviews: REVIEWS.length + CHALLENGE_REVIEWS.length, news: NEW_PROMPTS.length })`, {});
  if (!Array.isArray(r.prompts) || r.prompts.length < 100) throw new Error(`[sync-static] 프롬프트 데이터가 이상합니다(${r.prompts && r.prompts.length}개).`);
  for (const p of r.prompts) if (!p.idx || !p.cat || !p.title || !p.prompt || !p.ai || !p.level) throw new Error(`[sync-static] 프롬프트 항목에 빠진 값이 있습니다: ${p.idx}`);
  if (new Set(r.prompts.map((p) => p.idx)).size !== r.prompts.length) throw new Error('[sync-static] 프롬프트 번호(idx)가 중복됩니다.');
  for (const p of r.prompts) if (!r.sections.includes(p.cat)) throw new Error(`[sync-static] catSections 에 없는 카테고리: ${p.cat}`);
  return { code, prompts: r.prompts };
}
// 프롬프트 개수는 데이터에서 자동으로 센다. (프롬프트가 늘면 화면의 숫자도 따라간다)
function promptStats() {
  const { prompts } = promptData();
  const byCat = {}; for (const p of prompts) byCat[p.cat] = (byCat[p.cat] || 0) + 1;
  return { total: prompts.length, categories: Object.keys(byCat).length, ais: new Set(prompts.map((p) => p.ai)).size, byCat };
}
// 연말정산 체크업: 규칙·프롬프트 JSON 을 페이지에 직접 넣는다(별도 내려받기 없음). 빌드가 데이터 일관성을 확인하고 이상하면 멈춘다.
function yearendDataHtml() {
  const dir = join(RD_DIR, 'data', 'yearend');
  const R = JSON.parse(readFileSync(join(dir, 'rules.v0.3.1.json'), 'utf8'));
  const P = JSON.parse(readFileSync(join(dir, 'prompt.v0.2.0.json'), 'utf8'));
  if (R.tax_year !== P.tax_year) throw new Error('[sync-static] 연말정산 규칙과 프롬프트의 귀속연도가 다릅니다.');
  if (!R.profiles || !R.profiles[R.meta.profile]) throw new Error('[sync-static] 연말정산 배포 기준(meta.profile)이 올바르지 않습니다.');
  for (const q of R.questions) for (const o of q.options) if (!(P.labels[q.id] && P.labels[q.id][o])) throw new Error(`[sync-static] 연말정산 선택지 라벨 없음: ${q.id}.${o}`);
  for (const it of R.items) for (const row of it.rows) if (!(P.rows[it.id] && P.rows[it.id][row.id])) throw new Error(`[sync-static] 연말정산 프롬프트 문구 없음: ${it.id}.${row.id}`);
  for (const c of R.common) if (!P.common_rows[c.id]) throw new Error(`[sync-static] 연말정산 공통 확인 문구 없음: ${c.id}`);
  const j = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
  return `<script type="application/json" id="yeRules">${j(R)}</script><script type="application/json" id="yePrompt">${j(P)}</script>`;
}
function renderRedesign(html, ctx) {
  html = html.replace(/<!--@header([^>]*)-->/g, (_, a) => {
    const attrs = Object.fromEntries([...a.matchAll(/(\w+)=(\w+)/g)].map((m) => [m[1], m[2]]));
    let h = readFileSync(join(RD_DIR, 'partials', attrs.variant === 'book' ? 'header-book.html' : 'header.html'), 'utf8');
    h = h.replace('{{over}}', attrs.over === '1' ? ' over' : '');
    // 헤더·전체 메뉴는 menu.json 에서 만든다. 이 환경에서 꺼진 페이지(예: 운영에서 아직 안 연 서비스)는 자동으로 빠진다(죽은 링크 없음).
    h = h.replace('{{nav}}', navHtml(menuCfg, isOn, { active: attrs.active })).replace('{{all_btn}}', allBtnHtml())
      .replace('{{mega}}', megaInnerHtml(menuCfg, isOn)).replace('{{mobile_list}}', mobileListHtml(menuCfg, isOn));
    return h;
  });
  html = html.replace(/<!--@footer([^>]*)-->/g, (_, a) => {
    const extra = /extra=copyright/.test(a) ? '이 페이지의 프롬프트는 개인 학습 목적으로만 활용하세요.' : '';
    return readFileSync(join(RD_DIR, 'partials', 'footer.html'), 'utf8').replace('{{footer}}', () => footerHtml(menuCfg, isOn, extra));
  });
  // 책 표지: web/redesign/img/book-cover.jpg 가 있을 때만 보여 준다(없으면 표지 없이 글만 — 깨진 이미지 없음).
  html = html.replace(/<!--@bookcover-->/g, () => (existsSync(join(RD_DIR, 'img', 'book-cover.jpg')) ? '<div class="bk-cover"><img src="/redesign/img/book-cover.jpg" width="823" height="1200" alt="『AI로 부자되기』 책 표지 — 김태형 지음, 한빛미디어"></div>' : ''));
  // 프롬프트 페이지 → 책 소개 페이지 링크: /book/ 이 이 환경에서 켜져 있을 때만.
  html = html.replace(/<!--@bookpage-->/g, () => (isOn('/book/') ? '<a class="btn line" href="/book/" data-ga="book_page">📘 책 소개 보기</a>' : ''));
  html = html.replace(/<!--@mbtipaths-->/g, () => mbtiPathsHtml());
  if (/<!--@brief(latest|archive|hero|data|banner)-->/.test(html)) {
    const b = briefParts();
    html = html.replace(/<!--@brieflatest-->/g, () => b.latestHtml).replace(/<!--@briefarchive-->/g, () => b.archiveHtml)
      .replace(/<!--@briefbanner-->/g, () => (ctx.briefOn ? b.bannerHtml : '')).replace(/<!--@briefhero-->/g, () => b.hero).replace(/<!--@briefdata-->/g, () => `<script type="application/json" id="briefData">${b.json}</script>`);
  }
  html = html.replace(/<!--@yearenddata-->/g, () => yearendDataHtml());
  html = html.replace(/<!--@promptdata-->/g, () => `<script data-prompt-data>\n${promptData().code}\n</script>`);
  html = html.replace(/\{\{TOTAL\}\}/g, String(ctx.total)).replace(/\{\{CATEGORIES\}\}/g, String(ctx.categories)).replace(/\{\{AIS\}\}/g, String(ctx.ais));
  html = html.replace(/\{\{N:([^}]+)\}\}/g, (_, c) => { if (!(c in ctx.byCat)) throw new Error(`[sync-static] 프롬프트 카테고리 '${c}' 를 찾지 못했습니다.`); return String(ctx.byCat[c]); });
  if (/\{\{[^}]+\}\}/.test(html)) throw new Error('[sync-static] 리뉴얼 페이지에 채워지지 않은 {{…}} 가 남았습니다.');
  return html;
}
if (rdOn.length || rdNextOn.length) {
  const ctx = promptStats();
  ctx.briefOn = rdOn.includes('/brief/');
  for (const u of rdOn) {
    const out2 = join(out, targetOf(u));
    mkdirSync(dirname(out2), { recursive: true });
    writeFileSync(out2, renderRedesign(readFileSync(join(RD_DIR, 'pages', rdCfg.pages[u]), 'utf8'), ctx));
  }
  // 카드뉴스 이미지(img/brief)는 /brief/ 가 켜진 환경에서만 내보낸다.
  cpSync(join(RD_DIR, 'img'), join(out, 'redesign', 'img'), { recursive: true, filter: (p) => rdOn.includes('/brief/') || !/[\\/]img[\\/]brief([\\/]|$)/.test(p) });
  cpSync(join(RD_DIR, 'shared', 'frame.css'), join(out, 'redesign', 'frame.css'));
  cpSync(join(RD_DIR, 'shared', 'frame.js'), join(out, 'redesign', 'frame.js'));
  for (const f of readdirSync(join(RD_DIR, 'pages'))) if (f.endsWith('.css') || f.endsWith('.js')) cpSync(join(RD_DIR, 'pages', f), join(out, 'redesign', f));
  console.log(`[sync-static] 리뉴얼 페이지(${rdEnv}) ${rdOn.length}개 적용: ${rdOn.join(', ')}  · 프롬프트 ${ctx.total}개`);
  if (rdNextOn.length) console.log(`[sync-static] 리뉴얼 회원 화면(${rdEnv}) ${rdNextOn.length}개: ${rdNextOn.join(', ')}`);
} else {
  console.log(`[sync-static] 리뉴얼 페이지(${rdEnv}): 적용 없음 — 기존 페이지 그대로`);
}

// 로그인 메뉴 스크립트(web/static/auth-nav.js)를 복사된 모든 HTML 의 <head> 에 직접(inline) 끼워 넣는다.
// 별도 파일로 내려받으면 헤더가 먼저 그려지고 버튼이 늦게 나타나므로, 내려받는 시간이 없도록 페이지 안에 넣는다.
// 저장소 루트의 원본 페이지는 수정하지 않는다.
// 페이지 안에 직접 넣는 스크립트는 작게 만든다. (실패하면 원본을 그대로 쓴다)
async function small(file) {
  const src = readFileSync(join(here, '..', 'static', file), 'utf8');
  try { const r = await minify(src, { compress: true, mangle: true, format: { comments: false } }); return r.code || src; }
  catch (e) { console.warn(`[sync-static] ${file} 최소화 실패, 원본 사용: ${e.message}`); return src; }
}
const AUTH_NAV_JS = await small('auth-nav.js');
if (AUTH_NAV_JS.toLowerCase().includes('</script')) throw new Error('auth-nav.js 에 </script 가 있으면 inline 삽입이 깨집니다.');
const AUTH_GATES_JS = await small('auth-gates.js');
if (AUTH_GATES_JS.toLowerCase().includes('</script')) throw new Error('auth-gates.js 에 </script 가 있으면 inline 삽입이 깨집니다.');
const GA_EXTRA_JS = await small('ga-extra.js');
if (GA_EXTRA_JS.toLowerCase().includes('</script')) throw new Error('ga-extra.js 에 </script 가 있으면 inline 삽입이 깨집니다.');
// GA4 코드가 빠진 페이지에 기본 코드를 넣는다. (측정 ID 는 다른 페이지·Next 앱과 같다)
const GA_ID = 'G-GW588P483F';
const GA_BASE = `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');</script>`;
// 파비콘·홈 화면 아이콘: 아이콘 링크가 없는 페이지에 넣는다. (탭=심볼만 favicon.ico·32px, iOS·앱=크림 타일)
const ICON_TAGS = `<link rel="icon" href="/favicon.ico" sizes="48x48">\n<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/icon-32.png">\n<link rel="apple-touch-icon" sizes="180x180" href="/assets/brand/apple-touch-icon.png">`;
// 테스트 주소(*.vercel.app, 미리보기 등)에서는 GA4 를 보내지 않는다. donbuff.com 에서만 측정. (공식 옵트아웃 스위치)
const GA_OPTOUT = `<script data-dbx-ga-optout>if(!/(^|\\.)donbuff\\.com$/.test(location.hostname)){window['ga-disable-${GA_ID}']=true}</script>`;
const MARK = 'data-dbx-auth-nav';
const TAG = `<script ${MARK}>${AUTH_NAV_JS}</script>`;
// 로그인 게이트는 필요한 페이지에만 넣는다. (경로는 public 기준)
const GATE_PAGES = new Set([
  'calc/brokerage/index.html', 'calc/fx/index.html', 'calc/loan-prepay/index.html', 'calc/dsr/index.html',
  'fee/brokerage-fee/index.html', 'invest-mbti/index.html', 'prompt/index.html', 'yearend/checkup/index.html',
]);
const GATE_TAG = `<script data-dbx-gates>${AUTH_GATES_JS}</script>`;
let gated = 0;
let injected = 0;
let gaAdded = 0;
let iconAdded = 0;
let relinked = 0;
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { walk(full); continue; }
    const ext = extname(name).toLowerCase();
    // 로고·푸터의 href="https://donbuff.com" 은 시험 환경에서 본 사이트로 빠지므로 같은 도메인 기준 "/" 로 바꾼다.
    // (og:image, canonical, 공유용 주소 등 href 가 아닌 절대주소는 그대로 둔다. 도메인 전환 후에도 동작은 같다.)
    if (ext === '.html' || ext === '.js') {
      const src = readFileSync(full, 'utf8');
      const out2 = src.replace(/href="https:\/\/donbuff\.com\/?"/g, 'href="/"');
      if (out2 !== src) { writeFileSync(full, out2); relinked++; }
    }
    if (ext !== '.html') continue;
    let html = readFileSync(full, 'utf8');
    if (html.includes(MARK)) continue;
    // <head> 끝에 넣어, 헤더가 생기는 즉시 버튼을 붙인다. (head 가 없으면 body 끝)
    const headOpen = /<head[^>]*>/i.exec(html);
    if (headOpen) html = html.slice(0, headOpen.index + headOpen[0].length) + '\n' + GA_OPTOUT + html.slice(headOpen.index + headOpen[0].length);
    const lower = html.toLowerCase();
    const h = lower.indexOf('</head>');
    const i = h >= 0 ? h : lower.lastIndexOf('</body>');
    const rel = full.slice(out.length + 1).split('\\').join('/');
    const needsIcon = !/<link[^>]+rel=["'](?:shortcut )?icon["']/i.test(html);
    if (needsIcon) iconAdded++;
    const needsGa = !/gtag\(\s*['"]config['"]/.test(html);
    if (needsGa) gaAdded++;
    // 순서: (GA 기본 코드) → 로그인 메뉴 → 보완 측정 → (로그인 게이트)
    const tags = (needsIcon ? ICON_TAGS + '\n' : '') + (needsGa ? GA_BASE + '\n' : '') + TAG + `\n<script data-dbx-ga>${GA_EXTRA_JS}</script>` + (GATE_PAGES.has(rel) ? '\n' + GATE_TAG : '');
    if (GATE_PAGES.has(rel)) gated++;
    html = i >= 0 ? html.slice(0, i) + tags + '\n' + html.slice(i) : html + '\n' + tags + '\n';
    writeFileSync(full, html);
    injected++;
  }
};
walk(out);
console.log(`[sync-static] 로그인 메뉴 스크립트를 HTML ${injected}개에 삽입했습니다.`);
console.log(`[sync-static] donbuff.com 절대 링크를 상대 링크로 바꾼 파일 ${relinked}개.`);
console.log(`[sync-static] 파비콘 링크를 넣은 페이지 ${iconAdded}개.`);
console.log(`[sync-static] GA4 기본 코드를 새로 넣은 페이지 ${gaAdded}개.`);
console.log(`[sync-static] 로그인 게이트를 ${gated}개 페이지에 삽입했습니다.`);
// 새 디자인 페이지만 있는 미공개 계산기(운영에서는 페이지가 생성되지 않음)는 이 환경에서 꺼져 있으면 기대 개수에서 뺀다.
const GATE_OPTIONAL = { 'calc/dsr/index.html': '/calc/dsr/', 'yearend/checkup/index.html': '/yearend/checkup/' };
const gateExpected = [...GATE_PAGES].filter((rel) => !(rel in GATE_OPTIONAL) || rdOn.includes(GATE_OPTIONAL[rel])).length;
if (gated !== gateExpected) throw new Error(`게이트 대상 ${gateExpected}개 중 ${gated}개만 삽입되었습니다. 경로를 확인하세요.`);
