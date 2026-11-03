import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';

export type Profile = {
  id: string;
  nickname: string;
  display_name: string | null;
  role: 'member' | 'business' | 'admin';
};

/** 로그인한 회원 + 프로필을 돌려준다. 로그아웃 상태면 로그인으로, 필수 동의가 없으면 동의 화면으로 보낸다. */
export async function requireMember(nextPath: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect(`/login/?next=${encodeURIComponent(nextPath)}`);

  const { data: needs } = await supabase.rpc('needs_consent');
  if (needs === true) redirect(`/onboarding/?next=${encodeURIComponent(nextPath)}`);

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nickname, display_name, role')
    .eq('id', user.id)
    .single<Profile>();
  return { supabase, user, profile };
}

/** 오픈 리다이렉트 방지: 사이트 내부 경로만 허용 */
export function safeNext(value: string | null | undefined, fallback = '/account/'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  return value;
}
