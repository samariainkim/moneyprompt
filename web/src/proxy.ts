import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PROTECTED = ['/account', '/onboarding', '/welcome'];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Supabase 가 허용되지 않은 주소에서 시작한 로그인을 Site URL(메인 /)로 되돌리면 ?code= 가 붙어 온다.
  // 그 코드를 로그인 처리 주소로 넘겨 로그인을 마무리한다. 그 외 메인 요청은 그대로 통과시킨다.
  if (path === '/') {
    const code = request.nextUrl.searchParams.get('code');
    if (code) {
      const to = new URL('/auth/callback/', request.url);
      to.searchParams.set('code', code);
      to.searchParams.set('next', '/account/');
      return NextResponse.redirect(to);
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
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
    '/',
    '/login', '/login/', '/signup', '/signup/', '/pricing', '/pricing/',
    '/account', '/account/:path*', '/onboarding', '/onboarding/:path*', '/welcome', '/welcome/:path*',
    '/auth/:path*', '/terms', '/terms/', '/privacy', '/privacy/',
    '/forgot-password', '/forgot-password/', '/reset-password', '/reset-password/',
  ],
};
