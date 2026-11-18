---
name: money-brief-shorts
description: 돈버프 MONEY BRIEF 카드뉴스 한 호를 유튜브 쇼츠 영상(세로 9:16, 약 60초, 얼굴 출연 없이 화면 + 더빙 + 자막)으로 만든다 — 장면 대본·TTS 대본·화면 시안 → (사용자가 Google AI Studio TTS 로 더빙) → 장면 시간 맞춤·애니메이션·자막·배경음악·끝 화면(구독/좋아요 버튼) 렌더링 → 업로드 자료. 사용자가 "머니브리프 유튜브 쇼츠 영상 제작해줘", "쇼츠 만들어줘", "카드뉴스를 쇼츠로" 라고 요청할 때 사용한다. 이 스킬의 절차가 사용자가 승인한 작업 방식이다.
---

# MONEY BRIEF 유튜브 쇼츠 만들기

채널 **@사마리아인TV**. 얼굴 출연 없음. 공용 도구는 `../money-brief-video-common/`(README 의 흐름도와 도구 표). 쇼츠 규격은 `references/shorts-spec.md`.
먼저 읽을 것: `../money-brief-video-common/references/{two-stage,tts-guide,alignment,screen-spec,compliance,lessons}.md`.

## ★ 두 단계로 진행한다 (사용자 승인 방식)
| 단계 | 시작 | Claude 가 하는 일 | 끝 |
|---|---|---|---|
| **1단계: 기획 + 제작 세트** | 사용자가 **주제(카드뉴스 호)와 영상 제작을 요청** | 최종 **기획안**과 영상 제작에 필요한 **세트**(대본·TTS 대본·자막 가안·화면 시안·업로드 자료 초안·만드는 방법·준비할 파일 목록)를 만든다 | **최종 컨펌 요청까지만.** 영상(mp4)은 만들지 않는다 |
| **2단계: 최종 영상 제작** | 사용자가 **검토를 마치고 필요한 파일(음성·배경음악 등)을 만든 뒤, "최종 영상 제작"을 명시적으로 요청** | 받은 파일로 영상 제작·점검·보고, 수정 반영, 업로드 자료 확정 | 사용자 검수 |
- **음성·음악 파일이 업로드됐다는 이유만으로 2단계를 시작하지 않는다.** 사용자가 제작을 요청하기 전에는 기다린다(파일 확인·누락 점검은 가능).
- 1단계 중 수정 요청이 오면 기획안·세트를 고쳐 다시 컨펌을 요청한다(2단계로 넘어가지 않는다). 확정 문구는 사용자가 정한 대로 유지.
- 2단계 중에도 **새 내용·방향 변경**은 다시 1단계(컨펌)로 돌아가 확인한다.

## 지켜야 할 약속 (사용자 규칙)
- **내용은 이미 확정·게시된 카드뉴스 호**에서만 가져온다(`edition.json`, 검증 보고서, 계산 엔진 값). 카드에 없는 주장·숫자를 쓰지 않는다. 호는 사용자가 정한다(모호하면 최근 호를 제안하고 확인).
- **사용자가 확정한 문구·타이밍은 임의로 고치지 않는다.**
- 영상 안에 **발행일·기준일을 쓰지 않는다**(제도 적용 기간만). 면책(예시 계산·예상치·실제 한도는 은행 심사에 따라 달라요)은 영상과 설명란 양쪽에.
- 특정 상품·금융사 추천, 공포·단정 제목("모르면 큰일") 금지 → 질문형으로 바꾸고 이유를 알린다.
- 더빙은 **사용자가 Google AI Studio TTS 로** 만든다. 음원 조건·합성 음성 공개 항목을 안내한다.
- **유튜브 게시는 사용자가 직접.** 산출물은 scratchpad, 저장소에 올리지 않는다. 스킬·도구 변경 병합은 "머지해" 후에만.
- 한국어로 소통, 개인정보를 자료에 넣지 않는다.

## 1단계 절차 (기획 + 제작 세트 → 최종 컨펌 요청)
1. **입력 확인**: 대상 호의 `edition.json`·`nums.json`·`out/alt.json`·검증 보고서(scratchpad `brief-NNN/`), 없으면 `web/redesign/data/brief.json`. 계산 숫자는 `nums.json`/카드 값만. 주제(호)가 없으면 먼저 묻는다.
2. **video.json 작성(쇼츠 6장면)**: `../money-brief-video-common/assets/examples/issue005/shorts.video.json` 을 복사해 호에 맞게 쓴다(구조·분량 `references/shorts-spec.md`). 줄(`lines`): `tts`=소리 나는 대로 풀어 쓴 문장, `sub`=화면 자막.
```bash
python3 .claude/skills/money-brief-video-common/scripts/pre_production.py <video.json> <작업폴더>/pre     # plan.md(기획안 뼈대)·script.md·tts/·draft.srt·예상 길이(60초 초과 경고)
python3 .claude/skills/money-brief-video-common/scripts/check_video_facts.py <video.json> <alt.json>     # 숫자 일치 점검
```
3. **화면 시안**: 템플릿(`anim_shorts.tpl.html` 복사·수정)으로 정지 시안만 만든다(영상 렌더링 아님).
```bash
python3 .claude/skills/money-brief-video-common/scripts/storyboard.py <작업폴더>/sb --format shorts --template <tpl.html> --video-json <video.json> --out <작업폴더>/시안.jpg
```
4. **기획안 완성**: `../money-brief-video-common/assets/plan.template.md` 형식으로 `plan.md` 를 채운다(목적·호, 형식·길이, 제목 후보·썸네일 문구, 장면 구성, 핵심 숫자와 카드 근거, 업로드 자료 초안, **확인하지 못한 것**, **사용자가 준비할 파일**, **컨펌 요청 항목**).
5. **세트 전달 + 최종 컨펌 요청**: `SendUserFile` 로 기획안(md), 대본·장면표, `tts/`(zip), `tts_style.txt`(쇼츠용), 자막 가안, 화면 시안, 만드는 방법(공용 README + `tts-guide.md` 요약)을 보내고, 메시지에 ① 기획 요약 ② 컨펌이 필요한 항목(제목·문구·숫자·길이 등) ③ 사용자가 만들 파일(장면별 음성 S01~S06.wav, 배경음악 mp3, 선택 자료) ④ "검토·파일 준비가 끝나면 **'최종 영상 제작'을 요청해 주세요**" 를 적는다. **여기서 멈춘다.**

## 2단계 절차 (최종 영상 제작) — 사용자가 제작을 요청했을 때만
1. **파일 확인**: `/root/.claude/uploads/...` 의 음성(장면별 wav 권장, 또는 한 파일)·배경음악. 장면 수·이름·길이 확인, 누락·이상이 있으면 알리고 요청한다.
2. **영상 만들기**
```bash
python3 .claude/skills/money-brief-video-common/scripts/make_video.py <작업폴더>/run --format shorts \
  --template <tpl.html> --video-json <video.json> --scene-audio <장면별 wav 폴더>   # 한 파일이면 --narration <wav>
  --bgm <bgm.mp3> --out <결과이름>
```
   결과 `<결과>.mp4`(1080×1920)·`.srt`·`_확인프레임.jpg`. 점검 ✓/✗ 확인, `timeline.json` 의 `uncertain` 장면 기록, 확인 프레임을 눈으로 확인(`lessons.md`).
3. **보고(한 번에)**: `SendUserFile` mp4 + srt. 장면 구성 표, 제작 방식(싱크·음악·음량), **확인이 필요한 점**(uncertain 장면, 음원 조건, 합성 음성 공개), 다음 단계.
4. **수정**: 요청한 부분만. 같은 음성으로 재실행(읽기가 달라졌으면 그 장면 음성 재요청). 어긋난 자막은 `timeline.json` 줄 시간을 고쳐 개별 도구로 재렌더(`alignment.md`).
5. **업로드 자료 확정**: `../money-brief-video-common/references/upload.md` (쇼츠: 제목 2안·설명란(UTM·면책·출처)·고정 댓글·태그, 챕터 없음). 사용자가 게시.

## 하지 않는 것
- 1단계에서 영상 렌더링·완성본 전달, 사용자 요청 없이 2단계 시작(파일이 와도), 카드에 없는 숫자·주장, 발행일·기준일 표기, 상품 추천·공포 제목, 유튜브 직접 게시, 음성·영상 파일을 저장소에 커밋
