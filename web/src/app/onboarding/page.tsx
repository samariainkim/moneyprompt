import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import OnboardingForm from '@/components/OnboardingForm';
import { createClient } from '@/lib/supabase/server';
import { currentConsentDocs } from '@/lib/consents';
import { safeNext } from '@/lib/auth';
import { rdEnabled } from '@/lib/redesign';
import { RdAuthCard } from '@/components/rd/RdChrome';


export const metadata: Metadata = { title: '약관 동의' };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login/');
  const { data: needs } = await supabase.rpc('needs_consent');
  if (needs !== true) redirect(next);

  const docs = await currentConsentDocs(supabase);
  if (rdEnabled('/onboarding/')) {
    return (
      <RdAuthCard kicker="CONSENT" title="약관 동의" lead="서비스를 이용하려면 아래 약관에 동의해 주세요. 선택 항목은 동의하지 않아도 이용할 수 있어요.">
        <OnboardingForm docs={docs} next={next} />
      </RdAuthCard>
    );
  }
  return (
    <div className="card narrow">
      <h1>약관 동의</h1>
      <p className="lead">서비스를 이용하려면 아래 약관에 동의해 주세요. 선택 항목은 동의하지 않아도 이용할 수 있어요.</p>
      <OnboardingForm docs={docs} next={next} />
    </div>
  );
}
