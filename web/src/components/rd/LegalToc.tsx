'use client';

import { useEffect, useState } from 'react';

/** 약관·방침 목차: 지금 읽는 조항을 강조한다. (PC 는 왼쪽 고정, 모바일은 접이식) */
export default function LegalToc({ items, other }: { items: { id: string; title: string }[]; other: { href: string; label: string } }) {
  const [active, setActive] = useState(items[0]?.id ?? '');
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const seen = new Map<string, number>();
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => seen.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : Infinity));
      const vis = [...seen.entries()].filter(([, t]) => t !== Infinity).sort((a, b) => a[1] - b[1]);
      if (vis[0]) setActive(vis[0][0]);
    }, { rootMargin: '-10% 0px -70% 0px' });
    items.forEach((i) => { const el = document.getElementById(i.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [items]);
  return (
    <>
      <nav className="toc" aria-label="목차">
        <small>목차</small>
        {items.map((i) => <a key={i.id} href={`#${i.id}`} className={i.id === active ? 'on' : undefined}>{i.title}</a>)}
        <div className="oth"><a href={other.href}>{other.label} →</a></div>
      </nav>
      <details className="tocm">
        <summary>목차 보기 ▾</summary>
        {items.map((i) => <a key={i.id} href={`#${i.id}`}>{i.title}</a>)}
        <a href={other.href}>{other.label} →</a>
      </details>
    </>
  );
}
