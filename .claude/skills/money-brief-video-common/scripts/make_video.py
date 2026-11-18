#!/usr/bin/env python3
"""음성(wav)과 배경음악(mp3)으로 영상 한 편을 끝까지 만든다(분석 → 시간표 → 애니메이션 → 렌더 → 믹스 → 인코딩 → 점검).
사용:
  python3 make_video.py <작업폴더> --format shorts|long --template <anim 템플릿.html> --video-json <video.json> \\
      (--narration <wav> | --scene-audio <장면별 음성 폴더>) --bgm <mp3> --out <결과이름(확장자 없이)> [--end-mode last_line|after_speech] [--hold 초] [--workers 4]
- --scene-audio: S01.wav … 처럼 장면별로 만든 음성이 있으면 이어 붙여 장면 경계를 정확히 쓴다(권장).
- --narration: 한 파일로 받은 경우 쉼을 분석해 장면 경계를 추정한다(일부 장면은 uncertain 으로 표시됨).
결과: <out>.mp4, <out>.srt, <out>_확인프레임.jpg, <작업폴더>/timeline.json"""
import argparse, os, subprocess, sys, json

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument('work'); ap.add_argument('--format', required=True, choices=['shorts', 'long'])
ap.add_argument('--template', required=True); ap.add_argument('--video-json', required=True)
ap.add_argument('--narration'); ap.add_argument('--scene-audio')
ap.add_argument('--bgm', required=True); ap.add_argument('--out', required=True)
ap.add_argument('--end-mode', default=None); ap.add_argument('--hold', default=None); ap.add_argument('--workers', default='4')
a = ap.parse_args()
if bool(a.narration) == bool(a.scene_audio):
    sys.exit('--narration 과 --scene-audio 중 하나만 지정하세요.')
size = (1080, 1920) if a.format == 'shorts' else (1920, 1080)
end_mode = a.end_mode or ('after_speech' if a.format == 'shorts' else 'last_line')
hold = a.hold or ('6.0' if a.format == 'shorts' else '9.3')
W = os.path.abspath(a.work); os.makedirs(W, exist_ok=True)


def run(*c):
    print('$', ' '.join(map(str, c)))
    r = subprocess.run(list(map(str, c)))
    if r.returncode:
        sys.exit(r.returncode)


run('bash', f'{HERE}/setup_fonts.sh', W)
extra = []
if a.scene_audio:
    nar = f'{W}/narration.wav'
    run(sys.executable, f'{HERE}/concat_scenes.py', a.scene_audio, a.video_json, nar, f'{W}/bounds.json')
    extra = ['--bounds', f'{W}/bounds.json']
else:
    nar = os.path.abspath(a.narration)
run(sys.executable, f'{HERE}/analyze_audio.py', nar, f'{W}/pauses.json')
run(sys.executable, f'{HERE}/align.py', a.video_json, f'{W}/pauses.json', f'{W}/timeline.json', *extra)
tpl = os.path.join(W, 'anim_tpl.html')
open(tpl, 'w', encoding='utf-8').write(open(a.template, encoding='utf-8').read())
run(sys.executable, f'{HERE}/build_anim.py', tpl, f'{W}/timeline.json', f'{W}/anim.html', '--end-mode', end_mode, '--hold', hold)
meta = json.load(open(f'{W}/anim.meta.json'))
run('node', f'{HERE}/render_frames.js', f'{W}/anim.html', f'{W}/frames', meta['dur'], 30, size[0], size[1], a.workers)
run('bash', f'{HERE}/mix_audio.sh', nar, a.bgm, f'{W}/mix.wav', meta['dur'], meta['end0'])
run('bash', f'{HERE}/encode.sh', f'{W}/frames', f'{W}/mix.wav', a.out + '.mp4', meta['dur'], 30)
run(sys.executable, f'{HERE}/make_srt.py', f'{W}/timeline.json', a.out + '.srt')
run(sys.executable, f'{HERE}/check_video.py', a.out + '.mp4', size[0], size[1], f'{W}/timeline.json', a.out + '_확인프레임.jpg')
