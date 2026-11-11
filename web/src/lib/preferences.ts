export const INTERESTS = [
  { id: 'stock', label: '주식투자' },
  { id: 'realestate', label: '부동산' },
  { id: 'tax', label: '절세' },
  { id: 'routine', label: '재테크 루틴' },
  { id: 'saving', label: '지출·저축' },
  { id: 'ai', label: 'AI 활용' },
] as const;

export const OCCUPATIONS = [
  { id: 'fc', label: 'FC/보험설계사' },
  { id: 'realtor', label: '공인중개사' },
  { id: 'selfemployed', label: '자영업자' },
  { id: 'employee', label: '회사원' },
  { id: 'homemaker', label: '주부' },
  { id: 'other', label: '기타' },
] as const;

export const EXPERIENCES = [
  { id: 'beginner', label: '입문' },
  { id: 'intermediate', label: '실전' },
  { id: 'advanced', label: '심화' },
] as const;

export type Preferences = {
  interests: string[] | null;
  occupation: string | null;
  experience: string | null;
  completed_at: string | null;
  skipped_at: string | null;
};

/** 프로필 완성도(%): 관심 분야·직업군·경험 수준 중 채운 항목 수 */
export function progressOf(p: { interests?: string[] | null; occupation?: string | null; experience?: string | null } | null): number {
  if (!p) return 0;
  const n = (p.interests && p.interests.length ? 1 : 0) + (p.occupation ? 1 : 0) + (p.experience ? 1 : 0);
  return Math.round((n / 3) * 100);
}
