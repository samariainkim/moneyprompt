import cfg from '../../redesign/pages.json';

/**
 * 리뉴얼(새 디자인) 스위치 — web/redesign/pages.json 의 `preview` / `production` 목록과 같은 기준을 쓴다.
 * 운영(VERCEL_ENV=production)은 production 목록, 그 외(미리보기·로컬)는 preview 목록. 목록에 없으면 기존 화면 그대로.
 * 정적 페이지(프롬프트·계산기 등)는 빌드 때 sync-static.mjs 가, Next.js 가 그리는 회원 화면은 여기서 같은 목록을 본다.
 */
type Cfg = { pages?: Record<string, string>; nextPages?: string[]; preview?: string[]; production?: string[] };
const c = cfg as Cfg;

const norm = (p: string) => (p.endsWith('/') ? p : p + '/');

/** 정적 새 디자인 페이지(예: /brief/)가 이 환경에서 켜져 있는지. 헤더 메뉴·사이트맵이 죽은 링크를 만들지 않도록 쓴다. */
export function rdPageOn(path: string): boolean {
  const env = process.env.VERCEL_ENV === 'production' ? 'production' : 'preview';
  const p = norm(path);
  return Boolean(c.pages?.[p]) && (c[env] ?? []).includes(p);
}

export function rdEnabled(path: string): boolean {
  const env = process.env.VERCEL_ENV === 'production' ? 'production' : 'preview';
  const p = norm(path);
  return (c.nextPages ?? []).includes(p) && (c[env] ?? []).includes(p);
}
