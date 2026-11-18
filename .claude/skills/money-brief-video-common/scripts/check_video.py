#!/usr/bin/env python3
"""완성 영상 점검: 크기·길이·오디오·음량을 확인하고 장면별 확인 프레임 모음(contact sheet)을 만든다.
사용: python3 check_video.py <video.mp4> <w> <h> <timeline.json> <sheet.jpg>
점검: 해상도 일치, 영상·오디오 길이 차이 0.2초 이하, 통합 음량 -16~-12 LUFS, 장면마다 중간 프레임 1장."""
import json, subprocess, sys, os, tempfile
from PIL import Image

mp4, w, h, tl, sheet = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5]
pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height,duration:format=duration', '-of', 'json', mp4], capture_output=True, text=True).stdout)
v = next(s for s in pr['streams'] if s['codec_type'] == 'video'); a = [s for s in pr['streams'] if s['codec_type'] == 'audio']
ok = True
def chk(c, m):
    global ok
    print(('✓ ' if c else '✗ ') + m); ok = ok and c
chk((int(v['width']), int(v['height'])) == (w, h), f"해상도 {v['width']}×{v['height']}")
chk(bool(a), '오디오 스트림 있음')
if a:
    chk(abs(float(a[0].get('duration', 0)) - float(v.get('duration', 0))) < 0.2, f"영상 {float(v['duration']):.1f}초 / 오디오 {float(a[0]['duration']):.1f}초")
lu = subprocess.run(['ffmpeg', '-hide_banner', '-i', mp4, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
import re
m = re.findall(r'I:\s+(-?[\d.]+) LUFS', lu)
if m:
    chk(-16 <= float(m[-1]) <= -12, f'통합 음량 {m[-1]} LUFS (권장 -14)')
T = json.load(open(tl, encoding='utf-8'))
tmp = tempfile.mkdtemp(); ims = []
for s in T['scenes']:
    t = (s['start'] + s['end']) / 2
    p = os.path.join(tmp, f"{s['id']}.png")
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-ss', str(t), '-i', mp4, '-frames:v', '1', '-vf', f'scale={640 if w > h else 360}:-1', p])
    ims.append(Image.open(p))
cols = 3 if w > h else 6
cw, chh = ims[0].size
rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (cols * (cw + 20) + 20, rows * (chh + 20) + 20), (225, 225, 220))
for i, im in enumerate(ims):
    S.paste(im, (20 + (i % cols) * (cw + 20), 20 + (i // cols) * (chh + 20)))
S.save(sheet, quality=88)
print('확인 프레임 모음 →', sheet)
sys.exit(0 if ok else 1)
