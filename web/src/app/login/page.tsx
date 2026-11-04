import type { Metadata } from 'next';
import AuthErrorNotice from '@/components/AuthErrorNotice';
import LoginForm from '@/components/LoginForm';
import { safeNext } from '@/lib/auth';
import { parseFlow, parseReason } from '@/lib/authErrors';
import { supabaseConfigured } from '@/lib/supabase/env';

export const metadata: Metadata = { title: '로그인' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; flow?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  // 예전 링크(?error=auth)도 같은 안내로 처리한다.
  const reason = sp.error ? (parseReason(sp.error) ?? 'auth') : null;
  return (
    <div className="card narrow">
      <h1>로그인</h1>
      <p className="lead">돈버프 계정으로 로그인하세요.</p>
      {reason && <AuthErrorNotice reason={reason} flow={parseFlow(sp.flow)} />}
      {supabaseConfigured() ? <LoginForm next={next} /> : <p className="msg err">서비스 설정이 아직 완료되지 않았어요.</p>}
    </div>
  );
}
