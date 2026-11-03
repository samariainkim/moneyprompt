'use client';

import { useActionState } from 'react';
import { updateProfile, type FormState } from '@/app/account/actions';

export default function ProfileForm({ nickname, displayName }: { nickname: string; displayName: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, {});
  return (
    <form action={action}>
      <label htmlFor="nickname">닉네임</label>
      <input id="nickname" name="nickname" type="text" defaultValue={nickname} required minLength={2} maxLength={20} />
      <label htmlFor="display_name">이름 (선택)</label>
      <input id="display_name" name="display_name" type="text" defaultValue={displayName} maxLength={50} />
      <button className="btn block" type="submit" disabled={pending}>{pending ? '저장 중…' : '저장'}</button>
      {state.error && <p className="msg err" role="alert">{state.error}</p>}
      {state.ok && <p className="msg ok" role="status">{state.ok}</p>}
    </form>
  );
}
