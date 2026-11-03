'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { currentConsentDocs } from '@/lib/consents';

export type FormState = { error?: string; ok?: string };

const NICKNAME = /^[0-9A-Za-z가-힣_]{2,20}$/;

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login/');

  const nickname = String(formData.get('nickname') ?? '').trim();
  const displayName = String(formData.get('display_name') ?? '').trim();
  if (!NICKNAME.test(nickname)) return { error: '닉네임은 한글·영문·숫자·밑줄(_)로 2~20자여야 해요.' };
  if (displayName.length > 50) return { error: '이름은 50자 이하로 입력해 주세요.' };

  const { error } = await supabase
    .from('profiles')
    .update({ nickname, display_name: displayName || null })
    .eq('id', data.user.id);
  if (error) return { error: error.code === '23505' ? '이미 사용 중인 닉네임이에요.' : '저장하지 못했어요. 잠시 후 다시 시도해 주세요.' };

  revalidatePath('/account/');
  return { ok: '저장했어요.' };
}

/** 마케팅 수신 동의/철회: 기존 행을 고치지 않고 새 이력을 추가한다. */
export async function setMarketing(formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login/');

  const agreed = formData.get('agreed') === 'true';
  const doc = (await currentConsentDocs(supabase)).find((d) => d.type === 'marketing');
  if (!doc) return;
  await supabase.from('user_consents').insert({ user_id: data.user.id, document_id: doc.id, agreed, source: 'account' });
  revalidatePath('/account/');
}

export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login/');

  if (String(formData.get('confirm') ?? '').trim() !== '탈퇴') return { error: '확인 문구로 "탈퇴"를 입력해 주세요.' };

  const admin = createAdminClient();
  if (!admin) return { error: '탈퇴 처리가 아직 준비되지 않았어요. 운영자에게 문의해 주세요.' };

  const { error } = await admin.auth.admin.deleteUser(data.user.id);
  if (error) return { error: '탈퇴 처리 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.' };

  await supabase.auth.signOut();
  redirect('/?withdrawn=1');
}
