# CALC BUFF(돈버프 금융계산기) — 공개 점검 목록
공개 여부와 시점은 운영자가 판단합니다. 아래는 공개 전·후에 확인하면 좋은 항목입니다.
(검증 전 요율은 결과에 "계산기 적용 상한"·참고용 안내가 표시됩니다. 미검증 규칙을 막고 싶을 때만 `config.js`의 `BLOCK_UNVERIFIED`를 true로.)

## 계산기별 (부동산 중개보수)
- [ ] 서울 조례 원문 대조(구간·요율·한도액) 후 rules JSON에 `effective_from`·`verified_at` 기입, `status: "verified"`
- [ ] 공식 계산 결과와 몇 건 대조, 원 단위 처리(절사) 기준 확인
- [ ] 적용 범위(소재지 기준, 월세 환산 범위, 오피스텔 요건) 확정

## 사이트 공통
- [ ] GA4: 커스텀 차원(calculator_id, category, error_type, channel, target) 등록, DebugView 확인
- [ ] 카카오 OG: `/calc/og/brokerage.png`, `/calc/og/hub.png`(1200×630) 제작 후 실기기 미리보기
- [ ] 접근성: 키보드만으로 사용, 스크린리더, 모달·모바일 메뉴 포커스(Esc/복귀)
- [ ] 호스팅(GitHub Pages) 실환경 확인, 서버에 남은 옛 `/fee/` 폴더 삭제
- [ ] 제보하기 폼 + 메일 수신 연결 후 푸터/결과 화면에 링크
- [ ] 공개하기로 한 시점에 `noindex` 메타 제거 (허브·계산기·기준표)
- [ ] 대문 `index.html`에 CALC BUFF 배너·내비·칩·푸터 반영
