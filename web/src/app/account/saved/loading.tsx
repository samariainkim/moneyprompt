import { rdEnabled } from '@/lib/redesign';

export default function SavedLoading() {
  if (!rdEnabled('/account/saved/')) {
    return (
      <div className="ld" role="status" aria-live="polite">
        <span className="ld-spin" aria-hidden="true" />
        <span>불러오는 중이에요…</span>
      </div>
    );
  }
  return (
    <div role="status" aria-live="polite" aria-label="불러오는 중">
      <section className="svh"><div className="sv"><div className="kicker">MY RESULTS</div><h1>내 결과</h1><span className="sk sk-l" style={{ width: 260, marginTop: 10 }} /></div></section>
      <div className="sv" style={{ paddingTop: 30, paddingBottom: 80 }}>
        <div className="crd"><span className="sk" style={{ width: 54, height: 54, borderRadius: 18 }} /><div style={{ display: 'grid', gap: 8, flex: 1 }}><span className="sk sk-l" style={{ width: '40%' }} /><span className="sk sk-l" style={{ width: '70%', height: 20 }} /></div></div>
        <div className="crd"><span className="sk" style={{ width: 54, height: 54, borderRadius: 18 }} /><div style={{ display: 'grid', gap: 8, flex: 1 }}><span className="sk sk-l" style={{ width: '35%' }} /><span className="sk sk-l" style={{ width: '60%', height: 20 }} /></div></div>
        <div className="crd"><span className="sk" style={{ width: 54, height: 54, borderRadius: 18 }} /><div style={{ display: 'grid', gap: 8, flex: 1 }}><span className="sk sk-l" style={{ width: '45%' }} /><span className="sk sk-l" style={{ width: '55%', height: 20 }} /></div></div>
      </div>
    </div>
  );
}
