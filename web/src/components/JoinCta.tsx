'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import OAuthButtons from './OAuthButtons';
import { track } from '@/lib/ga';

type Props = { next: string; src: string | null; back: string; keepMessage: string };

/** 로그인 유도 페이지의 오른쪽(모바일은 위쪽) 로그인 영역 */
export default function JoinCta({ next, src, back, keepMessage }: Props) {
  const gate = src ?? 'direct';
  useEffect(() => { track('gate_view', { gate_id: gate }); }, [gate]);

  const q = `next=${encodeURIComponent(next)}${src ? `&src=${encodeURIComponent(src)}` : ''}`;
  const click = (action: string) => track('gate_click', { gate_id: gate, action, transport_type: 'beacon' });

  return (
    <aside className="join-panel" aria-label="로그인">
      <h2>그러니 지금 바로 로그인하세요!</h2>
      <p className="join-sub">무료 · 1분이면 끝나요</p>
      <div className="join-actions">
        <OAuthButtons next={next} src={src} compact onStart={() => click('google')} />
        <Link className="btn" href={`/login/?${q}`} onClick={() => click('login')}>이메일로 로그인</Link>
        <p className="small" style={{ textAlign: 'center', margin: 0 }}>
          아직 회원이 아니신가요?{' '}
          <Link href={`/signup/?${q}`} className="join-signup" onClick={() => { click('signup'); track('signup_start', { source: gate, transport_type: 'beacon' }); }}>무료 회원가입</Link>
        </p>
      </div>
      <div className="join-keep">✓ {keepMessage}</div>
      <p style={{ textAlign: 'center', margin: '12px 0 0' }}>
        <a className="join-back" href={back} onClick={() => click('dismiss')}>지금은 그냥 둘러볼게요</a>
      </p>
    </aside>
  );
}
