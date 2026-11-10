import type { Metadata } from 'next';
import ProfileForm from '@/components/ProfileForm';
import WithdrawForm from '@/components/WithdrawForm';
import PreferencesForm from '@/components/PreferencesForm';
import { progressOf, type Preferences } from '@/lib/preferences';
import { requireMember } from '@/lib/auth';
import { setMarketing } from './actions';

export const metadata: Metadata = { title: '내 계정' };

type ConsentRow = {
  agreed: boolean; created_at: string;
  consent_documents: { type: string; version: string; title: string } | null;
};

const ROLE: Record<string, string> = { member: '일반 회원', business: '사업자 회원', admin: '관리자' };

export default async function AccountPage() {
  const { supabase, user, profile } = await requireMember('/account/');

  // 종류별 가장 최근 동의 상태
  const { data } = await supabase
    .from('user_consents')
    .select('agreed, created_at, consent_documents(type, version, title)')
    .order('created_at', { ascending: false })
    .returns<ConsentRow[]>();
  const latest = new Map<string, ConsentRow>();
  for (const r of data ?? []) {
    const t = r.consent_documents?.type;
    if (t && !latest.has(t)) latest.set(t, r);
  }
  const marketing = latest.get('marketing');
  const { data: prefRow } = await supabase.from('member_preferences').select('interests, occupation, experience, completed_at, skipped_at').maybeSingle<Preferences>();
  const pct = progressOf(prefRow);
  const ORDER = ['terms', 'privacy', 'marketing', 'third_party'];
  const rows = [...latest.entries()].sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0])).map(([, r]) => r);
  const fmt = (s: string) => new Date(s).toLocaleDateString('ko-KR');

  return (
    <>
      <h1>내 계정</h1>
      <p className="lead">{user.email} · {ROLE[profile?.role ?? 'member']}</p>

      <div className="card narrow" style={{ margin: '0 0 20px' }}>
        <h2>프로필</h2>
        <ProfileForm nickname={profile?.nickname ?? ''} displayName={profile?.display_name ?? ''} />
      </div>

      <div className="card narrow" style={{ margin: '0 0 20px' }}>
        <h2>프로필 완성 {pct}%</h2>
        <p className="lead">관심 분야·직업군·경험 수준을 알려주시면 맞는 프롬프트를 먼저 보여드려요. 모두 선택 항목이에요.</p>
        <PreferencesForm
          mode="account"
          defaults={{ interests: prefRow?.interests ?? [], occupation: prefRow?.occupation ?? '', experience: prefRow?.experience ?? '' }}
        />
      </div>

      <div className="card narrow" style={{ margin: '0 0 20px' }}>
        <h2>약관 동의 내역</h2>
        {rows.map((r) => (
          <div className="row" key={r.consent_documents?.type}>
            <span>{r.consent_documents?.title} <span className="small">({r.consent_documents?.version})</span></span>
            <span className="small">{r.agreed ? `동의 · ${fmt(r.created_at)}` : `미동의 · ${fmt(r.created_at)}`}</span>
          </div>
        ))}
        <form action={setMarketing} style={{ marginTop: 14 }}>
          <input type="hidden" name="agreed" value={marketing?.agreed ? 'false' : 'true'} />
          <button className="btn ghost" type="submit">
            {marketing?.agreed ? '마케팅 정보 수신 철회' : '마케팅 정보 수신 동의'}
          </button>
        </form>
      </div>

      <div className="card narrow" style={{ margin: 0 }}>
        <h2>회원 탈퇴</h2>
        <WithdrawForm />
      </div>
    </>
  );
}
