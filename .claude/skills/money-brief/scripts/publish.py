#!/usr/bin/env python3
"""만든 한 호를 사이트(/brief/)에 올릴 파일로 반영한다. (병합·배포는 하지 않는다)

사용:
  python3 publish.py <작업폴더>                # 카드 이미지 7장 + web/redesign/data/brief.json 에 새 호 추가
  python3 publish.py <작업폴더> --replace      # 이미 있는 호(같은 번호)를 덮어쓴다(오탈자 수정 등)
  python3 publish.py <작업폴더> --dry-run      # 무엇을 바꿀지만 보여 준다
  python3 publish.py <작업폴더> --repo <경로>   # 다른 저장소 복사본에 반영(시험용)

하는 일: ① 점검(check_edition) ② out/01~07.png → web/redesign/img/brief/<id>/0N.jpg(JPG 품질 82)
         ③ brief.json 에 호 정보·카드별 대체 텍스트(alt)·연동 링크 추가.  [빌드·시험·커밋·PR 은 SKILL.md 절차대로]"""
import json, os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def repo_root():
    p = HERE
    while p != '/' and not os.path.isdir(os.path.join(p, '.git')):
        p = os.path.dirname(p)
    return p


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    work = os.path.abspath(sys.argv[1])
    dry, replace = '--dry-run' in sys.argv, '--replace' in sys.argv
    root = os.path.abspath(sys.argv[sys.argv.index('--repo') + 1]) if '--repo' in sys.argv else repo_root()
    ed = json.load(open(os.path.join(work, 'edition.json'), encoding='utf-8'))
    out = os.path.join(work, 'out')
    for need in ['alt.json', 'metrics.json'] + [f'{i:02d}.png' for i in range(1, 8)]:
        if not os.path.exists(os.path.join(out, need)):
            raise SystemExit(f'[publish] out/{need} 가 없습니다. 먼저 build_cards.py 를 실행하세요.')
    meta = json.load(open(os.path.join(work, 'meta.json'), encoding='utf-8')) if os.path.exists(os.path.join(work, 'meta.json')) else {'links': {}}
    alts = json.load(open(os.path.join(out, 'alt.json'), encoding='utf-8'))
    import check_edition
    print('① 점검')
    if check_edition.run(json.load(open(os.path.join(work, 'edition.json'), encoding='utf-8')), root):
        raise SystemExit('[publish] 점검 오류를 고친 뒤 다시 실행하세요.')
    bj = os.path.join(root, 'web', 'redesign', 'data', 'brief.json')
    data = json.load(open(bj, encoding='utf-8'))
    same = [i for i in data['issues'] if i['no'] == ed['no'] or i['id'] == ed['id']]
    if same and not replace:
        raise SystemExit(f'[publish] {ed["no"]}호(id {ed["id"]})가 이미 있습니다. 수정이면 --replace, 새 호면 번호를 바꾸세요.')
    issue = {k: ed[k] for k in ('no', 'id', 'category', 'title', 'short', 'topic', 'base_date')}
    issue['cards'] = []
    for i in range(1, 8):
        c = {'n': i, 'alt': alts[i - 1]}
        if str(i) in meta['links']:
            l = meta['links'][str(i)]
            c['link'] = {k: l[k] for k in ('href', 'label', 'x', 'y', 'w', 'h', 'target') if k in l}
        issue['cards'].append(c)
    dst = os.path.join(root, 'web', 'redesign', 'img', 'brief', ed['id'])
    print(f'② 이미지 → {os.path.relpath(dst, root)}/01~07.jpg')
    print(f'③ brief.json: {ed["no"]}호 {"교체" if same else "추가"} (카드 7장, 연동 링크 {len(meta["links"])}개)')
    if dry:
        print('  (dry-run: 파일은 바꾸지 않았습니다)')
        return
    from PIL import Image
    os.makedirs(dst, exist_ok=True)
    total = 0
    for i in range(1, 8):
        p = os.path.join(dst, f'{i:02d}.jpg')
        Image.open(os.path.join(out, f'{i:02d}.png')).convert('RGB').save(p, quality=82, optimize=True, progressive=True)
        total += os.path.getsize(p)
    data['issues'] = [i for i in data['issues'] if i not in same] + [issue]
    data['issues'].sort(key=lambda x: x['no'])
    json.dump(data, open(bj, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'  ✓ 완료 (이미지 {total // 1024}KB). 다음: node web/scripts/sync-static.mjs → 시험 → 커밋·PR (SKILL.md 7~9단계)')


if __name__ == '__main__':
    main()
