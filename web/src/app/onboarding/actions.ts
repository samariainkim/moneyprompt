'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { currentConsentDocs } from '@/lib/consents';
import { safeNext } from '@/lib/auth';

export type FormState = { error?: string };

export async function acceptConsents(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login/');

  // 문서 id 는 클라이언트 값을 믿지 않고 서버에서 현재 유효한 약관을 다시 조회한다.
  const docs = await currentConsentDocs(supabase);
  const rows = [];
  for (const d of docs) {
    const checked = formData.get(`doc_${d.type}`) === 'on';
    if (d.required && !checked) return { error: '필수 약관에 모두 동의해 주세요.' };
    rows.push({ user_id: data.user.id, document_id: d.id, agreed: checked, source: 'onboarding' });
  }
  if (rows.length) {
    const { error } = await supabase.from('user_consents').insert(rows);
    if (error) return { error: '동의 내용을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.' };
  }
  redirect(safeNext(String(formData.get('next') ?? '')));
}
