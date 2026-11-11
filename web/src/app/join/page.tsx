import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import JoinCta from '@/components/JoinCta';
import { safeNext } from '@/lib/auth';
import { cleanSource, continueUrl, stripDbx } from '@/lib/gate';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/env';

export const metadata: Metadata = { title: '로그인하고 더 많은 기능을 이용하세요', robots: { index: false } };

const BENEFITS = [
  { icon: '📊', title: '내 계산 및 분석 결과를 언제든 다시 확인 가능', desc: '분석결과를 내 페이지에서 언제든 다시 열어 확인가능해요.' },
  { icon: '🤖', title: '나만의 AI 분석 맞춤 프롬프트 제공', desc: '나만을 위한 분석 프롬프트를 생성하고 얻을 수 있어요.' },
  { icon: '⭐', title: '즐겨쓰는 프롬프트 보관함 제공', desc: '언제든, 어느 기기에서든 자주 쓰는 프롬프트를 꺼내 쓸 수 있어요.' },
  { icon: '✨', title: '계속 늘어나는 최신 서비스 소식을 받아보세요.', desc: '돈버프는 새로운 기능을 계속 실험중이에요. 최신 소식을 빠르게 받아보세요.' },
];

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ next?: string; src?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const src = cleanSource(sp.src);

  // 이미 로그인한 회원이 오면 안내할 필요가 없으니 하려던 곳으로 보낸다.
  if (supabaseConfigured()) {
    const { data } = await (await createClient()).auth.getUser();
    if (data.user) redirect(continueUrl(next, src));
  }

  const keepMessage = src === 'fav'
    ? '방금 누른 즐겨찾기는 로그인 후 자동으로 추가돼요'
    : src?.startsWith('save_')
      ? '방금 본 결과는 로그인 후 내 결과에 자동으로 저장돼요'
      : '방금 입력한 내용은 로그인 후에도 그대로 이어져요';

  return (
    <div className="join">
      <section className="join-info">
        <h1>로그인을 하시면<br /><b>더 많은 기능</b>을<br />이용하실 수 있습니다</h1>
        <p className="join-lead">회원가입을 하시면 돈버프만의 다양한 서비스와 최신 업데이트 소식을 가장 빠르게 받아보실 수 있어요.</p>
        <ul className="join-list">
          {BENEFITS.map((b) => (
            <li key={b.title}>
              <span className="join-ic" aria-hidden="true">{b.icon}</span>
              <div><b>{b.title}</b><p>{b.desc}</p></div>
            </li>
          ))}
        </ul>
      </section>
      <JoinCta next={next} src={src} back={stripDbx(next)} keepMessage={keepMessage} />
    </div>
  );
}
