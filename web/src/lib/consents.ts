import type { SupabaseClient } from '@supabase/supabase-js';

export type ConsentDoc = {
  id: string;
  type: 'terms' | 'privacy' | 'marketing' | 'third_party';
  version: string;
  required: boolean;
  title: string;
  content_url: string | null;
};

/** 현재 유효한 최신 약관(종류별 1개) */
export async function currentConsentDocs(supabase: SupabaseClient): Promise<ConsentDoc[]> {
  const { data } = await supabase
    .from('consent_documents')
    .select('id, type, version, required, title, content_url, effective_at')
    .lte('effective_at', new Date().toISOString())
    .order('effective_at', { ascending: false });
  const seen = new Set<string>();
  const out: ConsentDoc[] = [];
  for (const d of data ?? []) {
    if (seen.has(d.type)) continue;
    seen.add(d.type);
    const doc = d as ConsentDoc;
    // 마케팅 수신 동의 문구는 개인정보처리방침의 해당 조항으로 바로 연결한다(DB 값은 /privacy/ 로 되어 있음).
    if (doc.type === 'marketing' && (!doc.content_url || doc.content_url === '/privacy/')) doc.content_url = '/privacy/#marketing';
    out.push(doc);
  }
  return out;
}
