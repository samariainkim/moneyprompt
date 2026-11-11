import type { Metadata } from 'next';
import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { SAVED_MAX, SAVED_TOOLS, isSavedTool, restoreUrl } from '@/lib/saved';
import { deleteSaved } from './actions';

export const metadata: Metadata = { title: '내 결과', robots: { index: false } };

type Row = { id: string; tool: string; title: string; summary: string; created_at: string };

const fmt = (s: string) => new Date(s).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' });

export default async function SavedPage() {
  const { supabase } = await requireMember('/account/saved/');
  const { data, error } = await supabase
    .from('saved_results')
    .select('id, tool, title, summary, created_at')
    .order('created_at', { ascending: false })
    .limit(SAVED_MAX)
    .returns<Row[]>();
  const rows = data ?? [];

  return (
    <>
      <h1>내 결과</h1>
      <p className="lead">계산기와 투자 성향 검사에서 저장한 결과예요. 누르면 입력했던 값 그대로 다시 열어 볼 수 있어요. ({rows.length}/{SAVED_MAX})</p>
      {error && <p className="msg err" role="alert">목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>}
      {!error && rows.length === 0 && (
        <div className="card narrow" style={{ margin: 0 }}>
          <h2>아직 저장한 결과가 없어요</h2>
          <p className="lead">계산기에서 결과를 확인한 뒤 <b>내 결과에 저장</b>을 눌러 보세요.</p>
          <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link className="btn ghost" href="/calc/">금융계산기 가기</Link>
            <Link className="btn ghost" href="/invest-mbti/">투자 성향 검사 가기</Link>
          </p>
        </div>
      )}
      <ul className="saved-list">
        {rows.map((r) => {
          const tool = isSavedTool(r.tool) ? r.tool : null;
          return (
            <li className="saved-item" key={r.id}>
              <div className="saved-main">
                <span className="saved-tool">{tool ? SAVED_TOOLS[tool].label : r.tool}</span>
                <b className="saved-title">{r.title}</b>
                {r.summary && <span className="saved-sum">{r.summary}</span>}
                <span className="small">{fmt(r.created_at)}</span>
              </div>
              <div className="saved-actions">
                {tool && <a className="btn" href={restoreUrl(tool, r.id)}>다시 열기</a>}
                <form action={deleteSaved}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="btn ghost" type="submit" aria-label={`${r.title} 삭제`}>삭제</button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
      <p style={{ marginTop: 20 }}><Link href="/account/">← 내 계정</Link></p>
    </>
  );
}
