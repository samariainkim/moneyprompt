#!/usr/bin/env python3
"""음성이 오기 전에 화면 시안을 만든다: 예상 시간표로 장면마다 한 장면씩 캡처해 시안 모음(jpg)을 만든다.
사용: python3 storyboard.py <작업폴더> --format shorts|long --template <anim 템플릿.html> --video-json <video.json> --out <시안.jpg>
(예상 길이로 장면·자막 시간을 배분한 가짜 시간표를 쓰므로 등장 타이밍은 실제와 다르다. 화면 구성·문구 확인용.)"""
import argparse, json, os, re, subprocess, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument('work'); ap.add_argument('--format', required=True, choices=['shorts', 'long'])
ap.add_argument('--template', required=True); ap.add_argument('--video-json', required=True); ap.add_argument('--out', required=True)
a = ap.parse_args()
W = os.path.abspath(a.work); os.makedirs(W, exist_ok=True)
size = (1080, 1920) if a.format == 'shorts' else (1920, 1080)
V = json.load(open(a.video_json, encoding='utf-8'))
syl = lambda t: len(re.findall(r'[가-힣]', t))
est = lambda t: syl(t) / 5.0 + 0.35 * len(re.findall(r'[.?!]', t)) + 0.3
t, scenes, lines = 0.3, [], []
for s in V['scenes']:
    text = ' '.join(l['tts'] for l in s['lines'])
    d = est(text)
    scenes.append({'id': s['id'], 'start': round(t, 2), 'end': round(t + d, 2), 'uncertain': False})
    w = [max(1, syl(l['tts'])) for l in s['lines']]
    cur = t
    for l, ww in zip(s['lines'], w):
        seg = d * ww / sum(w)
        lines.append({'scene': s['id'], 'a': round(cur, 2), 'b': round(cur + seg - 0.1, 2), 'text': l['sub'], 'uncertain': False})
        cur += seg
    t += d + 0.8
json.dump({'speech_first': 0.3, 'speech_last': round(t - 0.8, 2), 'scenes': scenes, 'lines': lines}, open(f'{W}/timeline_draft.json', 'w'), ensure_ascii=False)
open(f'{W}/anim_tpl.html', 'w', encoding='utf-8').write(open(a.template, encoding='utf-8').read())
subprocess.run(['bash', f'{HERE}/setup_fonts.sh', W], check=True)
mode = 'after_speech' if a.format == 'shorts' else 'last_line'
subprocess.run([sys.executable, f'{HERE}/build_anim.py', f'{W}/anim_tpl.html', f'{W}/timeline_draft.json', f'{W}/anim.html', '--end-mode', mode], check=True)
meta = json.load(open(f'{W}/anim.meta.json'))
# 장면마다: 장면 끝 직전(그 장면의 요소가 대부분 나온 시점) + 끝 화면
ts = [round(s['end'] - 0.4, 2) for s in scenes] + [round(meta['end0'] + 4.6, 2)]
subprocess.run(['node', f'{HERE}/snap_frames.js', f'{W}/anim.html', f'{W}/shots', str(size[0]), str(size[1]), ','.join(map(str, ts))], check=True)
ims = [Image.open(f"{W}/shots/t{('%g' % x).replace('.', '_')}.png") for x in ts]
tw = 360 if a.format == 'shorts' else 640
ims = [im.resize((tw, int(im.height * tw / im.width))) for im in ims]
cols = 4 if a.format == 'shorts' else 3
rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (cols * (tw + 20) + 20, rows * (ims[0].height + 20) + 20), (225, 225, 220))
for i, im in enumerate(ims):
    S.paste(im, (20 + (i % cols) * (tw + 20), 20 + (i // cols) * (ims[0].height + 20)))
S.save(a.out, quality=88)
print('화면 시안 →', a.out)
