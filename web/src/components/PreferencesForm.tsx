'use client';

import { useActionState, useState } from 'react';
import { EXPERIENCES, INTERESTS, OCCUPATIONS } from '@/lib/preferences';
import { savePreferences, skipPreferences, type FormState } from '@/app/welcome/actions';

type Props = {
  mode: 'welcome' | 'account';
  next?: string;
  defaults?: { interests: string[]; occupation: string; experience: string };
};

export default function PreferencesForm({ mode, next = '/account/', defaults }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePreferences, {});
  const [interests, setInterests] = useState<string[]>(defaults?.interests ?? []);
  const [occupation, setOccupation] = useState(defaults?.occupation ?? '');
  const [experience, setExperience] = useState(defaults?.experience ?? '');

  const filled = (interests.length ? 1 : 0) + (occupation ? 1 : 0) + (experience ? 1 : 0);
  const pct = Math.round((filled / 3) * 100);
  const toggle = (id: string) => setInterests((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <form action={action}>
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="next" value={next} />

      <div className="progress" aria-label={`프로필 완성 ${pct}%`}><span style={{ width: `${pct}%` }} /></div>
      <p className="small" style={{ margin: '6px 0 4px' }}>
        프로필 완성 {pct}%{pct < 100 ? ' · 채울수록 맞춤 추천이 정확해져요' : ' · 맞춤 추천이 열렸어요'}
      </p>

      <fieldset className="pref">
        <legend>관심 분야 <span className="small">(여러 개 선택 가능)</span></legend>
        <p className="nudge">관심 분야를 고르면 <b>맞는 프롬프트를 먼저 보여드려요</b></p>
        <div className="chips">
          {INTERESTS.map((o) => (
            <label key={o.id} className={`chip${interests.includes(o.id) ? ' on' : ''}`}>
              <input type="checkbox" name="interests" value={o.id} checked={interests.includes(o.id)} onChange={() => toggle(o.id)} />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="pref">
        <legend>직업군</legend>
        <p className="nudge">직업군을 알려주시면 <b>업무에 도움 되는 도구</b>가 나오면 먼저 알려드려요</p>
        <div className="chips">
          {OCCUPATIONS.map((o) => (
            <label key={o.id} className={`chip${occupation === o.id ? ' on' : ''}`}>
              <input type="radio" name="occupation" value={o.id} checked={occupation === o.id} onChange={() => setOccupation(o.id)} />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="pref">
        <legend>AI·재테크 경험 수준</legend>
        <p className="nudge">수준에 맞는 <b>난이도부터 추천</b>해 드려요</p>
        <div className="chips">
          {EXPERIENCES.map((o) => (
            <label key={o.id} className={`chip${experience === o.id ? ' on' : ''}`}>
              <input type="radio" name="experience" value={o.id} checked={experience === o.id} onChange={() => setExperience(o.id)} />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <button className="btn block" type="submit" disabled={pending}>
        {pending ? '저장 중…' : mode === 'welcome' ? '저장하고 시작하기' : '저장'}
      </button>
      {mode === 'welcome' && (
        <button className="btn ghost block" type="submit" formAction={skipPreferences} formNoValidate style={{ marginTop: 8 }}>
          나중에 할게요
        </button>
      )}
      {state.error && <p className="msg err" role="alert">{state.error}</p>}
      {state.ok && <p className="msg ok" role="status">{state.ok}</p>}
      {mode === 'welcome' && <p className="small" style={{ marginTop: 10 }}>선택 항목이에요. 입력하지 않아도 모든 서비스를 이용할 수 있고, 언제든 <b>내 계정</b>에서 바꿀 수 있어요.</p>}
    </form>
  );
}
