import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/auth';
import { addParams, cleanSource, continueUrl } from '@/lib/gate';

// 로그인(또는 이메일 인증) 직후에 거치는 라우팅.
//   1) 필수 약관 동의가 필요하면 동의 화면 → 2) 가입 완료 기록(처음 한 번만, 측정 이벤트 부착)
//   → 3) 선택정보를 아직 안 물었으면 /welcome/ (단, 가입 안내 시트에서 온 경우는 하던 일을 먼저 이어가도록 건너뜀)
//   → 4) 원래 가려던 곳
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get('next'));
  const src = cleanSource(searchParams.get('src'));
  const evt = searchParams.get('evt') === 'login' ? 'login' : null; // 직접 로그인한 경우에만 login 이벤트
  const go = (path: string) => NextResponse.redirect(`${origin}${path}`);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return go(`/login/?next=${encodeURIComponent(next)}`);

  const { data: needs } = await supabase.rpc('needs_consent');
  if (needs === true) return go(`/onboarding/?next=${encodeURIComponent(continueUrl(next, src, evt))}`);

  let target = next;
  const { data: firstSource } = await supabase.rpc('complete_signup', { p_source: src });
  if (typeof firstSource === 'string') {
    const provider = String(user.app_metadata?.provider ?? 'email');
    target = addParams(next, { dbx_evt: 'signup_complete', dbx_src: firstSource, dbx_m: provider });
  } else if (evt === 'login') {
    // 이미 가입한 회원이 로그인한 경우: GA4 권장 이벤트 login (method = google | email)
    const provider = String(user.app_metadata?.provider ?? 'email');
    target = addParams(next, { dbx_evt: 'login', dbx_m: provider });
  }

  if (!next.includes('dbx_resume=')) {
    // 조회가 실패하면(예: 마이그레이션 적용 전) 로그인을 막지 않도록 선택정보 단계를 건너뛴다.
    const { data: pref, error: prefError } = await supabase.from('member_preferences').select('user_id').maybeSingle();
    if (!prefError && !pref) return go(`/welcome/?next=${encodeURIComponent(target)}`);
  }
  return go(target);
}
