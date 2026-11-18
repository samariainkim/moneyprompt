#!/usr/bin/env python3
"""나레이션 음성의 무음(쉼) 구간을 찾아 pauses.json 으로 저장한다.
사용: python3 analyze_audio.py <narration.wav> <pauses.json> [--thr -42] [--min 0.12]
- 24kHz 모노 wav(Google AI Studio TTS 출력)를 기준으로 20ms 단위 에너지(dB)를 본다.
- 결과: {"dur": 전체 길이, "first": 첫 발화 시각, "last": 마지막 발화 끝, "sil": [[시작, 끝], ...]}  (≥ --min 초인 무음만, 앞·뒤 무음 제외)
요구: numpy"""
import json, sys, wave
import numpy as np


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    src, out = sys.argv[1], sys.argv[2]
    thr = float(sys.argv[sys.argv.index('--thr') + 1]) if '--thr' in sys.argv else -42.0
    mn = float(sys.argv[sys.argv.index('--min') + 1]) if '--min' in sys.argv else 0.12
    w = wave.open(src)
    sr, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
    if sw != 2:
        raise SystemExit('16-bit PCM wav 가 필요합니다(ffmpeg -i in.mp3 -ac 1 -ar 24000 out.wav 로 변환).')
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
    if ch > 1:
        x = x.reshape(-1, ch).mean(axis=1)
    hop = int(sr * 0.02)
    n = len(x) // hop
    env = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2) + 1e-12) for i in range(n)])
    speech = 20 * np.log10(env + 1e-9) > thr
    if not speech.any():
        raise SystemExit('발화가 감지되지 않았습니다. --thr 값을 높여 보세요(예: -50).')
    first = int(np.argmax(speech)) * 0.02
    last = (n - int(np.argmax(speech[::-1]))) * 0.02
    sil, i = [], 0
    while i < n:
        if not speech[i]:
            j = i
            while j < n and not speech[j]:
                j += 1
            if (j - i) * 0.02 >= mn and i * 0.02 > first - 0.001 and j * 0.02 < last + 0.001:
                sil.append([round(i * 0.02, 2), round(j * 0.02, 2)])
            i = j
        else:
            i += 1
    json.dump({'dur': round(len(x) / sr, 2), 'first': round(first, 2), 'last': round(last, 2), 'sil': sil}, open(out, 'w'), indent=1)
    big = [s for s in sil if s[1] - s[0] >= 0.6]
    print(f'음성 {len(x) / sr:.1f}초, 발화 {first:.2f}~{last:.2f}, 쉼 {len(sil)}개(0.6초 이상 {len(big)}개) → {out}')


if __name__ == '__main__':
    main()
