# 부동산 중개보수 계산기 — 프로덕션 오픈 게이트
규칙 JSON `status`가 `verified`가 되기 전에는 donbuff.com 에서 계산이 차단됩니다(개발/로컬은 허용).

- [ ] 서울 조례 원문 대조 (구간·요율·한도액) → rules JSON 수정, `effective_from`·`verified_at` 기입, `status: "verified"`
- [ ] 적용 범위 확정 (소재지 기준, 월세 환산 범위, 오피스텔 요건)
- [ ] 원 단위 처리(절사) 법적 기준 확인
- [ ] 공식 계산 결과와 3건 이상 대조
- [ ] GA4: 측정 ID 삽입, 커스텀 차원(calculator_id, category, error_type, channel) 등록, DebugView 확인
- [ ] 카카오 OG: `/fee/og/brokerage-fee.png`(1200×630) 제작, 실기기 미리보기
- [ ] 접근성: 키보드 only, 스크린리더, 모달 포커스(이동·트랩·Esc·복귀), 결과 영역 포커스
- [ ] 호스팅(GitHub Pages) 실환경 확인, 오류 제보 주소 확정(`config.js` ERROR_REPORT_URL)
- [ ] `noindex` 메타 제거 (계산기·기준표 페이지)
- [ ] 허브 `/fee/` 공개는 계산기 3종(중개보수·중도상환·환전) 완료 후
