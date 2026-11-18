---
name: money-brief-longform
description: 돈버프 MONEY BRIEF 카드뉴스 한 호를 유튜브 롱폼 영상(가로 16:9, 약 3분 30초~4분, 얼굴 출연 없이 화면 + 더빙 + 자막)으로 만든다 — 장면 대본·TTS 대본·화면 시안·챕터 → (사용자가 Google AI Studio TTS 로 더빙) → 장면 시간 맞춤·애니메이션·자막·배경음악·끝 화면(구독/좋아요 버튼) 렌더링 → 업로드 자료(제목·썸네일 문구·설명란·챕터). 사용자가 "머니브리프 유튜브 롱폼 영상 제작해줘", "본편 영상 만들어줘" 라고 요청할 때 사용한다. 이 스킬의 절차가 사용자가 승인한 작업 방식이다.
---

# MONEY BRIEF 유튜브 롱폼 만들기

채널 **@사마리아인TV**. 얼굴 출연 없음. 공용 도구는 `../money-brief-video-common/`. 롱폼 규격은 `references/longform-spec.md`. 절차·약속은 `../money-brief-shorts/SKILL.md` 와 같고 아래는 롱폼에서 다른 점이다.
먼저 읽을 것: `../money-brief-video-common/references/{tts-guide,alignment,screen-spec,compliance,upload,lessons}.md`.

## 지켜야 할 약속 (쇼츠와 동일)
카드뉴스 호의 확정 내용만 사용 · 확정된 문구 임의 수정 금지 · 발행일·기준일 표기 금지(적용 기간만) · 영상과 설명란 양쪽 면책 · 상품 추천·공포 제목 금지 · 더빙은 사용자가 Google AI Studio TTS 로 · 음원 조건·합성 음성 공개 안내 · 유튜브 게시는 사용자 · 산출물은 scratchpad · 병합은 "머지해" 후.

## 절차
1. **입력 확인**: 쇼츠와 같음(`edition.json`, `nums.json`, `alt.json`, 검증 보고서).
2. **video.json 작성(롱폼 9장면)**: `assets/examples/issue005/long.video.json` 을 복사해 호에 맞게 쓴다. 구조·분량은 `references/longform-spec.md`. `pre_production.py`(예상 길이 3:30~4:00) · `check_video_facts.py`.
3. **화면 시안 + 사전 작업 세트 전달**: `anim_long.tpl.html` 을 복사해 호에 맞게 고치고 `storyboard.py --format long` 으로 시안(장면마다 1컷 + 끝 화면). 대본·장면표, `tts/`(zip), `tts_style.txt`(롱폼용), 자막 가안, 시안, 만드는 방법을 보낸다. 사용자 확정 전 렌더링 금지.
4. **음성 수령 → 만들기**: `L01.wav … L09.wav`(권장) 또는 한 파일 + 배경음악.
```bash
python3 .claude/skills/money-brief-video-common/scripts/make_video.py <작업폴더>/run --format long \
  --template <tpl.html> --video-json <video.json> --scene-audio <장면별 wav 폴더>   # 한 파일이면 --narration <wav>
  --bgm <bgm.mp3> --out <결과이름>
```
   렌더링 약 3분(6,500장). 끝 화면은 **마지막 자막("구독과 좋아요 부탁드려요")이 시작할 때** 열려 버튼이 눌린다(`--end-mode last_line`, 유지 9.3초).
5. **보고**: mp4 + srt + 확인 프레임. 롱폼은 장면 안 줄 경계가 어긋날 수 있는 구간(`uncertain`)을 반드시 알리고, 장면별 음성이 있으면 정확해진다고 안내.
6. **수정**: 쇼츠와 같음.
7. **업로드 자료**: 제목 3안 · 썸네일 문구 · 설명란(UTM·챕터·출처·면책) · 고정 댓글 · 태그. 챕터는 `chapters.py` 결과(uncertain 장면은 사용자 시청 확인).

## 하지 않는 것
쇼츠와 같음 + 챕터 시각을 확인 없이 확정하기
