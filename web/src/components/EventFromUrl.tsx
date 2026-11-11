'use client';

import { useEffect } from 'react';

type Gtag = (command: string, name: string, params?: Record<string, string>) => void;

/** /auth/continue/ 가 가입 직후 첫 방문에 붙여 주는 ?dbx_evt=…&dbx_src=…&dbx_m=… 를 GA4 로 한 번만 보내고 주소에서 지운다. */
export default function EventFromUrl() {
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const evt = q.get('dbx_evt');
    if (!evt) return;
    const params = { source: q.get('dbx_src') ?? 'direct', method: q.get('dbx_m') ?? 'email' };
    ['dbx_evt', 'dbx_src', 'dbx_m'].forEach((k) => q.delete(k));
    const rest = q.toString();
    window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash);

    let tries = 0;
    const timer = window.setInterval(() => {
      const gtag = (window as unknown as { gtag?: Gtag }).gtag;
      if (gtag) { gtag('event', evt, params); window.clearInterval(timer); }
      else if (++tries >= 20) window.clearInterval(timer);
    }, 200);
    return () => window.clearInterval(timer);
  }, []);
  return null;
}
