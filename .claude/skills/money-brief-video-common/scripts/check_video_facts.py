#!/usr/bin/env python3
"""대본(video.json)의 자막 숫자가 카드뉴스에 있는 숫자와 일치하는지 점검한다(경고 수준).
사용: python3 check_video_facts.py <video.json> <카드뉴스 alt.json 또는 텍스트 파일> [--allow "2026년 하반기,예시"]
- 자막(sub)의 '숫자+단위'(억·만 원·%·%p·년·월·일·원)가 카드뉴스 본문(alt.json 의 카드별 텍스트)에 없으면 목록으로 알려 준다.
- 카드에 없는 숫자는 영상에 쓰지 않는 것이 원칙이다. 합치기·재서술한 표기는 --allow 로 허용하고 사유를 보고서에 적는다."""
import json, re, sys

vj, corpus = sys.argv[1], sys.argv[2]
allow = [x.strip() for x in sys.argv[sys.argv.index('--allow') + 1].split(',')] if '--allow' in sys.argv else []
V = json.load(open(vj, encoding='utf-8'))
raw = open(corpus, encoding='utf-8').read()
try:
    j = json.loads(raw)
    raw = ' '.join(j if isinstance(j, list) else j.values()) if isinstance(j, (list, dict)) else raw
except Exception:
    pass
norm = lambda t: re.sub(r'\s+', '', t).replace('년월', '')
body = norm(raw)
pat = re.compile(r'\d[\d,.]*\s?(?:억|만 원|만원|%p|%|년|월|일|원)')
miss = []
for s in V['scenes']:
    for l in s['lines']:
        for tok in pat.findall(l['sub']):
            t = norm(tok)
            if any(a and a in tok for a in allow):
                continue
            if t not in body:
                miss.append((s['id'], tok.strip()))
if miss:
    print('⚠ 카드뉴스에서 찾지 못한 숫자 표기:')
    for sid, tok in miss:
        print(f'  {sid}: {tok}')
    print('→ 카드와 같은 표기로 고치거나, 재서술이면 보고서에 근거를 적으세요.')
else:
    print('✓ 자막의 숫자가 모두 카드뉴스에 있습니다.')
