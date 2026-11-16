import type { Metadata } from 'next';
import { rdEnabled } from '@/lib/redesign';
import { PRIVACY } from '@/lib/legal/privacy';
import { LegalDoc, LegalDocPlain } from '@/components/rd/LegalDoc';

export const metadata: Metadata = { title: PRIVACY.title };

export default function PrivacyPage() {
  if (rdEnabled('/privacy/')) return <LegalDoc doc={PRIVACY} other={{ href: '/terms/', label: '이용약관' }} />;
  return <LegalDocPlain doc={PRIVACY} />;
}
