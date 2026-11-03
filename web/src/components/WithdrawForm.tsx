'use client';

import { useActionState } from 'react';
import { deleteAccount, type FormState } from '@/app/account/actions';

export default function WithdrawForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(deleteAccount, {});
  return (
    <form action={action}>
      <p className="lead">
        탈퇴하면 계정과 프로필, 동의 이력이 삭제되며 되돌릴 수 없어요. 법령에 따라 보관해야 하는 결제 기록은 예외예요.
      </p>
      <label htmlFor="confirm">계속하려면 <b>탈퇴</b>를 입력하세요</label>
      <input id="confirm" name="confirm" type="text" autoComplete="off" required />
      <button className="btn danger block" type="submit" disabled={pending}>{pending ? '처리 중…' : '회원 탈퇴'}</button>
      {state.error && <p className="msg err" role="alert">{state.error}</p>}
    </form>
  );
}
