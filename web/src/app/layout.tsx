import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/env';
import { signOut } from './actions';

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
