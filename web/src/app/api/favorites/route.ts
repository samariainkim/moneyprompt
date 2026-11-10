import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// 프롬프트 즐겨찾기 (로그인한 회원 본인 것만). 키는 프롬프트 idx 형식(예: 01/05).
const KEY = /^\d{2}\/\d{2}$/;
const MAX_KEYS = 300;
const NO_STORE = { 'Cache-Control': 'no-store' };

// 다른 사이트에서 쿠키를 싣고 보내는 요청을 막는다. (같은 사이트의 요청은 Origin 이 같거나 없다)
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

async function listKeys(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string[] | null> {
  const { data, error } = await supabase.from('user_favorites').select('prompt_key').order('created_at', { ascending: true });
  if (error) return null;
  return (data ?? []).map((r) => r.prompt_key as string);
}

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

export async function GET() {
  const { supabase, user } = await member();
  if (!user) return json({ error: 'unauthorized' }, 401);
  const keys = await listKeys(supabase);
  if (!keys) return json({ error: 'server' }, 500);
  return json({ keys });
}

// 한 개 추가/삭제: { key: "01/05", on: true|false }
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  const { supabase, user } = await member();
  if (!user) return json({ error: 'unauthorized' }, 401);

  const body = await req.json().catch(() => null) as { key?: unknown; on?: unknown } | null;
  if (!body || typeof body.key !== 'string' || !KEY.test(body.key) || typeof body.on !== 'boolean') return json({ error: 'bad_request' }, 400);

  const { error } = body.on
    ? await supabase.from('user_favorites').upsert({ user_id: user.id, prompt_key: body.key }, { onConflict: 'user_id,prompt_key', ignoreDuplicates: true })
    : await supabase.from('user_favorites').delete().eq('user_id', user.id).eq('prompt_key', body.key);
  if (error) return json({ error: 'server' }, 500);
  return json({ ok: true });
}

// 이 기기의 즐겨찾기를 계정으로 옮기기: { keys: ["01/05", ...] } → 합쳐진 전체 목록을 돌려준다.
export async function PUT(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  const { supabase, user } = await member();
  if (!user) return json({ error: 'unauthorized' }, 401);

  const body = await req.json().catch(() => null) as { keys?: unknown } | null;
  if (!body || !Array.isArray(body.keys) || body.keys.length > MAX_KEYS || !body.keys.every((k) => typeof k === 'string' && KEY.test(k))) return json({ error: 'bad_request' }, 400);

  const unique = [...new Set(body.keys as string[])];
  if (unique.length) {
    const { error } = await supabase.from('user_favorites')
      .upsert(unique.map((k) => ({ user_id: user.id, prompt_key: k })), { onConflict: 'user_id,prompt_key', ignoreDuplicates: true });
    if (error) return json({ error: 'server' }, 500);
  }
  const keys = await listKeys(supabase);
  if (!keys) return json({ error: 'server' }, 500);
  return json({ keys });
}
