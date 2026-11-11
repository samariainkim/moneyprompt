'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const LABELS: Record<string, string> = { google: 'Google로 계속하기', kakao: '카카오로 계속하기' };

export default function OAuthButtons({ next, src }: { next: string; src?: string | null }) {
  const providers = (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? 'google')
    .split(',').map((s) => s.trim()).filter((p) => p in LABELS);
  const [error, setError] = useState('');
  if (providers.length === 0) return null;

  async function go(provider: string) {
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as 'google' | 'kakao',
      options: { redirectTo: `${location.origin}/auth/callback/?next=${encodeURIComponent(next)}${src ? `&src=${encodeURIComponent(src)}` : ''}` },
    });
    if (error) setError('소셜 로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }

  return (
    <>
      <div className="divider">또는</div>
      {providers.map((p) => (
        <button key={p} type="button" className="btn ghost block" style={{ marginTop: 8 }} onClick={() => go(p)}>
          {LABELS[p]}
        </button>
      ))}
      {error && <p className="msg err">{error}</p>}
    </>
  );
}
