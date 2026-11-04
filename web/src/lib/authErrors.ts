/** 인증 링크 실패 이유 (callback → /login 으로 전달되는 값) */
export type AuthErrorReason = 'expired' | 'verifier' | 'auth';
export type AuthFlow = 'recovery' | 'signup';

const REASONS: AuthErrorReason[] = ['expired', 'verifier', 'auth'];

export function parseReason(v: string | null | undefined): AuthErrorReason | null {
  return v && (REASONS as string[]).includes(v) ? (v as AuthErrorReason) : null;
}

export function parseFlow(v: string | null | undefined): AuthFlow {
  return v === 'recovery' ? 'recovery' : 'signup';
}

/** Supabase 오류 코드/메시지를 사용자에게 보여줄 이유로 분류한다. */
export function classifyAuthError(codeOrMessage: string | null | undefined): AuthErrorReason {
  const s = (codeOrMessage ?? '').toLowerCase();
  if (/verifier|pkce/.test(s)) return 'verifier';
  if (/otp_expired|expired|invalid|already|used/.test(s)) return 'expired';
  return 'auth';
}
