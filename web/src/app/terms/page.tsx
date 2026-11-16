import type { Metadata } from 'next';
import { rdEnabled } from '@/lib/redesign';
import { TERMS } from '@/lib/legal/terms';
import { LegalDoc, LegalDocPlain } from '@/components/rd/LegalDoc';

export const metadata: Metadata = { title: TERMS.title };

export default function TermsPage() {
  if (rdEnabled('/terms/')) return <LegalDoc doc={TERMS} other={{ href: '/privacy/', label: '개인정보처리방침' }} />;
  return <LegalDocPlain doc={TERMS} />;
}
