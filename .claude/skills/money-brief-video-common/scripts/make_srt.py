#!/usr/bin/env python3
"""timeline.json 에서 별도 자막 파일(SRT)을 만든다. 사용: python3 make_srt.py <timeline.json> <out.srt>"""
import json, sys


def ts(x):
    return f'{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int(round((x - int(x)) * 1000)):03d}'


T = json.load(open(sys.argv[1], encoding='utf-8'))
out = []
for i, l in enumerate(T['lines'], 1):
    out.append(f"{i}\n{ts(l['a'])} --> {ts(l['b'])}\n{l['text']}\n")
open(sys.argv[2], 'w', encoding='utf-8').write('\n'.join(out))
print(len(out), '개 자막 →', sys.argv[2])
