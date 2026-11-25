#!/usr/bin/env python3
"""발행 전 점검(lint). edition.json 을 읽어 규칙 위반을 찾는다.
사용: python3 check_edition.py <작업폴더 또는 edition.json> [--strict]
 - 오류(✗): 구조·필수 항목·금지 표현·면책 문구·연동 링크 등 → 종료코드 1
 - 경고(⚠): 계산 엔진이 아닌 곳에서 온 숫자(출처 확인 필요), 출처 줄에 기준일 없음, 환율 기준일이 오래됨 등. --strict 면 경고도 오류로 본다.
build_cards.py --check 도 같은 규칙을 쓴다."""
import datetime, glob, json, os, re, sys

REQUIRED = {
    'cover': ['title_lines', 'sub', 'pills'],
    'cover_art': ['title_lines', 'sub', 'tiles'],
    'cover_hero': ['title_lines', 'sub', 'tiles', 'hero'],
    'chars_full': ['label', 'heading', 'chars'],
    'chars': ['label', 'heading', 'chars'],
    'points': ['label', 'heading', 'items'],
    'boxes': ['label', 'heading', 'boxes'],
    'table': ['label', 'heading', 'columns', 'rows'],
    'compare': ['label', 'heading', 'cond', 'boxes', 'diff'],
    'rates': ['label', 'heading', 'rows'],
    'checklist': ['label', 'heading', 'items'],
    'cta': ['title_lines', 'body', 'button', 'url', 'sub'],
}
# 투자·상품 권유, 수익 보장, 단정으로 읽히는 표현(금융 콘텐츠 규칙: references/copy-guide.md)
FORBIDDEN = ['무조건', '반드시 오', '수익 보장', '원금 보장', '확실히 오', '확실히 번', '강력 추천', '추천합니다', '추천해요', '사세요', '지금 사야', '몰빵', '대박', '절대 손해', '100% 수익', '놓치면 손해', '안 하면 손해']
MD = re.compile(r'\*+')


def strings(o, path='', skip=()):
    if isinstance(o, str):
        yield path, o
    elif isinstance(o, list):
        for i, x in enumerate(o):
            yield from strings(x, f'{path}[{i}]', skip)
    elif isinstance(o, dict):
        for k, v in o.items():
            if k in skip:
                continue
            yield from strings(v, f'{path}.{k}' if path else k, skip)


def prompt_idx(root):
    p = os.path.join(root, 'prompt', 'index.html')
    return set(re.findall(r'idx:"([^"]+)"', open(p, encoding='utf-8').read())) if os.path.exists(p) else set()


def run(ed, root, strict=False):
    errs, warns = [], []
    # 1) 구조
    for k in ('no', 'id', 'category', 'topic', 'title', 'short', 'base_date', 'cards'):
        if not ed.get(k):
            errs.append(f'edition 필수 항목 없음: {k}')
    if ed.get('id') and not re.fullmatch(r'\d{3}', str(ed['id'])):
        errs.append('id 는 세 자리 숫자 문자열이어야 합니다(예: "004").')
    if ed.get('category') and ' · ' not in ed['category']:
        errs.append('category 는 "뉴스 · 정책변화" 처럼 "분류 · 주제" 형식이어야 합니다.')
    if ed.get('base_date') and not re.fullmatch(r'\d{4}\.\d{2}\.\d{2}', ed['base_date']):
        errs.append('base_date 는 2026.11.16 형식이어야 합니다.')
    cards = ed.get('cards') or []
    if len(cards) != 7:
        errs.append(f'카드는 7장이어야 합니다(현재 {len(cards)}장).')
    else:
        if cards[0].get('type') not in ('cover', 'cover_art', 'cover_hero'):
            errs.append('첫 장은 cover 여야 합니다.')
        if cards[-1].get('type') != 'cta':
            errs.append('마지막 장은 cta(계산기·프롬프트 등으로 이어지는 카드)여야 합니다.')
    for i, c in enumerate(cards, 1):
        t = c.get('type')
        if t not in REQUIRED:
            errs.append(f'카드 {i}: 알 수 없는 종류 {t}')
            continue
        for k in REQUIRED[t]:
            if not c.get(k):
                errs.append(f'카드 {i}({t}): 필수 항목 없음 — {k}')
    # 2) 금지 표현·면책
    for path, s in strings(ed, skip=('calc', '_설명')):
        plain = MD.sub('', s)
        for w in FORBIDDEN:
            if w in plain:
                errs.append(f'금지 표현 "{w}" — {path}: {plain[:40]}')
    alltext = ' '.join(s for _, s in strings(ed, skip=('calc', '_설명')))
    if cards and not re.search(r'참고|확인', cards[-1].get('sub', '')):
        errs.append('마지막 카드(cta)의 sub 에 "참고용이에요/확인이 필요해요" 같은 면책 문구가 필요합니다.')
    if not re.search(r'개인별|금융사별|참고용|달라요|달라질', alltext):
        errs.append('"개인별/금융사별로 달라요", "참고용" 같은 면책 문구가 카드 어디에도 없습니다.')
    # 3) 출처·기준일
    sd = ed.get('source_default', '')
    for i, c in enumerate(cards, 1):
        if c.get('type') in ('points', 'boxes', 'table', 'compare', 'rates', 'chars', 'chars_full'):
            s = c.get('source') or sd
            if not s:
                errs.append(f'카드 {i}: 출처 줄(source)이 없습니다.')
            else:
                if not re.search(r'출처|계산', s):
                    errs.append(f'카드 {i}: 출처 줄에 "출처" 또는 "계산"이 없습니다.')
                if '기준일' not in s and '기준' not in s:
                    warns.append(f'카드 {i}: 출처 줄에 기준일/기준 시점이 없습니다(제도·요율이 바뀔 수 있는 내용이면 넣으세요).')
    # 4) 계산 엔진이 아닌 숫자(출처 확인 대상)
    hard = []
    for path, s in strings(ed, skip=('calc', '_설명', 'source', 'source_default', 'url', 'href', 'target', 'id', 'sub')):
        t = re.sub(r'\{\{.*?\}\}', '', MD.sub('', s))
        hard += re.findall(r'\d{1,3}(?:,\d{3})+(?:원|달러)?|\d+(?:\.\d+)?%', t)
    if hard:
        warns.append(f'엔진({{{{ }}}})이 아닌 숫자 {len(hard)}개: {", ".join(sorted(set(hard))[:12])} — 1차 자료 원문으로 확인한 값인지 검증 보고서에 근거를 적으세요.')
    # 5) 환율 기준일
    calc = ed.get('calc') or {}
    if any(v.get('engine') in ('fx', 'fx_rate') for v in calc.values()):
        try:
            rb = json.load(open(os.path.join(root, 'calc', 'data', 'fx', 'rates.json'), encoding='utf-8'))['base_date']
            age = (datetime.date.today() - datetime.date.fromisoformat(rb)).days
            if age > 3:
                warns.append(f'환율 기준일({rb})이 오늘보다 {age}일 전입니다. 발행 직전에 최신 환율로 다시 만드세요.')
        except Exception as e:  # noqa
            warns.append(f'환율 기준일을 확인하지 못했습니다: {e}')
    # 6) 연동 링크
    pidx = None
    for i, c in enumerate(cards, 1):
        l = c.get('link')
        if not l:
            continue
        if not re.match(r'^(/[^/]|https://)', l.get('href', '')) or not l.get('label'):
            errs.append(f'카드 {i}: 연동 링크(href·label)가 올바르지 않습니다.')
        m = re.match(r'^/prompt/\?p=([^&]+)', l.get('href', ''))
        if m:
            from urllib.parse import unquote
            pidx = pidx or prompt_idx(root)
            if unquote(m.group(1)) not in pidx:
                errs.append(f'카드 {i}: 프롬프트 번호 {unquote(m.group(1))} 가 prompt/index.html 에 없습니다.')
        if c.get('type') != 'cta':
            warns.append(f'카드 {i}: link 는 cta 카드에서만 위치가 계산됩니다.')
    if not any(c.get('link') for c in cards[-1:]):
        warns.append('마지막 카드에 연동 링크(link)가 없습니다(정보성 카드라면 의도한 것인지 확인).')
    # 7) 이미 발행된 호와 겹침
    bj = os.path.join(root, 'web', 'redesign', 'data', 'brief.json')
    if os.path.exists(bj):
        for it in json.load(open(bj, encoding='utf-8'))['issues']:
            if it['no'] == ed.get('no') or it['id'] == ed.get('id'):
                warns.append(f'brief.json 에 이미 {it["no"]}호(id {it["id"]})가 있습니다. 새 호면 번호를 바꾸고, 수정이면 publish.py --replace 를 쓰세요.')
    for e in errs:
        print('  ✗', e)
    for w in warns:
        print('  ⚠', w)
    if not errs and not warns:
        print('  ✓ 점검 통과')
    elif not errs:
        print(f'  ✓ 오류 없음 (경고 {len(warns)}건)')
    return 1 if errs or (strict and warns) else 0


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    p = sys.argv[1]
    p = p if p.endswith('.json') else os.path.join(p, 'edition.json')
    here = os.path.dirname(os.path.abspath(__file__))
    root = here
    while root != '/' and not os.path.isdir(os.path.join(root, '.git')):
        root = os.path.dirname(root)
    sys.exit(run(json.load(open(p, encoding='utf-8')), root, '--strict' in sys.argv))
