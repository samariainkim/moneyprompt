'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordForm() {
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(''); setBusy(true);
    const email = String(new FormData(e.currentTarget).get('email')).trim();
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback/?next=${encodeURIComponent('/reset-password/')}`,
    });
    setBusy(false);
    // 가입 여부를 알려주지 않도록, 형식·한도 오류가 아니면 항상 같은 안내를 보여준다.
    if (error && /rate|seconds|too many/i.test(error.message)) {
      setError('잠시 후 다시 시도해 주세요. 메일은 1분에 한 번만 보낼 수 있어요.');
      return;
    }
    if (error && /invalid|valid email/i.test(error.message)) {
      setError('이메일 주소를 확인해 주세요.');
      return;
    }
    setSent(email);
  }

  if (sent) {
    return (
      <div role="status">
        <p className="lead">
          <b>{sent}</b> 으로 가입된 계정이 있다면 비밀번호 재설정 메일을 보냈어요. 메일의 링크를 눌러 새 비밀번호를 정해 주세요.
        </p>
        <p className="small">메일이 오지 않으면 스팸함을 확인해 주세요. 링크는 요청한 <b>같은 브라우저</b>에서 열어야 해요.</p>
        <p className="small" style={{ marginTop: 16 }}><Link href="/login/">로그인으로 돌아가기</Link></p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="email">가입한 이메일</label>
      <input id="email" name="email" type="email" autoComplete="email" required />
      <button className="btn block" type="submit" disabled={busy}>{busy ? '보내는 중…' : '재설정 메일 보내기'}</button>
      {error && <p className="msg err" role="alert">{error}</p>}
      <p className="small" style={{ textAlign: 'center', marginTop: 20 }}><Link href="/login/">로그인으로 돌아가기</Link></p>
    </form>
  );
}
