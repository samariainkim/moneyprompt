import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSavedTool, SAVED_PAYLOAD_MAX } from '@/lib/saved';

export const dynamic = 'force-dynamic';

// 내 결과 저장 (로그인한 회원 본인 것만)
const NO_STORE = { 'Cache-Control': 'no-store' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.get('host'); } catch { return false; }
}

async function member() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

// 목록(payload 제외) 또는 ?id= 로 한 건(payload 포함)
export async function GET(req: NextRequest) {
  const { supabase, user } = await member();
  if (!user) return json({ error: 'unauthorized' }, 401);

  const id = req.nextUrl.searchParams.get('id');
  if (id !== null) {
    if (!UUID.test(id)) return json({ error: 'bad_request' }, 400);
    const { data, error } = await supabase.from('saved_results').select('id, tool, title, summary, payload, created_at').eq('id', id).maybeSingle();
    if (error) return json({ error: 'server' }, 500);
    if (!data) return json({ error: 'not_found' }, 404);
    return json({ item: data });
  }
  const { data, error } = await supabase.from('saved_results').select('id, tool, title, summary, created_at').order('created_at', { ascending: false }).limit(100);
  if (error) return json({ error: 'server' }, 500);
  return json({ items: data ?? [] });
}

// 저장: { tool, title, summary?, payload }
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  const { supabase, user } = await member();
  if (!user) return json({ error: 'unauthorized' }, 401);

  const body = await req.json().catch(() => null) as { tool?: unknown; title?: unknown; summary?: unknown; payload?: unknown } | null;
  if (!body || !isSavedTool(body.tool)) return json({ error: 'bad_request' }, 400);
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const summary = typeof body.summary === 'string' ? body.summary.trim() : '';
  const payload = body.payload;
  if (!title || title.length > 80 || summary.length > 200) return json({ error: 'bad_request' }, 400);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || JSON.stringify(payload).length > SAVED_PAYLOAD_MAX) return json({ error: 'bad_request' }, 400);

  const { data, error } = await supabase.from('saved_results').insert({ user_id: user.id, tool: body.tool, title, summary, payload }).select('id').single();
  if (error) {
    if (/saved_results_limit/.test(error.message ?? '')) return json({ error: 'limit' }, 409);
    return json({ error: 'server' }, 500);
  }
  return json({ ok: true, id: data.id });
}

// 삭제: ?id=
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  const { supabase, user } = await member();
  if (!user) return json({ error: 'unauthorized' }, 401);
  const id = req.nextUrl.searchParams.get('id');
  if (!id || !UUID.test(id)) return json({ error: 'bad_request' }, 400);
  const { error } = await supabase.from('saved_results').delete().eq('id', id).eq('user_id', user.id);
  if (error) return json({ error: 'server' }, 500);
  return json({ ok: true });
}
