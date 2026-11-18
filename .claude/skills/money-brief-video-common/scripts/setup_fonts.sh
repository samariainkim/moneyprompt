#!/usr/bin/env bash
# 작업 폴더에 Pretendard 글꼴 설치(카드뉴스 도구와 같은 방식). 사용: setup_fonts.sh <작업폴더>
set -euo pipefail
W="$1"; mkdir -p "$W/fonts"
if [ ! -d "$W/fonts/node_modules/pretendard" ]; then (cd "$W/fonts" && npm init -y >/dev/null 2>&1 && npm install pretendard --silent); fi
echo "글꼴 준비: $W/fonts"
