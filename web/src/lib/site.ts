// 정식 도메인과 검색 노출 대상 주소. 계산기·수수료 페이지는 안정화 후 noindex 를 풀 때 여기에 추가한다. (docs/domain-cutover-plan.md)
export const SITE_URL = 'https://donbuff.com';
export const SITE_HOST = 'donbuff.com';

export const INDEXABLE_PATHS = [
  '/', '/prompt/', '/invest-mbti/', '/new/', '/privacy.html', '/terms/', '/privacy/',
];

// 검색에 나오지 않아야 하는 회원·시스템 화면
export const PRIVATE_PATHS = [
  '/account/', '/api/', '/auth/', '/onboarding/', '/welcome/', '/join/', '/login/', '/signup/', '/forgot-password/', '/reset-password/',
];
