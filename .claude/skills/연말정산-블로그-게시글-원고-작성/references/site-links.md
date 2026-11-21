# 돈버프 사이트 연결 (블로그 → 사이트)

## 링크 (UTM 규칙)
- 체크업: `https://donbuff.com/yearend/checkup/?utm_source=blog&utm_medium=post&utm_campaign=yearend2026&utm_content=post{N}`
- 일정·체크리스트: `https://donbuff.com/yearend/calendar/?utm_source=blog&utm_medium=post&utm_campaign=yearend2026&utm_content=post{N}`
- 특집 허브: `https://donbuff.com/yearend/?utm_source=blog&utm_medium=post&utm_campaign=yearend2026&utm_content=post{N}`
- {N}은 편 번호. 한 글에서는 돈버프 안내 섹션에 한 번, 마무리에 한 번 정도만 넣는다.
- 링크는 **운영에서 /yearend/ 가 열린 뒤**에만 유효하다(현재 미리보기만 공개). 쓰기 전에 운영 오픈 여부를 사용자에게 확인하고, 미오픈이면 "○월 ○일 공개 예정"으로 쓰고 링크는 비운다.

## 발행 후 허브 반영
- 사용자가 글 URL을 주면 `web/redesign/pages/yearend.html` 의 `ye-posts`에서 해당 편 `<div class="post g">…발행 예정</div>`을 1편처럼 `<a class="post" href="URL" target="_blank" rel="noopener" data-ga="ye_blog_click" data-post="N"><span class="n">N</span><span class="t">제목</span><em class="ok">발행 ↗</em></a>`로 바꾼다.
- 변경 후 `VERCEL_ENV=preview node web/scripts/sync-static.mjs` 로 빌드 확인, 브랜치로 PR(머지는 사용자가 "머지해"라고 할 때만).

## 서비스 소개 문구(승인된 표현)
- "나의 연말정산 체크업: 몇 가지 생활 상황에 대한 질문에 답하면 확인해 볼 만한 공제 항목과 준비할 증빙을 정리하는 데 도움을 주는 서비스"
- "공제 가능 여부를 판정하지 않고, 확인할 요건과 출처(국세청 안내)를 보여 줍니다."
- 체크업 결과로 AI 프롬프트를 만들 수 있음(로그인 필요), 일정·체크리스트는 출처 상태(공식 확인/확인 중)를 표시.
