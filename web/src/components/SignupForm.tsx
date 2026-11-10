'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { ConsentDoc } from '@/lib/consents';
import OAuthButtons from './OAuthButtons';
import ResendVerification from './ResendVerification';

export default function SignupForm({ docs, next = '/account/', src = null }: { docs: ConsentDoc[]; next?: string; src?: string | null }) {
  const [agree, setAgree] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');
  const [busy, setBusy] = useState(false);

  const requiredOk = docs.filter((d) => d.required).every((d) => agree[d.type]);
  const allChecked = docs.length > 0 && docs.every((d) => agree[d.type]);
  const toggleAll = (v: boolean) => setAgree(Object.fromEntries(docs.map((d) => [d.type, v])));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!requiredOk) { setError('필수 약관에 동의해 주세요.'); return; }
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email')).trim();
    const password = String(f.get('password'));
    if (password.length < 8) { setError('비밀번호는 8자 이상이어야 해요.'); return; }
    setBusy(true);
    const consents = Object.fromEntries(docs.map((d) => [d.type, Boolean(agree[d.type])]));
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback/?next=${encodeURIComponent(next)}${src ? `&src=${encodeURIComponent(src)}` : ''}`,
        data: { consents, ...(src ? { signup_source: src } : {}) },
      },
    });
    setBusy(false);
    if (error) {
      setError(/password/i.test(error.message) ? '비밀번호가 너무 약해요. 더 길고 복잡하게 만들어 주세요.' : '가입하지 못했어요. 잠시 후 다시 시도해 주세요.');
      return;
    }
    setSent(email);
  }

  if (sent) {
    return (
      <div role="status">
        <h2>인증 메일을 보냈어요</h2>
        <p className="lead">{sent} 으로 보낸 메일의 링크를 누르면 가입이 완료돼요.</p>
        <p className="small">메일이 오지 않나요?</p>
        <ul className="small" style={{ margin: '4px 0 0', paddingLeft: 18 }}>
          <li>스팸함을 확인해 주세요.</li>
          <li>이미 가입한 이메일이라면 새 메일이 가지 않아요. <Link href="/login/">로그인</Link>하거나 <Link href="/forgot-password/">비밀번호 찾기</Link>를 이용해 주세요.</li>
          <li>아직 가입 전이라면 아래 버튼으로 다시 받을 수 있어요.</li>
        </ul>
        <ResendVerification email={sent} />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={onSubmit}>
        <label htmlFor="email">이메일</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">비밀번호 (8자 이상)</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />

        <div style={{ marginTop: 20 }}>
          <label className="check" style={{ fontWeight: 700 }}>
            <input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} /> 전체 동의
          </label>
          {docs.map((d) => (
            <label className="check" key={d.type}>
              <input type="checkbox" checked={Boolean(agree[d.type])} onChange={(e) => setAgree({ ...agree, [d.type]: e.target.checked })} />
              <span>
                <span className="tag">{d.required ? '필수' : '선택'}</span>
                {d.content_url ? <a href={d.content_url} target="_blank" rel="noreferrer">{d.title}</a> : d.title}
              </span>
            </label>
          ))}
        </div>

        <button className="btn block" type="submit" disabled={busy || !requiredOk}>{busy ? '처리 중…' : '가입하기'}</button>
        {error && <p className="msg err" role="alert">{error}</p>}
      </form>
      <p className="small" style={{ marginTop: 16 }}>소셜 계정으로 시작하면 로그인 직후 약관 동의 화면이 이어져요.</p>
      <OAuthButtons next={next} src={src} />
      <p className="small" style={{ textAlign: 'center', marginTop: 20 }}>
        이미 회원이신가요? <Link href={`/login/?next=${encodeURIComponent(next)}${src ? `&src=${encodeURIComponent(src)}` : ''}`}>로그인</Link>
      </p>
    </>
  );
}
