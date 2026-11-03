'use client';

import { useActionState, useState } from 'react';
import type { ConsentDoc } from '@/lib/consents';
import { acceptConsents, type FormState } from '@/app/onboarding/actions';

export default function OnboardingForm({ docs, next }: { docs: ConsentDoc[]; next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(acceptConsents, {});
  const [agree, setAgree] = useState<Record<string, boolean>>({});
  const requiredOk = docs.filter((d) => d.required).every((d) => agree[d.type]);

  return (
    <form action={action}>
      <input type="hidden" name="next" value={next} />
      {docs.map((d) => (
        <label className="check" key={d.type}>
          <input type="checkbox" name={`doc_${d.type}`} checked={Boolean(agree[d.type])}
            onChange={(e) => setAgree({ ...agree, [d.type]: e.target.checked })} />
          <span>
            <span className="tag">{d.required ? '필수' : '선택'}</span>
            {d.content_url ? <a href={d.content_url} target="_blank" rel="noreferrer">{d.title}</a> : d.title}
          </span>
        </label>
      ))}
      <button className="btn block" type="submit" disabled={pending || !requiredOk}>{pending ? '저장 중…' : '동의하고 시작하기'}</button>
      {state.error && <p className="msg err" role="alert">{state.error}</p>}
    </form>
  );
}
