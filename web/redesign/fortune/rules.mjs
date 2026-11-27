// 재물 신호 규칙 — ⚠ '시안 샘플'. 고전 근거 기반 규칙표는 사용자 확정 전까지 sample:true.
// 근거(evidence)는 실제 계산값이고, 문장(text)만 샘플이다. 세 관점 점수화·다수결 결론은 내지 않는다.
export const RULES_VERSION = 'sample-0';
const WEALTH_STARS_Z = ['재백', '복덕', '전택'];
const stars = (p) => p.major.map((s) => s.n).join('·') || '주성 없음';

export function deriveSignals(c) {
  const s = c.saju, z = c.ziwei, w = c.western;
  const wealthTG = ['정재', '편재'];
  const cai = s.pillars.filter((p) => p.hidden.some((h) => wealthTG.includes(h.tg)) || wealthTG.includes(p.stemTG)).map((p) => p.label);
  // 재성이 놓인 위치를 종류별로 구분한다 (천간 / 지장간 본기 / 지장간 중기·여기). 개수가 많다고 유리하다는 뜻은 아니다.
  const caiDetail = []; s.pillars.forEach((p) => { if (wealthTG.includes(p.stemTG)) caiDetail.push(p.label + ' 천간 ' + p.stemTG); p.hidden.forEach((h) => { if (wealthTG.includes(h.tg)) caiDetail.push(p.label + ' 지장간 ' + (h.main ? '본기' : '중기·여기') + ' ' + h.s + '(' + h.tg + ')'); }); });
  const zw = z.palaces.filter((p) => WEALTH_STARS_Z.includes(p.name)).map((p) => ({ name: p.name, stars: stars(p), at: p.stem + p.branch }));
  const astro = [2, 5, 8, 10].map((n) => ({ house: n, sign: w.houseSign[n - 1] }));
  const wealthPlanets = ['jupiter', 'saturn', 'venus'].map((k) => w.bodies.find((b) => b.k === k)).map((b) => ({ n: b.ko, sign: b.sign, house: b.house }));
  const evidence = {
    saju: `${cai.length ? '재성이 ' + cai.join('·') + '에 있어요' : '재성(정재·편재)이 드러나지 않아요'} · 2027 세운 ${s.sewoon.gz}(${s.sewoon.tg})`,
    ziwei: zw.map((p) => `${p.name}궁 ${p.stars}`).join(' / '),
    western: astro.map((a) => `${a.house}하우스 ${a.sign}`).join(' · '),
  };
  return {
    sample: true, rulesVersion: RULES_VERSION,
    keySentence: '새해에는 들어오는 돈을 늘리는 일보다, 새는 구멍을 먼저 살피면 좋은 흐름이에요.',
    keywords: ['축적', '변화', '지출 점검'],
    topics: { earn: { label: '돈 벌기' }, save: { label: '돈 모으기' }, invest: { label: '투자 습관' } },
    evidence, parts: { cai, caiDetail, zw, astro, wealthPlanets },
  };
}

// ───── 결과 화면 문구 (⚠ 모두 '시안 샘플' — 규칙표 확정 전) ─────
export const THEME = { name: '내실을 다지는 해', sub: '확장보다 관리에 주목하는 재물운', keywords: ['자산 축적', '변화와 정비', '지출 점검'] };
export const SUMMARY4 = [
  { id: 'earn', label: '돈을 버는 운', title: '꾸준한 수입 기반', text: '새로운 수입원보다 기존 경제활동에 주목하는 흐름.' },
  { id: 'save', label: '돈을 모으는 운', title: '축적과 정비', text: '소비 습관과 자산관리 방식을 돌아보는 흐름.' },
  { id: 'grow', label: '돈을 불리는 운', title: '신중한 탐색', text: '새로운 가능성과 투자 습관을 살펴보는 흐름.' },
  { id: 'keep', label: '돈을 지키는 운', title: '균형과 관리', text: '공동 지출과 재정적 부담을 점검하는 흐름.' },
];
export const TOPICS4 = {
  earn: { label: '돈 벌기', saju: ['일의 기반을 다지는 흐름', '새 수입원보다 지금의 경제활동을 안정시키는 방향으로 읽어요.'], zw: ['일과 재물의 연결', '재물과 일에 관한 자리를 함께 보며 일에서 오는 수입의 결을 살펴요.'], as: ['수입을 만드는 자리', '수입을 뜻하는 2하우스와 일을 뜻하는 10하우스의 배치를 살펴봐요.'],
    same: '지금 하는 일의 <b>기반을 다지는 일</b>이 비슷하게 나와요.', diff: '사주는 <b>수입의 흐름</b>, 자미두수는 <b>일과 재물의 연결</b>, 점성술은 <b>수입과 일의 자리</b>에 주목해요.' },
  save: { label: '돈 모으기', saju: ['수입과 지출의 균형', '들어오는 돈과 나가는 돈이 함께 움직이는 해로 읽어요.'], zw: ['소비 성향의 점검', '돈을 쓰는 마음과 소비 습관을 돌아보는 관점이에요.'], as: ['모으는 방식의 점검', '저축과 자원을 쌓는 2하우스를 중심으로 모으는 방식을 살펴봐요.'],
    same: '새로 생기는 흐름보다 <b>지출 구조를 정리하는 일</b>이 비슷하게 나와요.', diff: '사주는 <b>재물의 흐름</b>, 자미두수는 <b>소비 성향</b>, 점성술은 <b>모으는 방식</b>에 주목해요.' },
  grow: { label: '돈 불리기', saju: ['서두르지 않는 흐름', '새로운 시도보다 흐름을 지켜보며 기준을 세우는 해로 읽어요.'], zw: ['마음의 흔들림 점검', '판단이 흔들리기 쉬운 자리에 별이 있어 기준을 먼저 적어 두면 좋아요.'], as: ['학습과 점검의 해', '큰 판단은 천천히, 공부와 점검 위주로 접근하기 좋은 배치예요.'],
    same: '<b>충동적인 판단을 줄이고 기준을 먼저 세우는 일</b>이 비슷하게 나와요.', diff: '자미두수는 <b>마음의 흔들림</b>, 점성술은 <b>학습과 점검</b>, 사주는 <b>흐름 지켜보기</b>에 주목해요.' },
  keep: { label: '돈 지키기', saju: ['나가는 돈의 관리', '들어오는 만큼 나가는 돈을 단속하는 흐름으로 읽어요.'], zw: ['쌓아 둔 것을 지키는 자리', '자산과 마음의 안정을 뜻하는 궁을 함께 살펴요.'], as: ['개인 자산과 공동 자산', '공동 지출과 대출 등 함께 묶인 돈을 살펴보는 관점이에요.'],
    same: '<b>나가는 돈과 묶인 돈을 점검하는 일</b>이 비슷하게 나와요.', diff: '사주는 <b>나가는 돈</b>, 자미두수는 <b>자산과 마음의 안정</b>, 점성술은 <b>공동 자산</b>에 주목해요.' },
};
export const EASY = {
  saju: '재물을 뜻하는 재성이 어디에 있는지, 새해의 세운이 나와 어떤 관계인지 살펴봤어요.',
  zw: '재물을 뜻하는 궁과 마음·자산을 뜻하는 궁을 함께 살펴봤어요.',
  as: '수입·공동 자산·일을 뜻하는 하우스와 관련 행성을 살펴봤어요.',
};
export const GLOSSARY = {
  saju: [['재성(정재·편재)', '재물을 뜻하는 기운이에요. 정재는 꾸준한 수입, 편재는 변동이 있는 수입의 결로 풀이해요.'], ['십성', '내 일간을 기준으로 다른 글자와의 관계를 열 가지로 나눈 이름이에요.'], ['지장간', '지지 속에 숨어 있는 천간이에요. 겉으로 드러나지 않은 기운으로 봐요.'], ['대운·세운', '대운은 10년 단위, 세운은 그해(2027 정미년)의 흐름이에요.']],
  zw: [['재백궁', '돈을 버는 방식과 재물의 자리예요.'], ['복덕궁', '돈을 쓰는 마음과 만족의 자리예요.'], ['전택궁', '집·부동산 등 자산이 쌓이는 자리예요.'], ['사화', '그해 특정 별에 붙는 네 가지 변화(록·권·과·기)예요.']],
  as: [['2하우스', '내가 버는 돈과 자원의 자리예요.'], ['5하우스', '창조성·즐거움·투기적 활동의 자리예요. 투자 전반을 이 하우스 하나로 판단하지는 않아요.'], ['8하우스', '공동 자산·대출 등 함께 묶인 돈의 자리예요.'], ['10하우스', '일과 사회적 역할의 자리예요.'], ['트랜짓', '지금 하늘의 행성이 내 출생차트를 지나는 위치예요. 이 서비스는 목성·토성의 2027년 이동(월별 위치·별자리/하우스 진입·순행/역행 전환)만 살펴봐요.']],
};

// ───── 4탭 결과·프롬프트용 상수 ─────
export const ZW_WEALTH = [['재백', '재물과 경제활동'], ['관록', '직업과 사회활동'], ['전택', '재산과 주거'], ['복덕', '가치관과 내적 만족']];
export const AS_WEALTH = [[2, '개인 자산과 수입'], [5, '창조성·즐거움·투기적 활동'], [8, '공동 자산과 재정'], [10, '직업과 사회적 활동']];
