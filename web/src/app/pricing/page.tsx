import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/env';

export const metadata: Metadata = { title: '요금제' };

type Plan = { id: string; code: string; name: string; audience: string; price_krw: number; interval: string };

export default async function PricingPage() {
  let plans: Plan[] = [];
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.from('plans').select('id, code, name, audience, price_krw, interval').order('price_krw');
    plans = (data as Plan[] | null) ?? [];
  }

  return (
    <>
      <h1>요금제</h1>
      <p className="lead">돈버프의 유료 서비스는 준비 중이에요. 결제 기능이 열리면 이곳에서 안내해 드릴게요.</p>
      {plans.length === 0 ? (
        <div className="grid">
          <div className="card"><span className="tag">현재</span><h2>무료 회원</h2><p className="small">금융계산기, 프롬프트 라이브러리, 투자 성향 테스트를 이용할 수 있어요.</p></div>
          <div className="card"><span className="tag">준비 중</span><h2>사업자 구독</h2><p className="small">FC·공인중개사 등 업무 효율화 도구를 월 구독 형태로 준비하고 있어요.</p></div>
        </div>
      ) : (
        <div className="grid">
          {plans.map((p) => (
            <div className="card" key={p.id}>
              <h2>{p.name}</h2>
              <p style={{ fontSize: 22, fontWeight: 800, margin: '4px 0' }}>{p.price_krw.toLocaleString('ko-KR')}원 <span className="small">/ {p.interval === 'year' ? '년' : '월'}</span></p>
              <button className="btn block" type="button" disabled>결제 준비 중</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
