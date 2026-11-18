#!/usr/bin/env bash
# 프레임(JPEG)과 믹스 음성을 합쳐 MP4(H.264/AAC, faststart)를 만든다.
# 사용: encode.sh <frames폴더> <mix.wav> <out.mp4> <길이(초)> [fps=30]
set -euo pipefail
FR="$1"; MIX="$2"; OUT="$3"; DUR="$4"; FPS="${5:-30}"
ffmpeg -y -hide_banner -loglevel error -framerate "$FPS" -i "$FR/f%06d.jpg" -i "$MIX" -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -r "$FPS" -c:a aac -b:a 192k -t "$DUR" -movflags +faststart "$OUT"
echo "인코딩 완료: $OUT"
