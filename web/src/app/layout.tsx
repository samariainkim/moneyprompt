import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { headers } from 'next/headers';
import './globals.css';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/env';
import { signOut } from './actions';
import EventFromUrl from '@/components/EventFromUrl';
import { rdEnabled } from '@/lib/redesign';
import { RdHeader, RdFooter } from '@/components/rd/RdChrome';

// 기존 정적 페이지와 같은 GA4 측정 ID. 로컬 개발에서는 보내지 않는다.
const GA_ID = 'G-GW588P483F';

export const metadata: Metadata = {
  title: { default: '돈버프', template: '%s | 돈버프' },
  description: '돈에 AI를 더하다. 돈버프 회원 서비스.',
  // 파비콘: 탭은 심볼만, iOS 홈 화면은 크림 타일 (정적 페이지와 같은 파일 사용)
  icons: {
    icon: [{ url: '/favicon.ico', sizes: '48x48' }, { url: '/assets/brand/icon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/assets/brand/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let signedIn = false;
  let email: string | undefined;
  let nickname: string | undefined;
  // 새 디자인 적용 여부(주소별). 테스트·미리보기에서만 켜지고, 운영은 pages.json 의 production 목록을 따른다.
  const path = (await headers()).get('x-dbx-path');
  const rd = path ? rdEnabled(path) : false;
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
    email = data.user?.email ?? undefined;
    if (rd && data.user) {
      const { data: prof } = await supabase.from('profiles').select('nickname').eq('id', data.user.id).maybeSingle<{ nickname: string }>();
      nickname = prof?.nickname || undefined;
    }
  }

  const ga = process.env.NODE_ENV === 'production' && (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`if(!/(^|\\.)donbuff\\.com$/.test(location.hostname)){window['ga-disable-${GA_ID}']=true}window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');gtag('set','user_properties',{member_status:'${signedIn ? 'member' : 'guest'}'});`}
      </Script>
    </>
  );

  if (rd) {
    return (
      <html lang="ko">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap" rel="stylesheet" />
          <link rel="stylesheet" href="/redesign/frame.css" />
          <link rel="stylesheet" href="/redesign/member.css" />
        </head>
        <body className="rd">
          {ga}
          <EventFromUrl />
          <div className="site">
            <RdHeader signedIn={signedIn} nickname={nickname} email={email} />
            <main id="main" className="rdm">{children}</main>
            <RdFooter />
          </div>
          <script src="/redesign/frame.js" defer />
        </body>
      </html>
    );
  }

  return (
    <html lang="ko">
      <body>
        {ga}
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
