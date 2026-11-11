/** 가입 유도 위치(gate id). 영문 소문자·숫자·밑줄만 허용한다. */
const SRC = /^[a-z0-9_]{1,40}$/;

export function cleanSource(v: string | null | undefined): string | null {
  return v && SRC.test(v) ? v : null;
}

/** 경로(쿼리 포함)에 쿼리 값을 덧붙인다. 같은 키가 있으면 덮어쓴다. */
export function addParams(path: string, params: Record<string, string>): string {
  const u = new URL(path, 'http://local');
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.pathname + u.search + u.hash;
}

/** 로그인 직후 거치는 라우팅 주소: 동의 → 가입 완료 기록 → 선택정보 → 원래 가려던 곳 */
export function continueUrl(next: string, src: string | null): string {
  const q = new URLSearchParams({ next });
  if (src) q.set('src', src);
  return `/auth/continue/?${q.toString()}`;
}
