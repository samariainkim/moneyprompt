import type { Metadata } from 'next';
import LoginForm from '@/components/LoginForm';
import { safeNext } from '@/lib/auth';
import { supabaseConfigured } from '@/lib/supabase/env';

export const metadata: Metadata = { title: '로그인' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  return (
    <div className="card narrow">
      <h1>로그인</h1>
      <p className="lead">돈버프 계정으로 로그인하세요.</p>
      {sp.error && <p className="msg err" role="alert">로그인 링크가 만료되었거나 올바르지 않아요. 다시 시도해 주세요.</p>}
      {supabaseConfigured() ? <LoginForm next={next} /> : <p className="msg err">서비스 설정이 아직 완료되지 않았어요.</p>}
    </div>
  );
}
