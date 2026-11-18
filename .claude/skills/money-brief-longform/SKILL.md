---
name: money-brief-longform
description: 돈버프 MONEY BRIEF 카드뉴스 한 호를 유튜브 롱폼 영상(가로 16:9, 약 3분 30초~4분, 얼굴 출연 없이 화면 + 더빙 + 자막)으로 만든다 — 장면 대본·TTS 대본·화면 시안·챕터 → (사용자가 Google AI Studio TTS 로 더빙) → 장면 시간 맞춤·애니메이션·자막·배경음악·끝 화면(구독/좋아요 버튼) 렌더링 → 업로드 자료(제목·썸네일 문구·설명란·챕터). 사용자가 "머니브리프 유튜브 롱폼 영상 제작해줘", "본편 영상 만들어줘" 라고 요청할 때 사용한다. 이 스킬의 절차가 사용자가 승인한 작업 방식이다.
---

# MONEY BRIEF 유튜브 롱폼 만들기

채널 **@사마리아인TV**. 얼굴 출연 없음. 공용 도구는 `../money-brief-video-common/`. 롱폼 규격은 `references/longform-spec.md`. 약속·두 단계 규칙은 `../money-brief-shorts/SKILL.md` 와 같고, 아래는 롱폼 기준이다.
먼저 읽을 것: `../money-brief-video-common/references/{two-stage,tts-guide,alignment,screen-spec,compliance,upload,lessons}.md`.

## ★ 두 단계로 진행한다 (사용자 승인 방식)
| 단계 | 시작 | Claude 가 하는 일 | 끝 |
|---|---|---|---|
| **1단계: 기획 + 제작 세트** | 사용자가 **주제(카드뉴스 호)와 영상 제작을 요청** | 최종 **기획안**과 제작 **세트**(대본·TTS 대본·자막 가안·화면 시안·챕터 초안·썸네일 문구·업로드 자료 초안·만드는 방법·준비할 파일 목록) | **최종 컨펌 요청까지만.** 영상(mp4)은 만들지 않는다 |
| **2단계: 최종 영상 제작** | 사용자가 **검토를 마치고 필요한 파일(음성·배경음악 등)을 만든 뒤 "최종 영상 제작"을 명시적으로 요청** | 영상 제작·점검·보고, 수정 반영, 업로드 자료 확정 | 사용자 검수 |
- 음성·음악 파일이 업로드됐다는 이유만으로 2단계를 시작하지 않는다. 1단계 중 수정은 기획안·세트를 고쳐 다시 컨펌을 요청한다. 2단계 중 새 내용·방향 변경은 1단계(컨펌)로 돌아간다.

## 지켜야 할 약속 (쇼츠와 동일)
카드뉴스 호의 확정 내용만 · 확정 문구 임의 수정 금지 · 발행일·기준일 표기 금지(적용 기간만) · 영상과 설명란 양쪽 면책 · 상품 추천·공포 제목 금지 · 더빙은 사용자가 Google AI Studio TTS 로 · 음원 조건·합성 음성 공개 안내 · 유튜브 게시는 사용자 · 산출물은 scratchpad · 병합은 "머지해" 후.

## 1단계 절차 (기획 + 제작 세트 → 최종 컨펌 요청)
1. **입력 확인**: `edition.json`, `nums.json`, `alt.json`, 검증 보고서(없으면 `brief.json`). 주제(호)가 없으면 먼저 묻는다.
2. **video.json 작성(롱폼 9장면)**: `assets/examples/issue005/long.video.json` 을 복사해 호에 맞게 쓴다(`references/longform-spec.md`). `pre_production.py`(plan.md 뼈대·예상 길이 3:30~4:00) · `check_video_facts.py`.
3. **화면 시안**: `anim_long.tpl.html` 복사·수정 후 `storyboard.py --format long`(정지 시안만).
4. **기획안 완성**: `../money-brief-video-common/assets/plan.template.md` 로 `plan.md`(제목 3안, 썸네일 문구, 장면 구성·챕터 초안, 핵심 숫자와 카드 근거, 확인하지 못한 것, 준비할 파일, 컨펌 항목).
5. **세트 전달 + 최종 컨펌 요청**: 기획안, 대본·장면표, `tts/`(zip), `tts_style.txt`(롱폼용), 자막 가안, 화면 시안, 만드는 방법을 보내고 컨펌 항목·준비할 파일(장면별 음성 L01~L09.wav 권장, 배경음악 mp3)·"**'최종 영상 제작'을 요청해 주세요**"를 적는다. **여기서 멈춘다.**

## 2단계 절차 (최종 영상 제작) — 사용자가 제작을 요청했을 때만
1. 파일 확인(장면 수·이름·길이, 누락 시 요청).
2. 만들기
```bash
python3 .claude/skills/money-brief-video-common/scripts/make_video.py <작업폴더>/run --format long \
  --template <tpl.html> --video-json <video.json> --scene-audio <장면별 wav 폴더>   # 한 파일이면 --narration <wav>
  --bgm <bgm.mp3> --out <결과이름> --workers 6
```
   렌더링 약 2~3분(6,500장). 끝 화면은 **마지막 자막("구독과 좋아요 부탁드려요")이 시작할 때** 열려 버튼이 눌린다(`--end-mode last_line`, 유지 9.3초).
3. **보고**: mp4 + srt + 확인 프레임. 장면 안 줄 경계가 어긋날 수 있는 구간(`uncertain`)을 반드시 알리고, 장면별 음성이 있으면 정확해진다고 안내.
4. **수정**: 쇼츠와 같음.
5. **업로드 자료 확정**: 제목 3안 · 썸네일 문구 · 설명란(UTM·챕터·출처·면책) · 고정 댓글 · 태그. 챕터는 `chapters.py` 결과(uncertain 장면은 사용자 시청 확인).

## 하지 않는 것
쇼츠와 같음(1단계 렌더링·완성본, 요청 없이 2단계 시작) + 챕터 시각을 확인 없이 확정하기
