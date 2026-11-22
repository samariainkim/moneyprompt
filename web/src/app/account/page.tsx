import type { Metadata } from 'next';
import Link from 'next/link';
import ProfileForm from '@/components/ProfileForm';
import WithdrawForm from '@/components/WithdrawForm';
import PreferencesForm from '@/components/PreferencesForm';
import { progressOf, type Preferences } from '@/lib/preferences';
import { requireMember } from '@/lib/auth';
import { setMarketing } from './actions';
import { signOut } from '@/app/actions';
import { rdEnabled } from '@/lib/redesign';
import { SAVED_ICON, SAVED_TOOLS, isSavedTool, restoreUrl } from '@/lib/saved';

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

  if (rdEnabled('/account/')) {
    // 새 디자인(마이페이지): 요약 타일과 최근 저장한 결과를 함께 보여준다. 조회가 실패해도 화면은 열린다.
    type SavedRow = { id: string; tool: string; title: string; summary: string; created_at: string };
    const { data: recent } = await supabase.from('saved_results').select('id, tool, title, summary, created_at').order('created_at', { ascending: false }).limit(3).returns<SavedRow[]>();
    const { count: savedCount } = await supabase.from('saved_results').select('id', { count: 'exact', head: true });
    const { count: favCount } = await supabase.from('user_favorites').select('prompt_key', { count: 'exact', head: true });
    const { data: mbtiRow } = await supabase.from('saved_results').select('title').eq('tool', 'mbti').order('created_at', { ascending: false }).limit(1).maybeSingle<{ title: string }>();
    const mbtiCode = mbtiRow?.title?.match(/[CO][SN][TF][LQ]/)?.[0];
    const initial = (profile?.nickname || user.email || '?').trim().charAt(0).toUpperCase();
    const left = 3 - Math.round((pct / 100) * 3);
    const day = (s: string) => new Date(s).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });

    return (
      <>
        <section className="mh">
          <div className="wrap">
            <div className="prof">
              <div className="av" aria-hidden="true">{initial}</div>
              <div>
                <h1>{profile?.nickname || '회원'}<span> 님</span></h1>
                <div className="em">{user.email ?? "이메일 정보 없음"}</div>
                <span className="role">{ROLE[profile?.role ?? 'member']}</span>
              </div>
              <div className="ring">
                <div className="rg" style={{ ['--p' as string]: pct } as React.CSSProperties}><b>{pct}%</b></div>
                <div><small>프로필 완성</small><strong>{left > 0 ? `${left}개만 더 채워볼까요?` : '맞춤 추천이 열렸어요'}</strong></div>
              </div>
            </div>
          </div>
        </section>
        <div className="wrap pg">
          <div className={`tiles${mbtiCode ? '' : ' two'}`}>
            <Link className="tl" href="/account/saved/"><span className="ic" aria-hidden="true">📊</span><div><b>{savedCount ?? 0}</b><span className="n">내 결과</span></div><i aria-hidden="true">→</i></Link>
            <a className="tl" href="/prompt/?fav=1"><span className="ic" aria-hidden="true">⭐</span><div><b>{favCount ?? 0}</b><span className="n">즐겨찾기 프롬프트</span></div><i aria-hidden="true">→</i></a>
            {mbtiCode && <a className="tl" href="/invest-mbti/"><span className="ic" aria-hidden="true">🧭</span><div><b>{mbtiCode}</b><span className="n">내 투자 성향</span></div><i aria-hidden="true">→</i></a>}
          </div>
          <div className="mg">
            <nav className="sn" aria-label="마이페이지 메뉴">
              <a href="#r">내 결과</a><a href="#p">프로필</a><a href="#i">관심 설정</a><a href="#c">알림·약관</a><a href="#w">계정 관리</a>
              <form action={signOut}><button type="submit">로그아웃</button></form>
            </nav>
            <div>
              <section className="sec" id="r">
                <h2>내 결과 <small>최근 저장한 결과</small></h2>
                <p className="lead">계산기와 투자 성향 검사에서 저장한 결과를 다시 열어 볼 수 있어요.</p>
                {(recent ?? []).length === 0 ? (
                  <div className="empty">아직 저장한 결과가 없어요. 계산기에서 결과를 확인한 뒤 <b>내 결과 저장하기</b>를 눌러 보세요.<br />
                    <Link className="btn ghost" href="/calc/">금융계산기 가기</Link><Link className="btn ghost" href="/invest-mbti/">투자 성향 검사 가기</Link></div>
                ) : (
                  <div className="rl">
                    {(recent ?? []).map((r) => {
                      const tool = isSavedTool(r.tool) ? r.tool : null;
                      return (
                        <div className="ri" key={r.id}>
                          <div><span className="t">{tool ? SAVED_TOOLS[tool].label : r.tool}</span><b>{r.title}</b><small>{r.summary ? `${r.summary} · ` : ''}{day(r.created_at)}</small></div>
                          {tool && <a className="go" href={restoreUrl(tool, r.id)}>다시 열기</a>}
                        </div>
                      );
                    })}
                  </div>
                )}
                <Link className="more" href="/account/saved/">저장한 결과 모두 보기 →</Link>
              </section>
              <section className="sec" id="p">
                <h2>프로필</h2>
                <ProfileForm nickname={profile?.nickname ?? ''} displayName={profile?.display_name ?? ''} />
              </section>
              <section className="sec" id="i">
                <h2>관심 설정 <small>프로필 완성 {pct}%</small></h2>
                <p className="lead">관심 분야·직업군·경험 수준을 알려주시면 맞는 프롬프트를 먼저 보여드려요. 모두 선택 항목이에요.</p>
                <PreferencesForm
                  mode="account"
                  defaults={{ interests: prefRow?.interests ?? [], occupation: prefRow?.occupation ?? '', experience: prefRow?.experience ?? '' }}
                />
              </section>
              <section className="sec" id="c">
                <h2>알림·약관 동의 내역</h2>
                {rows.map((r) => (
                  <div className="cr" key={r.consent_documents?.type}>
                    <span>{r.consent_documents?.title} <small>({r.consent_documents?.version})</small></span>
                    <small>{r.agreed ? `동의 · ${fmt(r.created_at)}` : `미동의 · ${fmt(r.created_at)}`}</small>
                  </div>
                ))}
                <form action={setMarketing}>
                  <input type="hidden" name="agreed" value={marketing?.agreed ? 'false' : 'true'} />
                  <button className="btn ghost block" type="submit">{marketing?.agreed ? '마케팅 정보 수신 철회' : '마케팅 정보 수신 동의'}</button>
                </form>
              </section>
              <section className="sec dsec" id="w">
                <h2>회원 탈퇴</h2>
                <WithdrawForm />
              </section>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>내 계정</h1>
      <p className="lead">{user.email ?? "이메일 정보 없음"} · {ROLE[profile?.role ?? 'member']}</p>

      <div className="card narrow" style={{ margin: '0 0 20px' }}>
        <h2>내 결과</h2>
        <p className="lead">계산기와 투자 성향 검사에서 저장한 결과를 다시 열어 볼 수 있어요.</p>
        <Link className="btn ghost" href="/account/saved/">저장한 결과 보기</Link>
      </div>

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
