import type { Metadata } from 'next';
import Link from 'next/link';
import ResetPasswordForm from '@/components/ResetPasswordForm';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/env';

export const metadata: Metadata = { title: '새 비밀번호 설정' };

export default async function ResetPasswordPage() {
  // 재설정 메일의 링크(/auth/callback)를 거쳐 로그인된 세션이 있어야 한다.
  let signedIn = false;
  if (supabaseConfigured()) {
    const { data } = await (await createClient()).auth.getUser();
    signedIn = Boolean(data.user);
  }
  return (
    <div className="card narrow">
      <h1>새 비밀번호 설정</h1>
      {signedIn ? (
        <>
          <p className="lead">새로 사용할 비밀번호를 입력해 주세요.</p>
          <ResetPasswordForm />
        </>
      ) : (
        <>
          <p className="msg err" role="alert">재설정 링크가 만료되었거나, 링크를 요청한 브라우저와 달라요.</p>
          <p className="small"><Link href="/forgot-password/">재설정 메일 다시 요청하기</Link></p>
        </>
      )}
    </div>
  );
}
