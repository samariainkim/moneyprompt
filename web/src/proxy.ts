import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PROTECTED = ['/account', '/onboarding'];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const path = request.nextUrl.pathname;
  const needsAuth = PROTECTED.some((p) => path === p || path.startsWith(p + '/'));

  if (!url || !key) {
    // 환경변수가 없으면 보호 페이지는 열지 않는다.
    if (needsAuth) return NextResponse.redirect(new URL('/login/', request.url));
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // 세션 토큰 갱신 + 로그인 여부 확인 (서버에서 JWT 검증)
  const { data } = await supabase.auth.getClaims();
  const authed = Boolean(data?.claims);

  if (needsAuth && !authed) {
    const to = new URL('/login/', request.url);
    to.searchParams.set('next', path);
    return NextResponse.redirect(to);
  }
  return response;
}

// 앱 라우트에서만 실행한다. 기존 정적 페이지(/calc 등)에는 영향을 주지 않는다.
export const config = {
  matcher: [
    '/login', '/login/', '/signup', '/signup/', '/pricing', '/pricing/',
    '/account', '/account/:path*', '/onboarding', '/onboarding/:path*',
    '/auth/:path*', '/terms', '/terms/', '/privacy', '/privacy/',
  ],
};
