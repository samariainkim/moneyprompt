'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import OAuthButtons from './OAuthButtons';

function friendly(message: string): string {
  if (/invalid login credentials/i.test(message)) return '이메일 또는 비밀번호가 맞지 않아요.';
  if (/email not confirmed/i.test(message)) return '이메일 인증이 아직 완료되지 않았어요. 받은 메일의 링크를 눌러 주세요.';
  return '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(''); setBusy(true);
    const f = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(f.get('email')).trim(),
      password: String(f.get('password')),
    });
    setBusy(false);
    if (error) { setError(friendly(error.message)); return; }
    router.push(next);
    router.refresh();
  }

  return (
    <>
      <form onSubmit={onSubmit}>
        <label htmlFor="email">이메일</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">비밀번호</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
        <button className="btn block" type="submit" disabled={busy}>{busy ? '확인 중…' : '로그인'}</button>
        {error && <p className="msg err" role="alert">{error}</p>}
      </form>
      <OAuthButtons next={next} />
      <p className="small" style={{ textAlign: 'center', marginTop: 20 }}>
        아직 회원이 아니신가요? <Link href="/signup/">회원가입</Link>
      </p>
    </>
  );
}
