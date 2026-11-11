import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/auth';
import { classifyAuthError } from '@/lib/authErrors';
import { cleanSource, continueUrl } from '@/lib/gate';

// 이메일 인증 링크·비밀번호 재설정 링크·소셜 로그인 완료 후 돌아오는 주소
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));
  const src = cleanSource(searchParams.get('src'));
  const flow = next.startsWith('/reset-password') ? 'recovery' : 'signup';

  let reason = 'auth';
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // 비밀번호 재설정은 바로 새 비밀번호 화면으로, 그 외에는 로그인 후 라우팅(/auth/continue/)을 거친다.
    if (!error) return NextResponse.redirect(`${origin}${flow === 'recovery' ? next : continueUrl(next, src)}`);
    reason = classifyAuthError(error.message);
  } else {
    // 링크가 이미 만료/사용된 경우 Supabase 가 error_code 를 붙여 돌려보낸다.
    const errCode = searchParams.get('error_code') ?? searchParams.get('error_description') ?? searchParams.get('error');
    if (errCode) reason = classifyAuthError(errCode);
  }
  // 주소 뒤 #error=... (해시) 는 브라우저가 리다이렉트 뒤에도 유지하므로 로그인 화면에서 추가로 읽는다.
  return NextResponse.redirect(`${origin}/login/?error=${reason}&flow=${flow}`);
}
