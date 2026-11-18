---
name: money-brief-shorts
description: 돈버프 MONEY BRIEF 카드뉴스 한 호를 유튜브 쇼츠 영상(세로 9:16, 약 60초, 얼굴 출연 없이 화면 + 더빙 + 자막)으로 만든다 — 장면 대본·TTS 대본·화면 시안 → (사용자가 Google AI Studio TTS 로 더빙) → 장면 시간 맞춤·애니메이션·자막·배경음악·끝 화면(구독/좋아요 버튼) 렌더링 → 업로드 자료. 사용자가 "머니브리프 유튜브 쇼츠 영상 제작해줘", "쇼츠 만들어줘", "카드뉴스를 쇼츠로" 라고 요청할 때 사용한다. 이 스킬의 절차가 사용자가 승인한 작업 방식이다.
---

# MONEY BRIEF 유튜브 쇼츠 만들기

채널 **@사마리아인TV**. 얼굴 출연 없음. 공용 도구는 `../money-brief-video-common/`(README 의 흐름도와 도구 표). 쇼츠 규격은 `references/shorts-spec.md`.
먼저 읽을 것: `../money-brief-video-common/references/{tts-guide,alignment,screen-spec,compliance,lessons}.md`.

## 지켜야 할 약속 (사용자 규칙)
- **내용은 이미 확정·게시된 카드뉴스 호**에서만 가져온다(`edition.json`, 검증 보고서, 계산 엔진 값). 카드에 없는 주장·숫자를 쓰지 않는다. 어느 호로 만들지는 사용자가 정한다(모호하면 최근 호를 제안하고 확인).
- **사용자가 확정한 문구·타이밍은 임의로 고치지 않는다.** 수정 요청이 있는 부분만 고친다.
- 영상 안에 **발행일·기준일을 쓰지 않는다**(제도 적용 기간만). 면책(예시 계산·예상치·실제 한도는 은행 심사에 따라 달라요)은 영상과 설명란 양쪽에.
- 특정 상품·금융사 추천, 공포·단정 제목("모르면 큰일") 금지 → 질문형으로 바꾸고 이유를 알린다.
- 더빙은 **사용자가 Google AI Studio TTS 로** 만든다(우리는 대본·지시문 제공). 배경음악 음원 조건·합성 음성 공개 항목을 사용자에게 안내한다.
- **유튜브 게시는 사용자가 직접.** 영상·음성·프레임은 scratchpad 에 두고 저장소에 올리지 않는다. 스킬·도구 변경의 병합은 사용자가 "머지해"라고 할 때만.
- 한국어로 소통, 개인정보를 자료에 넣지 않는다.

## 절차
### 1. 입력 확인
대상 호의 `edition.json`·`nums.json`·`out/alt.json`·검증 보고서(scratchpad 의 `brief-NNN/`)가 있는지, 없으면 `web/redesign/data/brief.json`(카드 alt 텍스트)로 대체. 계산 숫자는 `nums.json`/카드의 값만 사용.

### 2. video.json 작성 (쇼츠 6장면)
`../money-brief-video-common/assets/examples/issue005/shorts.video.json` 을 복사해 호에 맞게 쓴다. 구조와 분량은 `references/shorts-spec.md`.
- 장면 → 줄(`lines`: `tts`=소리 나는 대로 풀어 쓴 문장, `sub`=화면 자막). 숫자는 카드와 같은 표기.
```bash
python3 .claude/skills/money-brief-video-common/scripts/pre_production.py <video.json> <작업폴더>/pre     # 대본·TTS 대본·자막 가안·예상 길이(60초 초과 시 경고)
python3 .claude/skills/money-brief-video-common/scripts/check_video_facts.py <video.json> <alt.json>     # 숫자 일치 점검
```

### 3. 화면 시안 + 사전 작업 세트 전달 (사용자 검수)
애니메이션 템플릿은 예시(`anim_shorts.tpl.html`)를 복사해 호의 숫자·문구·색 막대 높이에 맞게 고친다(요소는 줄 번호 `a(i)` 에 묶어 등장). 
```bash
python3 .claude/skills/money-brief-video-common/scripts/storyboard.py <작업폴더>/sb --format shorts --template <tpl.html> --video-json <video.json> --out <작업폴더>/시안.jpg
```
`SendUserFile`: 대본·장면표(md), `tts/` 폴더(zip), `assets/tts_style.txt`(쇼츠용 지시문), 자막 가안, 화면 시안, 만드는 방법(공용 README + `tts-guide.md` 요약), 정해 달라고 할 것(배경음악, 끝 화면 문구 등). 사용자가 대본·화면을 확정할 때까지 렌더링하지 않는다.

### 4. 음성 수령 → 영상 만들기
사용자가 `S01.wav … S06.wav`(권장) 또는 한 파일 wav, 배경음악 mp3 를 준다(`/root/.claude/uploads/...` 에서 읽음).
```bash
python3 .claude/skills/money-brief-video-common/scripts/make_video.py <작업폴더>/run --format shorts \
  --template <tpl.html> --video-json <video.json> --scene-audio <장면별 wav 폴더>   # 한 파일이면 --narration <wav>
  --bgm <bgm.mp3> --out <결과이름>
```
결과: `<결과>.mp4`(1080×1920), `.srt`, `_확인프레임.jpg`. 점검 ✓/✗ 를 확인하고 `timeline.json` 의 `uncertain` 장면을 기록한다. 확인 프레임을 직접 열어 자막 겹침·줄바꿈·숫자를 눈으로 본다(`lessons.md`).

### 5. 보고 (한 번에)
`SendUserFile`: mp4 + srt. 메시지에 장면 구성 표, 제작 방식(싱크·음악·음량), **확인이 필요한 점**(uncertain 장면과 어긋날 수 있는 시각, 음원 조건, 합성 음성 공개), 다음 단계(수정 → 업로드 자료).

### 6. 수정 → 해당 부분만
`video.json`/템플릿의 해당 부분만 고쳐 같은 음성으로 다시 `make_video.py`(문구를 바꿔 읽기가 달라졌으면 그 장면 음성을 다시 요청). 어긋난 자막은 `timeline.json` 줄 시간을 고쳐 개별 도구로 재렌더(`alignment.md`).

### 7. 업로드 자료
확정 후 `../money-brief-video-common/references/upload.md` 대로 제목 2안·설명란(UTM, 면책, 출처)·고정 댓글·태그를 만든다(쇼츠는 챕터 없음). 사용자가 게시한다.

## 하지 않는 것
- 사용자가 확정하기 전에 렌더링, 카드에 없는 숫자·주장 사용, 발행일·기준일 표기, 상품 추천·공포 제목, 유튜브 직접 게시, 음성·영상 파일을 저장소에 커밋
