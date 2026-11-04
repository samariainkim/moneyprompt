'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const COOLDOWN_SEC = 60; // Supabase 는 같은 주소로 약 60초에 한 번만 인증 메일을 보낸다.

/** 인증 메일 다시 보내기 (재전송 대기 시간 포함) */
export default function ResendVerification({ email }: { email: string }) {
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function resend() {
    setMsg(null); setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback/` },
    });
    setBusy(false);
    if (error) {
      const limited = /rate|seconds|too many/i.test(error.message);
      setMsg({ type: 'err', text: limited ? '잠시 후 다시 시도해 주세요. 메일은 1분에 한 번만 보낼 수 있어요.' : '메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.' });
      if (limited) setWait(COOLDOWN_SEC);
      return;
    }
    setMsg({ type: 'ok', text: '인증 메일을 다시 보냈어요. 스팸함도 확인해 주세요.' });
    setWait(COOLDOWN_SEC);
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button type="button" className="btn ghost" onClick={resend} disabled={busy || wait > 0}>
        {busy ? '보내는 중…' : wait > 0 ? `인증 메일 다시 보내기 (${wait}초)` : '인증 메일 다시 보내기'}
      </button>
      {msg && <p className={`msg ${msg.type === 'ok' ? 'ok' : 'err'}`} role={msg.type === 'ok' ? 'status' : 'alert'}>{msg.text}</p>}
    </div>
  );
}
