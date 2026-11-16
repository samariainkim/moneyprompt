#!/usr/bin/env python3
"""인스타그램·쓰레드에 올릴 이미지 묶음(ZIP)을 만든다.

사용: python3 export_social.py <작업폴더> [--out <폴더>]
작업폴더에 있어야 하는 것: out/01~07.png(build_cards.py 결과), caption_instagram.txt, caption_threads.txt(assets/caption.template.md 를 보고 작성)
결과: <out>/MONEYBRIEF_No<번호>_<slug>.zip  (01~07.png 1080×1350 + 게시글 두 개), <out>/MONEYBRIEF_captions.md(복사용)
점검: 쓰레드 500자 이내, 인스타그램 2,200자 이내·해시태그 30개 이하, 이메일·전화번호 같은 개인정보 패턴 없음."""
import json, os, re, sys, zipfile

SLUGS = {}


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    work = os.path.abspath(sys.argv[1])
    out = os.path.abspath(sys.argv[sys.argv.index('--out') + 1]) if '--out' in sys.argv else os.path.join(work, 'export')
    ed = json.load(open(os.path.join(work, 'edition.json'), encoding='utf-8'))
    ig = open(os.path.join(work, 'caption_instagram.txt'), encoding='utf-8').read().strip()
    th = open(os.path.join(work, 'caption_threads.txt'), encoding='utf-8').read().strip()
    errs = []
    if len(th) > 500:
        errs.append(f'쓰레드 게시글이 {len(th)}자입니다(500자 이내).')
    if len(ig) > 2200:
        errs.append(f'인스타그램 게시글이 {len(ig)}자입니다(2,200자 이내).')
    if len(re.findall(r'#\S+', ig)) > 30:
        errs.append('인스타그램 해시태그는 30개 이하여야 합니다.')
    for name, t in (('인스타그램', ig), ('쓰레드', th)):
        if re.search(r'[\w.+-]+@[\w-]+\.[\w.]+', t) or re.search(r'0\d{1,2}-\d{3,4}-\d{4}', t):
            errs.append(f'{name} 게시글에 이메일·전화번호로 보이는 내용이 있습니다.')
    if '출처' not in ig or '기준일' not in ig:
        errs.append('인스타그램 게시글에 "출처"와 "기준일"이 있어야 합니다.')
    if errs:
        raise SystemExit('[export_social] ' + '\n  '.join(errs))
    slug = re.sub(r'[^a-z0-9]+', '-', ed.get('slug', '') or ed['topic'].lower()).strip('-') or ed['id']
    if not re.fullmatch(r'[a-z0-9-]+', slug):
        slug = ed.get('slug') or f'no{ed["no"]}'  # 한글 주제면 edition 의 "slug"(영문)를 쓰는 것을 권장
    name = f'MONEYBRIEF_No{ed["no"]}_{slug}'
    os.makedirs(out, exist_ok=True)
    z = os.path.join(out, name + '.zip')
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zf:
        for i in range(1, 8):
            zf.write(os.path.join(work, 'out', f'{i:02d}.png'), f'{name}/{i:02d}.png')
        zf.writestr(f'{name}/caption_instagram.txt', ig + '\n')
        zf.writestr(f'{name}/caption_threads.txt', th + '\n')
    cap = os.path.join(out, 'MONEYBRIEF_captions.md')
    block = f'---\n\n## {name}\n\n### 인스타그램 게시글\n\n```\n{ig}\n```\n\n### 쓰레드 게시글 ({len(th)}자)\n\n```\n{th}\n```\n\n'
    head = '# MONEY BRIEF 인스타그램·쓰레드 게시글\n\n이미지는 ZIP 의 01~07.png 를 순서대로 올리세요(1080×1350, 4:5).\n\n'
    old = open(cap, encoding='utf-8').read() if os.path.exists(cap) else head
    if f'## {name}\n' in old:  # 같은 호는 교체
        old = re.sub(r'---\n\n## ' + re.escape(name) + r'\n.*?(?=---\n\n## |\Z)', '', old, flags=re.S)
    open(cap, 'w', encoding='utf-8').write(old.rstrip('\n') + '\n\n' + block)
    print(f'✓ {z} ({os.path.getsize(z) // 1024}KB) · 쓰레드 {len(th)}자 · 게시글 문서 {cap}')


if __name__ == '__main__':
    main()
