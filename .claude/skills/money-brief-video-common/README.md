# MONEY BRIEF 영상 공용 도구

쇼츠(`money-brief-shorts`)와 롱폼(`money-brief-longform`) 스킬이 함께 쓰는 도구·예시·참고 문서입니다. 이 폴더 자체는 스킬이 아니라 도구 모음입니다(`SKILL.md` 없음).

## 만드는 흐름 한눈에
```
확정·게시된 카드뉴스 호(edition.json·검증 보고서)
   └─ ① video.json 작성(장면 → 줄[tts, sub])            ← Claude
       └─ ② pre_production.py · storyboard.py            ← 대본·TTS 대본·자막 가안·화면 시안 → 사용자에게 전달
           └─ ③ Google AI Studio TTS 로 더빙(장면별 wav 권장)  ← 사용자 / 배경음악 mp3 도 사용자
               └─ ④ make_video.py 한 번에: 분석 → 시간표 → 애니메이션 → 렌더 → 믹스 → 인코딩 → 점검   ← Claude
                   └─ ⑤ 사용자 검수 → 수정 → ⑥ 업로드 자료(chapters.py·설명란)   → 사용자가 유튜브에 직접 게시
```

## 도구
| 파일 | 하는 일 |
|---|---|
| `scripts/pre_production.py <video.json> <폴더>` | 대본·장면표(md), 장면별 TTS 입력 대본(txt), 자막 가안(srt), 예상 길이 |
| `scripts/storyboard.py` | 음성 전 화면 시안(장면마다 1컷 + 끝 화면) 모음 이미지 |
| `scripts/check_video_facts.py <video.json> <alt.json>` | 자막 숫자가 카드뉴스에 있는지 점검(경고) |
| `scripts/make_video.py` | 영상 한 편 끝까지(아래 개별 도구를 순서대로 호출) |
| `scripts/concat_scenes.py` | 장면별 음성(S01.wav…)을 이어 붙이고 장면 경계를 정확히 기록 |
| `scripts/analyze_audio.py` | 음성의 쉼(무음) 구간 분석 → pauses.json |
| `scripts/align.py` | 쉼·대본을 맞춰 장면·자막 줄 시간표(timeline.json) |
| `scripts/build_anim.py` | 애니메이션 템플릿에 시간표를 끼워 anim.html 생성 |
| `scripts/render_frames.js` | anim.html 을 30fps JPEG 프레임으로 렌더(결정적: 시간 t 만으로 화면이 정해짐) |
| `scripts/mix_audio.sh` | 나레이션 + 배경음악(이어 붙임·자동 낮춤·끝에서 키움·-14 LUFS) |
| `scripts/encode.sh` | 프레임 + 음성 → MP4(H.264/AAC) |
| `scripts/make_srt.py` | 별도 자막 파일(srt) |
| `scripts/check_video.py` | 해상도·길이·오디오·음량 점검 + 장면별 확인 프레임 모음 |
| `scripts/chapters.py` | 설명란 챕터 목록(롱폼) |
| `scripts/setup_fonts.sh` | Pretendard 글꼴 설치(카드뉴스 도구와 같은 방식) |
| `assets/examples/issue005/` | No.5(바뀐 DSR 제도) 쇼츠·롱폼 완성 예시: `*.video.json`, `anim_shorts.tpl.html`, `anim_long.tpl.html` |
| `assets/tts_style.txt` | Google AI Studio TTS 말투 지시문(쇼츠용·롱폼용) |
| `assets/upload_materials.example.md` | 업로드 자료(제목·썸네일 문구·설명란·고정 댓글) 예시 |

요구: `ffmpeg`·`ffprobe`, `node` + `playwright`(Chromium), `python3` + `numpy`·`Pillow`, `npm`(글꼴). 작업 폴더·영상·음성·시안은 **scratchpad** 에 두고 저장소에는 올리지 않습니다.

## 참고 문서 (`references/`)
`tts-guide.md`(더빙 방법·숫자 읽기) · `alignment.md`(시간 맞춤 원리와 한계) · `audio-mix.md` · `screen-spec.md`(화면 규격·안전 영역) · `compliance.md`(금융 영상 표현·합성음성·음원) · `upload.md` · `lessons.md`(실제 겪은 함정)
