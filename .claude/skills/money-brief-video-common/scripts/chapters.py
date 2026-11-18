#!/usr/bin/env python3
"""timeline.json 과 video.json 으로 유튜브 설명란용 챕터 목록을 만든다. 사용: python3 chapters.py <timeline.json> <video.json>
(첫 챕터는 반드시 0:00, 챕터는 3개 이상·각 10초 이상이어야 유튜브가 인식한다 → 쇼츠에는 쓰지 않는다)"""
import json, sys
T = json.load(open(sys.argv[1], encoding='utf-8')); V = json.load(open(sys.argv[2], encoding='utf-8'))
nm = {s['id']: s['name'] for s in V['scenes']}
for i, s in enumerate(T['scenes']):
    t = 0 if i == 0 else max(0, s['start'] - 0.3)
    print(f"{int(t // 60)}:{int(t % 60):02d} {nm.get(s['id'], s['id'])}")
