#!/usr/bin/env python3
"""애니메이션 템플릿(HTML)에 시간표를 끼워 넣어 렌더링용 anim.html 을 만든다.
사용: python3 build_anim.py <template.html> <timeline.json> <out.html> [--end-mode last_line|after_speech] [--hold 6] [--end-pad 0.4]
템플릿의 자리표시자: __GROUPS__(자막 줄 [{a,b,text,scene}]), __SCENES__(장면 [{id,start,end}]), __END0__(끝 화면 시작), __DUR__(영상 길이)
- last_line: 마지막 자막 줄이 시작할 때 끝 화면을 연다(롱폼: "구독과 좋아요 부탁드려요"와 겹치게).
- after_speech: 나레이션이 끝난 뒤 끝 화면을 연다(쇼츠). --hold 는 끝 화면 유지 시간(초)."""
import json, sys


def main():
    if len(sys.argv) < 4:
        raise SystemExit(__doc__)
    tpl, tl, out = sys.argv[1:4]
    mode = sys.argv[sys.argv.index('--end-mode') + 1] if '--end-mode' in sys.argv else 'last_line'
    hold = float(sys.argv[sys.argv.index('--hold') + 1]) if '--hold' in sys.argv else 6.0
    pad = float(sys.argv[sys.argv.index('--end-pad') + 1]) if '--end-pad' in sys.argv else 0.4
    T = json.load(open(tl, encoding='utf-8'))
    lines = [{'a': l['a'], 'b': l['b'], 'text': l['text'], 'scene': l['scene']} for l in T['lines']]
    end0 = (lines[-1]['a'] - 0.05) if mode == 'last_line' else (T['speech_last'] + pad)
    dur = round(max(end0 + hold, T['speech_last'] + 2.0), 2)
    html = open(tpl, encoding='utf-8').read()
    for k, v in (('__GROUPS__', json.dumps(lines, ensure_ascii=False)), ('__SCENES__', json.dumps(T['scenes'], ensure_ascii=False)), ('__END0__', f'{end0:.2f}'), ('__DUR__', f'{dur:.2f}')):
        if k not in html:
            raise SystemExit(f'템플릿에 {k} 가 없습니다.')
        html = html.replace(k, v)
    open(out, 'w', encoding='utf-8').write(html)
    json.dump({'end0': round(end0, 2), 'dur': dur}, open(out.replace('.html', '.meta.json'), 'w'))
    print(f'끝 화면 {end0:.2f}초 시작, 총 길이 {dur:.2f}초 → {out}')


if __name__ == '__main__':
    main()
