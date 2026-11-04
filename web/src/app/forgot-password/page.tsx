import type { Metadata } from 'next';
import ForgotPasswordForm from '@/components/ForgotPasswordForm';
import { supabaseConfigured } from '@/lib/supabase/env';

export const metadata: Metadata = { title: '비밀번호 찾기' };

export default function ForgotPasswordPage() {
  return (
    <div className="card narrow">
      <h1>비밀번호 찾기</h1>
      <p className="lead">가입한 이메일로 비밀번호 재설정 링크를 보내드려요.</p>
      {supabaseConfigured() ? <ForgotPasswordForm /> : <p className="msg err">서비스 설정이 아직 완료되지 않았어요.</p>}
    </div>
  );
}
