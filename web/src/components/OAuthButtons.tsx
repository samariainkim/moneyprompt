'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const GoogleIcon = () => (
  <svg className="gicon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.4z" /><path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A12 12 0 0 0 12 24z" /><path fill="#FBBC05" d="M5.6 14.7a7.2 7.2 0 0 1 0-4.6v-3H1.8a12 12 0 0 0 0 10.6z" /><path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3A12 12 0 0 0 1.8 7.1l3.8 3C6.5 6.8 9 4.8 12 4.8z" /></svg>
);

const LABELS: Record<string, string> = { google: 'Google로 계속하기', kakao: '카카오로 계속하기' };

export default function OAuthButtons({ next, src, compact = false, onStart }: { next: string; src?: string | null; compact?: boolean; onStart?: (provider: string) => void }) {
  const providers = (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? 'google')
    .split(',').map((s) => s.trim()).filter((p) => p in LABELS);
  const [error, setError] = useState('');
  if (providers.length === 0) return null;

  async function go(provider: string) {
    setError('');
    onStart?.(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as 'google' | 'kakao',
      options: { redirectTo: `${location.origin}/auth/callback/?next=${encodeURIComponent(next)}${src ? `&src=${encodeURIComponent(src)}` : ''}&evt=login` },
    });
    if (error) setError('소셜 로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }

  return (
    <>
      {!compact && <div className="divider">또는</div>}
      {providers.map((p) => (
        <button key={p} type="button" className={compact ? 'btn ghost google' : 'btn ghost block'} style={compact ? undefined : { marginTop: 8 }} onClick={() => go(p)}>
          {p === 'google' && <GoogleIcon />}{LABELS[p]}
        </button>
      ))}
      {error && <p className="msg err">{error}</p>}
    </>
  );
}
