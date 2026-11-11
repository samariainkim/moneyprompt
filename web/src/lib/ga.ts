type Gtag = (command: string, name: string, params?: Record<string, string>) => void;

/** GA4 이벤트 전송. gtag 가 아직 준비되지 않았으면 최대 4초까지 기다린다. */
export function track(name: string, params: Record<string, string> = {}) {
  if (typeof window === 'undefined') return;
  const send = () => {
    const g = (window as unknown as { gtag?: Gtag }).gtag;
    if (!g) return false;
    g('event', name, params);
    return true;
  };
  if (send()) return;
  let tries = 0;
  const timer = window.setInterval(() => { if (send() || ++tries >= 20) window.clearInterval(timer); }, 200);
}
