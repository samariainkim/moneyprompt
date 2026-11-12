import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import './globals.css';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/env';
import { signOut } from './actions';
import EventFromUrl from '@/components/EventFromUrl';

// 기존 정적 페이지와 같은 GA4 측정 ID. 로컬 개발에서는 보내지 않는다.
const GA_ID = 'G-GW588P483F';

export const metadata: Metadata = {
  title: { default: '돈버프', template: '%s | 돈버프' },
  description: '돈에 AI를 더하다. 돈버프 회원 서비스.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let signedIn = false;
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  }
  return (
    <html lang="ko">
      <body>
        {process.env.NODE_ENV === 'production' && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');gtag('set','user_properties',{member_status:'${signedIn ? 'member' : 'guest'}'});`}
            </Script>
          </>
        )}
        <EventFromUrl />
        <header className="site-header">
          <div className="inner">
            <a className="logo" href="/">돈<span>버프</span></a>
            <nav className="nav">
              <a href="/calc/">금융계산기</a>
              <a href="/prompt/">프롬프트</a>
              <a href="/invest-mbti/">투자 성향</a>
              <Link href="/pricing/">요금제</Link>
              {signedIn ? (
                <>
                  <Link href="/account/">내 계정</Link>
                  <form action={signOut}><button type="submit">로그아웃</button></form>
                </>
              ) : (
                <Link href="/login/">로그인</Link>
              )}
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
