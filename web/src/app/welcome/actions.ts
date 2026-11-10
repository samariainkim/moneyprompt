'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/auth';
import { EXPERIENCES, INTERESTS, OCCUPATIONS } from '@/lib/preferences';

export type FormState = { error?: string; ok?: string };

const ids = (list: readonly { id: string }[]) => list.map((x) => x.id);
const pickOne = (v: FormDataEntryValue | null, allowed: string[]) => (typeof v === 'string' && allowed.includes(v) ? v : null);

/** 선택정보 저장. 입력이 하나라도 있으면 "입력함", 모두 비어 있으면 "건너뜀"으로 기록한다. (welcome 화면·내 계정 공용) */
export async function savePreferences(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login/');

  const allowedInterests = ids(INTERESTS);
  const interests = [...new Set(formData.getAll('interests').map(String).filter((v) => allowedInterests.includes(v)))].slice(0, allowedInterests.length);
  const occupation = pickOne(formData.get('occupation'), ids(OCCUPATIONS));
  const experience = pickOne(formData.get('experience'), ids(EXPERIENCES));
  const complete = interests.length > 0 || occupation !== null || experience !== null;
  const now = new Date().toISOString();

  const { error } = await supabase.from('member_preferences').upsert(
    { user_id: data.user.id, interests, occupation, experience, completed_at: complete ? now : null, skipped_at: complete ? null : now },
    { onConflict: 'user_id' },
  );
  if (error) return { error: '저장하지 못했어요. 잠시 후 다시 시도해 주세요.' };

  if (String(formData.get('mode')) === 'welcome') redirect(safeNext(String(formData.get('next') ?? '')));
  revalidatePath('/account/');
  return { ok: '저장했어요.' };
}

/** "건너뛰기": 다시 묻지 않도록 건너뜀으로 기록한다. (이미 값이 있는 행은 건드리지 않는다) */
export async function skipPreferences(formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login/');
  await supabase.from('member_preferences').upsert(
    { user_id: data.user.id, skipped_at: new Date().toISOString() },
    { onConflict: 'user_id', ignoreDuplicates: true },
  );
  redirect(safeNext(String(formData.get('next') ?? '')));
}
