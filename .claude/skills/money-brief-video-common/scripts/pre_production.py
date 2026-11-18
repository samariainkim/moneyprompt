#!/usr/bin/env python3
"""video.json 으로 사전 작업 세트를 만든다: 대본·장면표(md), TTS 입력 대본(장면별 txt), 자막 가안(srt), 예상 길이.
사용: python3 pre_production.py <video.json> <출력폴더>
- 장면의 TTS 대본 = 줄(line)의 tts 를 공백으로 이은 것. 숫자·영문은 소리 나는 대로 한글로 풀어 쓴다(references/tts-guide.md).
- 예상 길이는 한국어 TTS 약 5음절/초 + 문장 쉼으로 추정한 값이며 실제 음성이 오면 보정된다."""
import json, os, re, sys

vj, out = sys.argv[1:3]
V = json.load(open(vj, encoding='utf-8'))
fmt = V.get('format', 'shorts')
syl = lambda t: len(re.findall(r'[가-힣]', t))
est = lambda t: syl(t) / 5.0 + 0.35 * len(re.findall(r'[.?!]', t)) + 0.3
ts = lambda x: f'{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int(round((x - int(x)) * 1000)):03d}'
os.makedirs(os.path.join(out, 'tts'), exist_ok=True)
t0, n, srt, rows, total = 0.0, 1, [], [], 0.0
for s in V['scenes']:
    text = ' '.join(l['tts'] for l in s['lines'])
    open(os.path.join(out, 'tts', s['id'] + '.txt'), 'w', encoding='utf-8').write(text + '\n')
    dur = est(text)
    w = [max(len(l['sub']), 6) for l in s['lines']]
    cur = t0
    for l, ww in zip(s['lines'], w):
        seg = dur * ww / sum(w)
        srt.append(f"{n}\n{ts(cur)} --> {ts(cur + seg - 0.05)}\n{l['sub']}\n")
        n += 1
        cur += seg
    rows.append((s, t0, dur, text))
    t0 += dur
    total += dur
open(os.path.join(out, 'draft.srt'), 'w', encoding='utf-8').write('\n'.join(srt))
L = [f"# {V['title']} — {'쇼츠(세로 9:16)' if fmt == 'shorts' else '롱폼(가로 16:9)'} 대본·장면표 (가안)\n",
     f"- 채널: {V.get('channel', '')} · 예상 길이 **{int(total // 60)}분 {int(total % 60)}초**(음성 생성 후 실제 길이로 보정)\n",
     '- "나레이션(TTS 입력)"은 소리 나는 대로 한글로 풀어 쓴 문장, "자막"은 화면 표기입니다.\n',
     '| # | 장면 | 예상 시작 | 예상 길이 | 화면 | 자막 | 나레이션(TTS 입력) |', '|---|---|---|---|---|---|---|']
for s, a, dur, text in rows:
    L.append(f"| {s['id']} | {s['name']} | {int(a // 60)}:{int(a % 60):02d} | {dur:.0f}초 | {s['visual']} | {'<br>'.join(l['sub'].replace(chr(10), ' ') for l in s['lines'])} | {text} |")
open(os.path.join(out, 'script.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print(f"장면 {len(rows)}개, 예상 {total:.0f}초 → {out}/script.md, tts/, draft.srt")
if fmt == 'shorts' and total > 62:
    print('⚠ 쇼츠 예상 길이가 60초를 넘습니다. 문장을 줄이세요.')
