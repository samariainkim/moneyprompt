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
    out.push(d as ConsentDoc);
  }
  return out;
}
