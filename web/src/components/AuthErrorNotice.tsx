'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { classifyAuthError, type AuthErrorReason, type AuthFlow } from '@/lib/authErrors';

const MESSAGES: Record<AuthErrorReason, { title: string; body: string }> = {
  expired: {
    title: '링크가 만료되었거나 이미 사용된 링크예요.',
    body: '링크는 한 번만 사용할 수 있고, 일정 시간이 지나면 만료돼요. 메일을 다시 받아 새 링크를 눌러 주세요.',
  },
  verifier: {
    title: '링크를 요청한 브라우저와 다른 브라우저에서 열었어요.',
    body: '보안을 위해 링크는 요청한 같은 브라우저에서 열어야 해요. 메일 앱의 내장 브라우저가 아닌, 요청에 쓴 브라우저에서 다시 열어 주세요.',
  },
  auth: {
    title: '로그인 링크가 올바르지 않아요.',
    body: '다시 시도해 주세요. 계속 안 되면 메일을 다시 받아 주세요.',
  },
};

export default function AuthErrorNotice({ reason, flow }: { reason: AuthErrorReason; flow: AuthFlow }) {
  // 주소 해시(#error_code=otp_expired …)에 더 정확한 이유가 있으면 그것을 우선한다.
  const [hashReason, setHashReason] = useState<AuthErrorReason | null>(null);
  useEffect(() => {
    const h = window.location.hash.replace(/^#/, '');
    if (!h) return;
    const p = new URLSearchParams(h);
    const raw = p.get('error_code') ?? p.get('error_description') ?? p.get('error');
    if (raw) setHashReason(classifyAuthError(raw));
  }, []);

  const m = MESSAGES[hashReason ?? reason];
  return (
    <div className="msg err" role="alert">
      <p style={{ margin: 0, fontWeight: 700 }}>{m.title}</p>
      <p style={{ margin: '4px 0 0' }}>{m.body}</p>
      <p style={{ margin: '8px 0 0' }}>
        {flow === 'recovery' ? (
          <Link href="/forgot-password/">비밀번호 재설정 메일 다시 요청하기</Link>
        ) : (
          <>이메일과 비밀번호로 로그인하면 <b>인증 메일 다시 보내기</b> 버튼이 나와요.</>
        )}
      </p>
    </div>
  );
}
