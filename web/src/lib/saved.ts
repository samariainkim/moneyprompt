// 저장할 수 있는 결과의 종류. 열기 주소(path)는 결과를 다시 불러올 원래 화면이다.
export const SAVED_TOOLS = {
  calc_fx: { label: '환전수수료 계산기', path: '/calc/fx/' },
  calc_brokerage: { label: '부동산 중개보수 계산기', path: '/calc/brokerage/' },
  calc_loan: { label: '대출 중도상환 계산기', path: '/calc/loan-prepay/' },
  fee_brokerage: { label: '중개보수 계산기(FEE BUFF)', path: '/fee/brokerage-fee/' },
  mbti: { label: '투자 성향 검사', path: '/invest-mbti/' },
} as const;

export type SavedTool = keyof typeof SAVED_TOOLS;

export const isSavedTool = (v: unknown): v is SavedTool => typeof v === 'string' && Object.prototype.hasOwnProperty.call(SAVED_TOOLS, v);

export const SAVED_MAX = 100;
export const SAVED_PAYLOAD_MAX = 30000; // 직렬화한 글자 수 상한 (DB 는 바이트로 한 번 더 제한)

// 저장한 결과를 다시 여는 주소
export const restoreUrl = (tool: SavedTool, id: string) => `${SAVED_TOOLS[tool].path}?dbx_resume=restore&dbx_saved=${encodeURIComponent(id)}`;
