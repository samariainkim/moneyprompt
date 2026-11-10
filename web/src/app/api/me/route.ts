import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/env';

export const dynamic = 'force-dynamic';

// 기존 정적 페이지(헤더)에서 로그인 상태만 가볍게 확인하는 API. 개인정보는 돌려주지 않는다.
export async function GET() {
  let signedIn = false;
  if (supabaseConfigured()) {
    try {
      const { data } = await (await createClient()).auth.getUser();
      signedIn = Boolean(data.user);
    } catch {
      signedIn = false;
    }
  }
  return NextResponse.json({ signedIn }, { headers: { 'Cache-Control': 'no-store' } });
}
