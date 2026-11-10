import type { Metadata } from 'next';
import SignupForm from '@/components/SignupForm';
import { createClient } from '@/lib/supabase/server';
import { currentConsentDocs } from '@/lib/consents';
import { supabaseConfigured } from '@/lib/supabase/env';
import { safeNext } from '@/lib/auth';
import { cleanSource } from '@/lib/gate';

export const metadata: Metadata = { title: '회원가입' };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string; src?: string }> }) {
  const sp = await searchParams;
  if (!supabaseConfigured()) {
    return <div className="card narrow"><h1>회원가입</h1><p className="msg err">서비스 설정이 아직 완료되지 않았어요.</p></div>;
  }
  const docs = await currentConsentDocs(await createClient());
  return (
    <div className="card narrow">
      <h1>회원가입</h1>
      <p className="lead">이메일로 가입하고 돈버프 서비스를 이용하세요.</p>
      <SignupForm docs={docs} next={safeNext(sp.next)} src={cleanSource(sp.src)} />
    </div>
  );
}
