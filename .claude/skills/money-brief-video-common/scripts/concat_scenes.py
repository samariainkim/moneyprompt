#!/usr/bin/env python3
"""장면별로 만든 나레이션 음성(S01.wav, S02.wav …)을 한 파일로 이어 붙이고, 장면 경계를 정확히 기록한다(가장 정확한 방법).
사용: python3 concat_scenes.py <음성폴더> <video.json> <out.wav> <bounds.json> [--gap 0.8]
- 파일 이름은 video.json 장면 id 와 같아야 한다(wav 또는 mp3). 24kHz 모노 16bit 로 맞춰 이어 붙이고 장면 사이에 무음(--gap 초)을 넣는다.
- 이어 붙인 out.wav 를 make_video.py 의 --narration 으로, bounds.json 을 --bounds 로 넘긴다."""
import json, os, subprocess, sys, tempfile, wave

d, vj, out, bj = sys.argv[1:5]
gap = float(sys.argv[sys.argv.index('--gap') + 1]) if '--gap' in sys.argv else 0.8
V = json.load(open(vj, encoding='utf-8'))
tmp = tempfile.mkdtemp()
frames, bounds, t = [], [], 0.0
sr = 24000
silence = b'\x00\x00' * int(sr * gap)
for i, s in enumerate(V['scenes']):
    src = next((os.path.join(d, s['id'] + e) for e in ('.wav', '.mp3', '.m4a') if os.path.exists(os.path.join(d, s['id'] + e))), None)
    if not src:
        raise SystemExit(f"{s['id']}.wav 가 {d} 에 없습니다.")
    w16 = os.path.join(tmp, s['id'] + '.wav')
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-ac', '1', '-ar', str(sr), '-sample_fmt', 's16', w16], check=True)
    w = wave.open(w16)
    pcm = w.readframes(w.getnframes())
    # 앞뒤 무음을 0.15초만 남기고 잘라 장면 사이 간격을 일정하게 한다(−45dB 이하)
    import array
    a = array.array('h'); a.frombytes(pcm)
    th = int(32768 * 10 ** (-45 / 20))
    st = next((k for k, v in enumerate(a) if abs(v) > th), 0)
    en = len(a) - next((k for k, v in enumerate(reversed(a)) if abs(v) > th), 0)
    st = max(0, st - int(sr * 0.15)); en = min(len(a), en + int(sr * 0.15))
    seg = a[st:en].tobytes()
    dur = len(seg) / 2 / sr
    bounds.append({'id': s['id'], 'start': round(t + 0.15, 2), 'end': round(t + dur - 0.15, 2)})
    frames.append(seg); t += dur
    if i < len(V['scenes']) - 1:
        frames.append(silence); t += gap
o = wave.open(out, 'wb'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr); o.writeframes(b''.join(frames)); o.close()
json.dump({'scenes': bounds}, open(bj, 'w'), indent=1)
print(f'{len(bounds)}개 장면, 총 {t:.1f}초 → {out}')
