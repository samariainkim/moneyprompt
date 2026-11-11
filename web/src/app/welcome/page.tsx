import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import PreferencesForm from '@/components/PreferencesForm';
import { requireMember, safeNext } from '@/lib/auth';

export const metadata: Metadata = { title: '프로필 만들기' };

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const { supabase } = await requireMember('/welcome/');

  // 이미 입력했거나 건너뛴 회원은 다시 묻지 않는다.
  const { data: pref, error } = await supabase.from('member_preferences').select('user_id').maybeSingle();
  if (pref || error) redirect(next); // 이미 응답했거나, 조회에 실패하면(마이그레이션 전 등) 묻지 않고 넘어간다

  return (
    <div className="card narrow">
      <h1>환영해요! 🎉</h1>
      <p className="lead">관심사를 알려주시면 돈버프가 더 알맞게 도와드려요. 1분이면 돼요.</p>
      <PreferencesForm mode="welcome" next={next} />
    </div>
  );
}
