#!/usr/bin/env python3
"""MONEY BRIEF 한 호(카드 7장)를 edition.json 하나로 만든다.

사용:
  python3 build_cards.py <작업폴더>            # 카드 PNG 7장 + 모아보기(sheet.jpg) + 알림용 meta
  python3 build_cards.py <작업폴더> --check    # 만들지 않고 edition.json 점검만(check_edition.py 와 같은 규칙)

작업폴더에는 edition.json 이 있어야 한다(형식: references/edition.md, 예시: assets/examples/).
결과: <작업폴더>/out/01~07.png, out/alt.json(카드 속 글자), out/metrics.json, sheet.jpg, nums.json(계산 엔진 값), meta.json(연동 링크 영역).
숫자는 edition.json 의 calc 항목(엔진 계산)에서만 가져온다: 본문에 {{loan_new.fee_krw|n}} 처럼 적는다.
"""
import html, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
SKILL = os.path.dirname(HERE)
TOTAL = 7


def repo_root():
    p = HERE
    while p != '/' and not os.path.isdir(os.path.join(p, '.git')):
        p = os.path.dirname(p)
    return p


# ───────── 글자 꾸밈: **굵게**, *오렌지 강조*, 줄바꿈 \n ─────────
def fmt(s):
    s = html.escape(str(s), quote=False)
    s = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', s)
    s = re.sub(r'\*(.+?)\*', r'<span class="hl">\1</span>', s)
    return s.replace('\n', '<br>')


# ───────── {{식|형식}} 채우기 ─────────
def _lookup(vals, ref):
    name, _, field = ref.partition('.')
    if name not in vals or field not in vals[name]:
        raise SystemExit(f"[build_cards] 계산 값 '{ref}' 를 찾지 못했습니다. calc 항목과 필드 이름을 확인하세요.")
    return vals[name][field]


def evaluate(expr, vals):
    refs = re.findall(r'[A-Za-z_][\w]*\.[A-Za-z_][\w]*', expr)
    if len(refs) == 1 and expr.strip() == refs[0]:
        return _lookup(vals, refs[0])
    py = expr
    for r in sorted(set(refs), key=len, reverse=True):
        py = py.replace(r, repr(float(_lookup(vals, r))))
    if not re.fullmatch(r'[0-9eE.+\-*/() \t]+', py):
        raise SystemExit(f"[build_cards] 허용되지 않는 식입니다: {expr}")
    v = eval(py, {'__builtins__': {}}, {})
    return int(round(v)) if abs(v - round(v)) < 1e-9 else v


def format_value(v, f):
    if f in (None, ''):
        return str(v)
    if f in ('n', 'won'):
        s = f'{int(v):,}'
        return s + ('원' if f == 'won' else '')
    if f in ('d1', 'd2', 'd3'):
        return f'{float(v):,.{int(f[1])}f}'
    if f == 'date':  # 2027-03-01 → 2027.3.1
        y, m, d = str(v).split('-')
        return f'{y}.{int(m)}.{int(d)}'
    if f == 'man':  # 약 N만 원(반올림)
        return f'{round(int(v) / 10000):,}'
    raise SystemExit(f"[build_cards] 알 수 없는 형식 '|{f}' (n, won, d1, d2, d3, man, date)")


def interpolate(obj, vals):
    if isinstance(obj, str):
        return re.sub(r'\{\{\s*([^}|]+?)\s*(?:\|\s*(\w+)\s*)?\}\}', lambda m: format_value(evaluate(m.group(1), vals), m.group(2)), obj)
    if isinstance(obj, list):
        return [interpolate(x, vals) for x in obj]
    if isinstance(obj, dict):
        return {k: interpolate(v, vals) for k, v in obj.items()}
    return obj


# ───────── 카드 틀 ─────────
def bar(i):
    return f'<div class="bar"><b>MONEY <i>BRIEF</i></b><span>{i:02d} / {TOTAL:02d}</span></div>'


def dots(i):
    return '<div class="dots">' + ''.join('<i class="on"></i>' if k == i else '<i></i>' for k in range(1, TOTAL + 1)) + '</div><div class="wm">DONBUFF</div>'


def src(t):
    return f'<div class="src">{fmt(t)}</div>'


def chip(c, ed):
    label, tag = c.get('label', ''), c.get('tag', '')
    return f'<div class="chip">{fmt(label)} <em>{fmt(tag)}</em></div>' if tag else f'<div class="chip">{fmt(label)}</div>'


def head(c):
    return f'<h2 style="font-size:{c.get("fs", 62)}px;margin-top:22px">{fmt(c["heading"])}</h2>'


def card_open(c, i, dark=False):
    cls = 'card' + (' dark' if dark else '') + (' warm' if c.get('bg') == 'warm' else '')
    return cls


def source_of(c, ed):
    return c.get('source') or ed.get('source_default', '')


def r_cover(c, i, ed):
    cat = ed['category'].split(' · ')
    tag = c.get('chip_tag') or (f'{cat[0]} <em>{cat[1]}</em>' if len(cat) == 2 else ed['category'])
    lines = c['title_lines']
    t = '<br>'.join(f'<u>{html.escape(x[1:-1], quote=False)}</u>' if x.startswith('*') and x.endswith('*') else html.escape(x, quote=False) for x in lines)
    pills = ''.join(f'<div><small>{fmt(p["label"])}</small><b{" class=o" if p.get("accent") else ""}>{fmt(p["value"])}</b></div>' for p in c.get('pills', []))
    return (f'<div class="card dark cover">{bar(i)}<div class="chip">{tag}</div><h1 class="t">{t}</h1>'
            f'<p class="s">{fmt(c["sub"])}</p><div class="num">{pills}</div>{dots(i)}</div>')


def r_points(c, i, ed):
    items = ''.join(f'<div class="pt"><div class="n">{k}</div><p>{fmt(x)}</p></div>' for k, x in enumerate(c['items'], 1))
    mini = f'<div class="mini">{fmt(c["mini"])}</div>' if c.get('mini') else ''
    note = f'<span class="note">{fmt(c["note"])}</span>' if c.get('note') else ''
    return f'<div class="{card_open(c, i)}">{bar(i)}<div class="body">{chip(c, ed)}{head(c)}{items}{mini}{note}</div>{src(source_of(c, ed))}{dots(i)}</div>'


def r_boxes(c, i, ed):
    note = f'<span class="note">{fmt(c["note"])}</span>' if c.get('note') else ''
    if c.get('layout') == 'two':
        bx = ''.join(f'<div class="box{" on" if b.get("dark") else ""}"><span class="tag">{fmt(b["tag"])}</span><h3>{fmt(b["title"])}</h3><p>{fmt(b["text"])}</p></div>' for b in c['boxes'])
        body = f'<div class="two">{bx}</div>{note}'
    else:
        bx = ''.join(f'<div class="lbx{" on" if b.get("dark") else ""}"><span class="tag">{fmt(b["tag"])}</span><h3>{fmt(b["title"])}</h3><p>{fmt(b["text"])}</p></div>' for b in c['boxes'])
        body = bx + note
    return f'<div class="{card_open(c, i)}">{bar(i)}<div class="body">{chip(c, ed)}{head(c)}{body}</div>{src(source_of(c, ed))}{dots(i)}</div>'


def _cell(x):
    if isinstance(x, dict):
        return f'{fmt(x["t"])}<span class="s">{fmt(x["sub"])}</span>'
    return fmt(x)


def r_table(c, i, ed):
    th = ''.join(f'<th>{fmt(h)}</th>' for h in c['columns'])
    rows = ''.join(f'<tr{" class=hl" if r.get("hl") else ""}>' + ''.join(f'<td>{_cell(x)}</td>' for x in r['cells']) + '</tr>' for r in c['rows'])
    sub = any(isinstance(x, dict) for r in c['rows'] for x in r['cells'])  # 칸 아래에 작은 설명이 있으면 간격을 줄인다
    dense = len(c['rows']) > 5  # 행이 6개 이상이면 간격을 더 줄인다
    out = f'<table class="tbl s{" sub" if sub else ""}{" dense" if dense else ""}"><tr>{th}</tr>{rows}</table>'
    if c.get('small'):
        out += f'<span class="sm">{fmt(c["small"])}</span>'
    if c.get('callout'):
        out += f'<div class="big2" style="margin-top:30px"><div class="on"><small>{fmt(c["callout"]["label"])}</small><b>{fmt(c["callout"]["value"])}</b></div></div>'
    if c.get('mini'):
        out += f'<div class="mini">{fmt(c["mini"])}</div>'
    if c.get('note'):
        out += f'<span class="note">{fmt(c["note"])}</span>'
    return f'<div class="{card_open(c, i)}">{bar(i)}<div class="body">{chip(c, ed)}{head(c)}{out}</div>{src(source_of(c, ed))}{dots(i)}</div>'


def r_compare(c, i, ed):
    bx = ''.join(f'<div{" class=on" if b.get("dark") else ""}><small>{fmt(b["label"])}</small><strong>{fmt(b["value"])}</strong><em>{fmt(b["sub"])}</em></div>' for b in c['boxes'])
    d = c['diff']
    return (f'<div class="{card_open(c, i)}">{bar(i)}<div class="body">{chip(c, ed)}{head(c)}<div class="cond">{fmt(c["cond"])}</div>'
            f'<div class="cmp">{bx}</div><div class="diff"><span>{fmt(d["label"])}</span><b>{fmt(d["value"])}</b></div></div>{src(source_of(c, ed))}{dots(i)}</div>')


def r_rates(c, i, ed):
    rows = ''.join(f'<div{" class=on" if r.get("dark") else ""}><span>{fmt(r["label"])}<small>{fmt(r["sub"])}</small></span><b>{fmt(r["value"])}</b></div>' for r in c['rows'])
    mini = f'<div class="mini">{fmt(c["mini"])}</div>' if c.get('mini') else ''
    return f'<div class="{card_open(c, i)}">{bar(i)}<div class="body">{chip(c, ed)}{head(c)}<div class="rate">{rows}</div>{mini}</div>{src(source_of(c, ed))}{dots(i)}</div>'


def r_checklist(c, i, ed):
    items = ''.join(f'<div class="ck"><i></i><p>{fmt(x["t"])}<small>{fmt(x["sub"])}</small></p></div>' for x in c['items'])
    return f'<div class="{card_open(c, i)}">{bar(i)}<div class="body">{chip(c, ed)}{head(c)}{items}</div>{src(source_of(c, ed))}{dots(i)}</div>'


def cta_layout(c):
    pills = bool(c.get('pills'))
    d = dict(body_top=560 if pills else 600, pills_top=740, btn_top=930 if pills else 880)
    d['url_top'] = d['btn_top'] + 145
    d['sub_top'] = d['url_top'] + 60
    d.update(c.get('layout', {}))
    return d


def r_cta(c, i, ed):
    L = cta_layout(c)
    t = '<br>'.join(f'<u>{html.escape(x[1:-1], quote=False)}</u>' if x.startswith('*') and x.endswith('*') else html.escape(x, quote=False) for x in c['title_lines'])
    pills = ''
    if c.get('pills'):
        pills = f'<div class="pills" style="position:absolute;left:72px;right:72px;top:{L["pills_top"]}px">' + ''.join(f'<span class="pill">{fmt(p)}</span>' for p in c['pills']) + '</div>'
    return (f'<div class="card dark cta">{bar(i)}<h1 class="t" style="font-size:{c.get("fs", 78)}px;top:{c.get("title_top", 240)}px">{t}</h1>'
            f'<p class="p" style="top:{L["body_top"]}px">{fmt(c["body"])}</p>{pills}'
            f'<div class="btn" style="top:{L["btn_top"]}px">{fmt(c["button"])}</div><div class="url" style="top:{L["url_top"]}px">{fmt(c["url"])}</div>'
            f'<div class="sub" style="top:{L["sub_top"]}px">{fmt(c["sub"])}</div>{dots(i)}</div>')


RENDER = {'cover': r_cover, 'points': r_points, 'boxes': r_boxes, 'table': r_table, 'compare': r_compare, 'rates': r_rates, 'checklist': r_checklist, 'cta': r_cta}


# ───────── 실행 ─────────
def ensure_fonts(work):
    f = os.path.join(work, 'fonts', 'node_modules', 'pretendard')
    if not os.path.isdir(f):
        os.makedirs(os.path.join(work, 'fonts'), exist_ok=True)
        subprocess.run(['npm', 'init', '-y'], cwd=os.path.join(work, 'fonts'), capture_output=True)
        subprocess.run(['npm', 'install', 'pretendard', '--silent'], cwd=os.path.join(work, 'fonts'), check=True)


def run_calc(ed, root):
    if not ed.get('calc'):
        return {}
    p = subprocess.run(['node', os.path.join(HERE, 'engine.mjs')], input=json.dumps({'root': root, 'calc': ed['calc']}),
                       capture_output=True, text=True, env=dict(os.environ))
    if p.returncode:
        raise SystemExit('[build_cards] 계산 엔진 실패:\n' + p.stderr.strip()[-800:])
    res = json.loads(p.stdout)
    import crosscheck
    errs, warns = crosscheck.check(root, ed['calc'], res)
    for w in warns:
        print('  ⚠', w)
    if errs:
        raise SystemExit('[build_cards] 독립 검산 실패:\n  ' + '\n  '.join(errs))
    print(f'  ✓ 계산 {len(ed["calc"])}건: 엔진과 독립 검산 일치')
    return res


def overflow_errors(metrics):
    errs = []
    for k, m in enumerate(metrics, 1):
        b, s = m.get('body'), m.get('src')
        if b and s and b[1] > s[0] - 8:
            errs.append(f'카드 {k}: 본문 끝({b[1]})이 출처 줄 시작({s[0]})과 겹칩니다. 글을 줄이세요.')
        if m.get('sub') and m.get('num') and m['sub'][1] > m['num'][0] - 12:
            errs.append(f'카드 {k}: 부제가 숫자 상자와 겹칩니다.')
        if m.get('ctaBody'):
            nxt = (m.get('pills') or m.get('btn') or [10**9])[0]
            if m['ctaBody'][1] > nxt - 12:
                errs.append(f'카드 {k}: 본문이 아래 요소(버튼/알약)와 겹칩니다.')
        if m.get('title') and m.get('ctaBody') and m['title'][1] > m['ctaBody'][0] - 8:
            errs.append(f'카드 {k}: 제목이 본문과 겹칩니다.')
    return errs


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    work = os.path.abspath(sys.argv[1])
    ed = json.load(open(os.path.join(work, 'edition.json'), encoding='utf-8'))
    root = repo_root()
    if '--check' in sys.argv:
        import check_edition
        sys.exit(check_edition.run(ed, root))
    cards = ed['cards']
    if len(cards) != TOTAL or cards[0]['type'] != 'cover' or cards[-1]['type'] != 'cta':
        raise SystemExit(f'[build_cards] 카드는 {TOTAL}장이어야 하고 첫 장은 cover, 마지막 장은 cta 여야 합니다.')
    vals = run_calc(ed, root)
    ed2 = interpolate(ed, vals)
    json.dump(vals, open(os.path.join(work, 'nums.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ensure_fonts(work)
    shutil.copy(os.path.join(SKILL, 'assets', 'card.css'), os.path.join(work, 'card.css'))
    out = os.path.join(work, 'out')
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    meta = {'links': {}}
    for i, c in enumerate(ed2['cards'], 1):
        if c['type'] not in RENDER:
            raise SystemExit(f'[build_cards] 알 수 없는 카드 종류 {c["type"]} (카드 {i})')
        body = RENDER[c['type']](c, i, ed2)
        open(os.path.join(out, f'{i:02d}.html'), 'w', encoding='utf-8').write(
            f'<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="../card.css"></head><body>{body}</body></html>')
        if c['type'] == 'cta' and c.get('link'):
            L = cta_layout(c)
            meta['links'][str(i)] = {**c['link'], 'x': 6.7, 'y': round(L['btn_top'] / 13.5, 1), 'w': 86.6, 'h': 10.4}
    json.dump(meta, open(os.path.join(work, 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    r = subprocess.run(['node', os.path.join(HERE, 'shot.js'), out], capture_output=True, text=True)
    print(' ', (r.stdout + r.stderr).strip())
    if r.returncode:
        raise SystemExit('[build_cards] 캡처 실패')
    errs = overflow_errors(json.load(open(os.path.join(out, 'metrics.json'))))
    if errs:
        raise SystemExit('[build_cards] 글자 넘침:\n  ' + '\n  '.join(errs))
    print('  ✓ 글자 넘침 없음')
    from PIL import Image
    ims = [Image.open(os.path.join(out, f'{i:02d}.png')).convert('RGB') for i in range(1, TOTAL + 1)]
    w, h = 360, 450
    sheet = Image.new('RGB', (w * 4 + 50, h * 2 + 30), '#DCDCD6')
    for k, im in enumerate(ims):
        sheet.paste(im.resize((w, h)), (10 + (k % 4) * (w + 10), 10 + (k // 4) * (h + 10)))
    sheet.save(os.path.join(work, 'sheet.jpg'), quality=88)
    print('  ✓ 모아보기:', os.path.join(work, 'sheet.jpg'))


if __name__ == '__main__':
    main()
