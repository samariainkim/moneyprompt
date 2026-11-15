import type { Block, LegalDocData } from '@/lib/legal/types';
import LegalToc from './LegalToc';

/** 대괄호([ ])로 적힌 '운영자가 확정할 항목'은 눈에 띄게 표시한다. */
function Txt({ x, hl }: { x: string; hl?: boolean }) {
  if (!hl) return <>{x}</>;
  return <>{x.split(/(\[[^\]]+\])/).map((part, i) => (/^\[[^\]]+\]$/.test(part) ? <mark className="ph" key={i}>{part}</mark> : part))}</>;
}

function Blocks({ blocks, hl }: { blocks: Block[]; hl?: boolean }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.t === 'p') return <p key={i}><Txt x={b.x} hl={hl} /></p>;
        if (b.t === 'h3') return <h3 key={i}>{b.x}</h3>;
        if (b.t === 'h4') return <h4 key={i}>{b.x}</h4>;
        if (b.t === 'ol') return <ol key={i} className="lg-ol">{b.items.map((x, j) => <li key={j}><Txt x={x} hl={hl} /></li>)}</ol>;
        if (b.t === 'table') {
          return (
            <div className="lg-tbw" key={i}>
              <table className="lg-tb">
                <thead><tr>{b.head.map((h, j) => <th key={j}>{h}</th>)}</tr></thead>
                <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          );
        }
        return <ul key={i} className="lg-ul">{b.items.map((x, j) => <li key={j}><Txt x={x} hl={hl} /></li>)}</ul>;
      })}
    </>
  );
}

/** 새 디자인의 약관·방침 화면: 제목·시행일 + 목차 + 조항 카드 */
export function LegalDoc({ doc, other }: { doc: LegalDocData; other: { href: string; label: string } }) {
  return (
    <>
      <section className="lh">
        <div className="wrap">
          <h1>{doc.title}</h1>
          <div className="meta"><span>시행일 <b>{doc.effective}</b></span></div>
        </div>
      </section>
      <div className="wrap">
        <div className="lgd">
          <LegalToc items={doc.sections.map((s) => ({ id: s.id, title: s.title }))} other={other} />
          <div className="lbody">
            {doc.intro && <section className="ls intro"><Blocks blocks={doc.intro} hl={doc.highlightBrackets} /></section>}
            {doc.sections.map((s) => (
              <section className="ls" id={s.id} key={s.id}>
                <h2>{s.title}</h2>
                <Blocks blocks={s.blocks} hl={doc.highlightBrackets} />
              </section>
            ))}
            <div className="ct">
              <span>문서에 대해 궁금한 점이 있으신가요? samariain.kim@gmail.com</span>
              <a className="b" href={other.href}>{other.label} 보기</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** 기존 디자인(운영 화면)에서도 같은 본문을 보여 준다. */
export function LegalDocPlain({ doc }: { doc: LegalDocData }) {
  return (
    <div className="card legal">
      <h1>{doc.title}</h1>
      <p className="small">시행일: {doc.effective}</p>
      {doc.intro && <Blocks blocks={doc.intro} />}
      {doc.sections.map((s) => (
        <section key={s.id}>
          <h2>{s.title}</h2>
          <Blocks blocks={s.blocks} />
        </section>
      ))}
    </div>
  );
}
