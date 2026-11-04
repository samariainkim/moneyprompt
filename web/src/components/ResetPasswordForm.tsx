'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const f = new FormData(e.currentTarget);
    const password = String(f.get('password'));
    if (password.length < 8) { setError('비밀번호는 8자 이상이어야 해요.'); return; }
    if (password !== String(f.get('confirm'))) { setError('비밀번호가 서로 달라요.'); return; }

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(/same|different/i.test(error.message)
        ? '이전과 다른 비밀번호를 입력해 주세요.'
        : /weak|password/i.test(error.message)
          ? '비밀번호가 너무 약해요. 더 길고 복잡하게 만들어 주세요.'
          : '비밀번호를 바꾸지 못했어요. 링크가 만료되었다면 재설정 메일을 다시 요청해 주세요.');
      return;
    }
    router.push('/account/');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="password">새 비밀번호 (8자 이상)</label>
      <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      <label htmlFor="confirm">새 비밀번호 확인</label>
      <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      <button className="btn block" type="submit" disabled={busy}>{busy ? '변경 중…' : '비밀번호 변경'}</button>
      {error && <p className="msg err" role="alert">{error}</p>}
    </form>
  );
}
