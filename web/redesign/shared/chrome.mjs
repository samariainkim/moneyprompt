// 헤더·전체 메뉴·푸터를 menu.json 하나로 만든다. 정적 페이지(sync-static.mjs)와 Next 화면(RdChrome.tsx)이 같은 함수를 써서 모양이 어긋나지 않는다.
// isOn(path): 그 주소의 새 디자인 페이지가 지금 환경에서 켜져 있는가 (pages.json 기준).
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pagePath = (href) => (href || '').split('#')[0];

function itemVisible(it, isOn) {
  if (it.enabled === false) return false;
  if (!it.href) return false;
  return !it.requires || isOn(it.requires);
}

/** 한국시간 오늘 날짜(YYYY-MM-DD) */
function kstToday(now) { return new Date((now || new Date()).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10); }

export function hotIssue(menu, isOn, now) {
  const h = menu.hotIssue || {};
  if (!h.enabled || h.status !== 'public' || !h.href || !h.label) return null;
  if (h.requires && !isOn(h.requires)) return null;
  const d = kstToday(now);
  if (h.activeFrom && d < h.activeFrom) return null;
  if (h.activeTo && d > h.activeTo) return null;
  return h;
}

/** 특집 오픈 안내(상단 바·홈 카드·떠있는 카드). hotIssue 와 같은 방식으로 켜짐을 판단한다. */
export function announce(menu, isOn, now) {
  const a = menu.announce || {};
  if (!a.enabled || !a.href || !a.version) return null;
  if (a.requires && !isOn(a.requires)) return null;
  const d = kstToday(now);
  if (a.activeFrom && d < a.activeFrom) return null;
  if (a.activeTo && d > a.activeTo) return null;
  return a;
}

export function coreNav(menu, isOn) { return menu.core.filter((c) => isOn(pagePath(c.href))); }

export function categories(menu, isOn) {
  const out = [];
  for (const c of menu.categories) {
    const children = (c.children || []).filter((it) => itemVisible(it, isOn));
    const own = isOn(pagePath(c.href));
    if (!own && !children.length) continue;
    out.push({ ...c, children, linked: own });
  }
  return out;
}

function ga(id) { return ` data-ga="menu_${esc(id)}"`; }

/** PC 헤더 메뉴(핵심 링크 + HOT ISSUE + 전체 메뉴 버튼) — 정적 페이지용 HTML */
export function navHtml(menu, isOn, opts = {}, now) {
  const active = opts.active || '';
  let h = coreNav(menu, isOn).map((c) => `<a href="${esc(c.href)}" class="core${active === c.id ? ' cur' : ''}" data-nav="${esc(c.id)}"${active === c.id ? ' aria-current="page"' : ''}>${esc(c.label)}</a>`).join('');
  const hot = hotIssue(menu, isOn, now);
  if (hot) h += `<a href="${esc(hot.href)}" class="hot" data-ga="menu_hot"><i aria-hidden="true"></i>${esc(hot.label)}</a>`;
  return h;
}
export function allBtnHtml() {
  return '<button type="button" class="nav-all" id="megaBtn" aria-expanded="false" aria-controls="megaPanel"><span class="bgr" aria-hidden="true"></span>전체 메뉴</button>';
}

/** 메가메뉴 안쪽(PC) */
export function megaInnerHtml(menu, isOn, now) {
  const cols = categories(menu, isOn).map((c) => {
    const title = c.linked
      ? `<a href="${esc(c.href)}" data-ga="menu_${esc(c.id)}"><small>${esc(c.no)} ${esc(c.en)}</small><span>${esc(c.label)}</span></a>`
      : `<div class="mc-t"><small>${esc(c.no)} ${esc(c.en)}</small><span>${esc(c.label)}</span></div>`;
    const lis = c.children.map((it) => `<li><a href="${esc(it.href)}"${ga(it.id)}>${esc(it.label)}${it.new ? '<em class="nw">NEW</em>' : ''}</a></li>`).join('');
    return `<div class="mc"><h3>${title}</h3>${lis ? `<ul>${lis}</ul>` : ''}</div>`;
  }).join('');
  const hot = hotIssue(menu, isOn, now);
  const bottom = hot ? `<div class="mega-hot"><b>HOT ISSUE</b><a href="${esc(hot.href)}" data-ga="menu_hot">${esc(hot.label)}</a></div>` : '';
  return `<div class="mega-in"><div class="mgrid">${cols}</div>${bottom}</div>`;
}

/** 모바일 전체 메뉴 안쪽(아코디언) */
export function mobileListHtml(menu, isOn, now) {
  const hot = hotIssue(menu, isOn, now);
  let h = hot ? `<a class="mx-hot" href="${esc(hot.href)}" data-ga="menu_hot"><span><small>HOT ISSUE</small>${esc(hot.label)}</span><i aria-hidden="true">→</i></a>` : '';
  for (const c of categories(menu, isOn)) {
    const pid = `mx-${esc(c.id)}`;
    const t = c.linked
      ? `<a class="mx-t" href="${esc(c.href)}" data-ga="menu_${esc(c.id)}"><small>${esc(c.no)} ${esc(c.en)}</small>${esc(c.label)}</a>`
      : `<span class="mx-t"><small>${esc(c.no)} ${esc(c.en)}</small>${esc(c.label)}</span>`;
    const btn = c.children.length ? `<button type="button" class="mx-b" aria-expanded="false" aria-controls="${pid}" aria-label="${esc(c.label)} 펼치기"><i aria-hidden="true"></i></button>` : '';
    const panel = c.children.length ? `<div class="mx-p" id="${pid}" hidden>${c.children.map((it) => `<a href="${esc(it.href)}"${ga(it.id)}>${esc(it.label)}${it.new ? '<em class="nw">NEW</em>' : ''}</a>`).join('')}</div>` : '';
    h += `<div class="mx"><div class="mx-h">${t}${btn}</div>${panel}</div>`;
  }
  return h;
}

const ICONS = {
  youtube: '<path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2C.5 9.1.5 12 .5 12s0 2.9.5 4.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-4.8.5-4.8s0-2.9-.5-4.8zM9.7 15.5v-7l6 3.5-6 3.5z"/>',
  blog: '<path d="M16.3 12.6 7.6 3H3v18h4.7v-9.6L16.4 21H21V3h-4.7z"/>',
  kakao: '<path d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.8 5.2 4.6 6.6l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.5.1 1 .1 1.6.1 5.5 0 10-3.5 10-7.9S17.5 3 12 3z"/>',
  instagram: '<path d="M12 7.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2zM17.2 5.5a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2z"/><path d="M16 2H8a6 6 0 0 0-6 6v8a6 6 0 0 0 6 6h8a6 6 0 0 0 6-6V8a6 6 0 0 0-6-6zm4 14a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4z"/>',
  threads: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16z"/>',
  tiktok: '<path d="M16 3a5 5 0 0 0 4 4v3a8 8 0 0 1-4-1.2V15a6 6 0 1 1-6-6v3a3 3 0 1 0 3 3V3z"/>'
};

export function footerHtml(menu, isOn, extraNote) {
  const f = menu.footer;
  const sns = menu.sns.filter((s) => s.enabled && s.url).sort((a, b) => a.order - b.order)
    .map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc(s.label)}" data-tip="${esc(s.tip || s.url)}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[s.platform] || ''}</svg></a>`).join('');
  const links = f.links.map((l) => {
    if (!l.href || (l.requires && !isOn(l.requires))) return `<span class="off" aria-disabled="true">${esc(l.label)}</span>`;
    const ext = /^https?:|^mailto:/.test(l.href);
    return `<a href="${esc(l.href)}"${/^https?:/.test(l.href) ? ' target="_blank" rel="noopener"' : ''}>${esc(l.label)}</a>`;
  }).join('');
  return `<footer><div class="ft"><div class="ft-1"><div class="ft-brand"><img src="/redesign/img/symbol.png" alt=""><div><b>돈버프 DONBUFF</b><em>${esc(f.slogan)}</em></div></div><p class="ft-intro">${esc(f.intro)}</p></div>`
    + (sns ? `<div class="ft-sns" aria-label="돈버프 공식 채널">${sns}</div>` : '')
    + `</div><div class="ft-links">${links}</div><div class="ft-4"><p>${esc(f.disclaimer)}</p>${extraNote ? `<p>${esc(extraNote)}</p>` : ''}${f.rights ? `<p>${esc(f.rights)}</p>` : ''}<p>${esc(f.copyright)}</p></div></footer>`;
}
