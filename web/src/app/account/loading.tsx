import { rdEnabled } from '@/lib/redesign';

/** 마이페이지 이동 직후 보여 주는 자리표시 화면. 새 디자인에서는 실제 화면과 같은 모양의 뼈대를 보여 준다. */
export default function AccountLoading() {
  if (!rdEnabled('/account/')) {
    return (
      <div className="ld" role="status" aria-live="polite">
        <span className="ld-spin" aria-hidden="true" />
        <span>불러오는 중이에요…</span>
      </div>
    );
  }
  return (
    <div role="status" aria-live="polite" aria-label="불러오는 중">
      <section className="mh">
        <div className="wrap">
          <div className="prof">
            <div className="av sk" aria-hidden="true" />
            <div style={{ display: 'grid', gap: 10 }}><span className="sk sk-l" style={{ width: 160, height: 34 }} /><span className="sk sk-l" style={{ width: 220 }} /></div>
          </div>
        </div>
      </section>
      <div className="wrap pg">
        <div className="tiles two"><div className="tl sk-box"><span className="sk" style={{ width: 54, height: 54, borderRadius: 18 }} /><span className="sk sk-l" style={{ width: 90, height: 28 }} /></div><div className="tl sk-box"><span className="sk" style={{ width: 54, height: 54, borderRadius: 18 }} /><span className="sk sk-l" style={{ width: 120, height: 28 }} /></div></div>
        <div className="mg"><div className="sn" aria-hidden="true" /><div>
          <section className="sec"><span className="sk sk-l" style={{ width: 120, height: 26 }} /><div className="rl"><span className="sk sk-row" /><span className="sk sk-row" /><span className="sk sk-row" /></div></section>
          <section className="sec"><span className="sk sk-l" style={{ width: 90, height: 26 }} /><span className="sk sk-row" style={{ marginTop: 16 }} /></section>
        </div></div>
      </div>
      <p className="ld-sr">불러오는 중이에요…</p>
    </div>
  );
}
