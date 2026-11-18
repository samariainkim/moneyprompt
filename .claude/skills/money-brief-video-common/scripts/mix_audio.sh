#!/usr/bin/env bash
# 나레이션 + 배경음악을 섞는다: 배경음악은 이어 붙여(3초 크로스페이드) 길이를 채우고, 말할 때 자동으로 낮추고(사이드체인),
# 끝 화면에서 조금 키웠다가 마지막에 서서히 줄이며, 전체를 -14 LUFS 로 맞춘다.
# 사용: mix_audio.sh <narration.wav> <bgm.mp3> <out.wav> <영상길이(초)> <끝화면시작(초)>
set -euo pipefail
NAR="$1"; BGM="$2"; OUT="$3"; DUR="$4"; END0="$5"
BD=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$BGM")
# 필요한 복사본 수: 각 이음새에서 3초씩 겹치므로 (복사본 수 × 길이 − 3 × (수−1)) ≥ 영상 길이
N=$(python3 - "$BD" "$DUR" <<'P'
import math,sys
bd,dur=float(sys.argv[1]),float(sys.argv[2]); n=1
while n*bd-3*(n-1)<dur+1: n+=1
print(n)
P
)
INPUTS=(-i "$NAR"); for ((i=0;i<N;i++)); do INPUTS+=(-i "$BGM"); done
CHAIN="[1:a]"; FC=""
if [ "$N" -gt 1 ]; then
  prev="[1:a]"
  for ((i=2;i<=N;i++)); do FC+="${prev}[${i}:a]acrossfade=d=3[x$i];"; prev="[x$i]"; done
  CHAIN="$prev"
fi
FOUT=$(python3 -c "print(round($DUR-3.2,1))")
ffmpeg -y -hide_banner -loglevel error "${INPUTS[@]}" -filter_complex "${FC}${CHAIN}atrim=0:${DUR},asetpts=PTS-STARTPTS,afade=t=in:d=1.5,afade=t=out:st=${FOUT}:d=3.2,volume=0.55,aformat=sample_rates=44100:channel_layouts=stereo[bg0];[0:a]aresample=44100,pan=stereo|c0=c0|c1=c0,apad=pad_dur=12,atrim=0:${DUR},asplit=2[na][ns];[bg0][ns]sidechaincompress=threshold=0.02:ratio=12:attack=15:release=600[duck];[duck]volume=enable='gte(t,${END0})':volume=1.7[bg];[na][bg]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95,loudnorm=I=-14:TP=-1.5:LRA=9[m]" -map "[m]" -ar 44100 "$OUT"
echo "믹스 완료: $OUT (배경음악 ${N}회 이어 붙임)"
