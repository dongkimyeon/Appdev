/* 오늘한상 — 정적 데이터 (메뉴, 반찬가게, 요금제, 온보딩 옵션) */

const NUTRIENTS = [
  { key: 'kcal', label: '칼로리', unit: 'kcal' },
  { key: 'carb', label: '탄수화물', unit: 'g' },
  { key: 'protein', label: '단백질', unit: 'g' },
  { key: 'fat', label: '지방', unit: 'g' },
  { key: 'sodium', label: '나트륨', unit: 'mg' },
  { key: 'fiber', label: '식이섬유', unit: 'g' },
];
const NK = NUTRIENTS.map(n => n.key);

// [kcal, 탄수화물, 단백질, 지방, 나트륨, 식이섬유] — 1인분 기준 근사치 (나트륨은 제휴 가게 저염 레시피 기준 70%)
function dish(id, type, name, emoji, n, allergens = [], tags = []) {
  const [kcal, carb, protein, fat, sodium, fiber] = n;
  return { id, type, name, emoji, kcal, carb, protein, fat, sodium: Math.round(sodium * 0.7 / 10) * 10, fiber, allergens, tags };
}

const DISH_LIST = [
  dish('rice', 'rice', '잡곡밥', '🍚', [300, 65, 7, 2, 5, 3.5]),

  dish('m_chicken', 'main', '닭가슴살 간장불고기', '🍗', [260, 12, 33, 8, 610, 1], ['대두'], ['고단백']),
  dish('m_mackerel', 'main', '고등어구이', '🐟', [300, 0, 24, 22, 470, 0], ['생선'], ['오메가3']),
  dish('m_pork', 'main', '제육볶음', '🥓', [390, 16, 24, 25, 830, 1.5], ['대두'], []),
  dish('m_tofu', 'main', '두부조림', '🥘', [190, 8, 15, 11, 520, 2], ['대두'], ['식물성 단백질']),
  dish('m_beef', 'main', '소고기 장조림', '🥩', [230, 7, 28, 9, 880, 0], ['대두'], ['고단백']),
  dish('m_salmon', 'main', '연어 스테이크', '🍣', [330, 4, 29, 21, 360, 0.5], ['생선'], ['오메가3', '저염']),
  dish('m_squid', 'main', '오징어볶음', '🦑', [250, 18, 26, 6, 790, 2], ['연체류'], ['고단백']),
  dish('m_duck', 'main', '오리 단호박찜', '🦆', [350, 22, 22, 19, 420, 3], [], ['저염']),

  dish('s_seaweed', 'soup', '미역국', '🥣', [70, 4, 4, 3.5, 690, 1.5]),
  dish('s_doenjang', 'soup', '된장찌개', '🍲', [110, 8, 8, 5, 940, 2.5], ['대두']),
  dish('s_beefradish', 'soup', '소고기뭇국', '🥣', [120, 5, 12, 6, 760, 1]),
  dish('s_bean', 'soup', '저염 콩나물국', '🥣', [40, 4, 3, 1, 380, 1.5], ['대두'], ['저염']),
  dish('s_egg', 'soup', '달걀국', '🥣', [80, 3, 6, 5, 520, 0.5], ['달걀']),
  dish('s_mushroom', 'soup', '버섯 들깨탕', '🍲', [130, 9, 6, 8, 540, 3], [], ['저염']),

  dish('d_spinach', 'side', '시금치나물', '🥬', [45, 4, 3, 2.5, 210, 2.5], [], ['채소']),
  dish('d_eggroll', 'side', '계란말이', '🍳', [150, 2, 10, 11, 290, 0], ['달걀', '우유'], ['단백질']),
  dish('d_anchovy', 'side', '멸치볶음', '🐟', [110, 9, 10, 4, 430, 0], ['생선', '견과'], ['칼슘']),
  dish('d_bellflower', 'side', '도라지무침', '🌿', [60, 11, 1, 1, 300, 2.8], [], ['채소']),
  dish('d_broccoli', 'side', '브로콜리 두부무침', '🥦', [80, 5, 7, 4, 180, 3.2], ['대두'], ['채소', '단백질']),
  dish('d_squidstrip', 'side', '진미채볶음', '🦑', [140, 18, 9, 3, 520, 0], ['연체류', '밀'], []),
  dish('d_kimchi', 'side', '배추김치', '🌶️', [15, 3, 1, 0, 340, 1.2], [], ['채소']),
  dish('d_zucchini', 'side', '애호박볶음', '🥒', [50, 5, 2, 3, 220, 1.5], [], ['채소']),
  dish('d_mushroom', 'side', '버섯볶음', '🍄', [55, 6, 3, 2.5, 240, 2.5], [], ['채소']),
  dish('d_burdock', 'side', '우엉조림', '🥢', [90, 18, 2, 1.5, 380, 3], ['대두'], ['채소']),
  dish('d_sprout', 'side', '콩나물무침', '🌱', [40, 3, 3, 2, 190, 2], ['대두'], ['채소']),
  dish('d_potato', 'side', '감자조림', '🥔', [110, 20, 2, 2.5, 330, 1.8], ['대두'], []),
  dish('d_japchae', 'side', '잡채', '🍝', [160, 24, 4, 6, 360, 1.5], ['대두', '밀'], []),
  dish('d_radish', 'side', '무생채', '🥗', [35, 6, 1, 0.5, 280, 1.6], [], ['채소']),
];
const DISH = Object.fromEntries(DISH_LIST.map(d => [d.id, d]));

const TYPE_LABEL = { rice: '밥', main: '메인', soup: '국', side: '반찬' };

const RICE_PORTIONS = [
  { v: 0.5, label: '반 공기' },
  { v: 0.7, label: '2/3 공기' },
  { v: 1, label: '한 공기' },
  { v: 1.3, label: '넉넉한 한 공기' },
];

const STORES = [
  {
    id: 's1', name: '망원 엄마손반찬', emoji: '👵', color: '#FFF1E6',
    dist: 0.4, rating: 4.9, reviews: 321, since: 2009, cookAt: '06:30',
    tags: ['당일조리', '15년 손맛'],
    desc: '망원시장 입구에서 15년째 매일 아침 반찬을 만들어요. 집밥 같은 슴슴한 맛이 특징이에요.',
    menu: {
      main: ['m_chicken', 'm_mackerel', 'm_pork', 'm_tofu', 'm_beef'],
      soup: ['s_seaweed', 's_doenjang', 's_beefradish', 's_bean'],
      side: ['d_spinach', 'd_eggroll', 'd_anchovy', 'd_bellflower', 'd_broccoli', 'd_kimchi', 'd_zucchini', 'd_potato', 'd_radish'],
    },
  },
  {
    id: 's2', name: '연남 소담찬방', emoji: '🍱', color: '#EAF6FF',
    dist: 0.9, rating: 4.8, reviews: 208, since: 2016, cookAt: '07:00',
    tags: ['당일조리', '저염 레시피'],
    desc: '유기농 채소와 저염 레시피로 가볍고 건강한 반찬을 만들어요.',
    menu: {
      main: ['m_salmon', 'm_chicken', 'm_tofu', 'm_duck', 'm_squid'],
      soup: ['s_bean', 's_mushroom', 's_egg', 's_seaweed'],
      side: ['d_broccoli', 'd_mushroom', 'd_burdock', 'd_sprout', 'd_spinach', 'd_eggroll', 'd_japchae', 'd_radish'],
    },
  },
  {
    id: 's3', name: '합정 건강한부엌', emoji: '🥗', color: '#EDFAF1',
    dist: 1.3, rating: 4.7, reviews: 156, since: 2019, cookAt: '07:00',
    tags: ['당일조리', '고단백 특화'],
    desc: '운동하는 1인 가구를 위해 단백질을 넉넉히 담은 반찬을 만들어요.',
    menu: {
      main: ['m_beef', 'm_chicken', 'm_salmon', 'm_squid', 'm_pork'],
      soup: ['s_beefradish', 's_egg', 's_mushroom', 's_doenjang'],
      side: ['d_eggroll', 'd_broccoli', 'd_squidstrip', 'd_anchovy', 'd_mushroom', 'd_zucchini', 'd_sprout', 'd_kimchi'],
    },
  },
];
const STORE = Object.fromEntries(STORES.map(s => [s.id, s]));

const PLANS = [
  {
    id: 'basic', name: 'Basic', price: 4900, meals: 0, perWeek: 0,
    summary: '식단 관리만 받을게요',
    features: ['영양 상태 분석', '개인 맞춤 식단 추천', '식사 기록 및 영양 리포트'],
  },
  {
    id: 'meal', name: 'Meal', price: 199000, meals: 20, perWeek: 5, badge: '가장 인기',
    summary: '주 5회 × 4주 = 20식',
    features: ['Basic 기능 전체', '개인 맞춤 식사 배송', '식사 데이터 자동 반영'],
  },
  {
    id: 'premium', name: 'Premium', price: 249000, meals: 28, perWeek: 7,
    summary: '주 7회 × 4주 = 28식',
    features: ['Meal 기능 전체', '정밀 영양 분석', '식단 지속 관리', '개인별 영양 리포트'],
  },
];
const PLAN = Object.fromEntries(PLANS.map(p => [p.id, p]));

const SINGLE_PACKS = [
  { count: 1, price: 10000 },
  { count: 10, price: 100000 },
  { count: 20, price: 200000 },
  { count: 30, price: 300000 },
];

const ACTIVITIES = [
  { id: 'low', label: '거의 앉아서 지내요', sub: '운동을 거의 안 해요', factor: 1.2 },
  { id: 'light', label: '가볍게 움직여요', sub: '주 1~2회 운동', factor: 1.375 },
  { id: 'mid', label: '꾸준히 운동해요', sub: '주 3~4회 운동', factor: 1.55 },
  { id: 'high', label: '매일 운동해요', sub: '주 5회 이상 운동', factor: 1.725 },
];

const GOALS = [
  { id: 'lose', label: '체중 감량', emoji: '🔥', sub: '칼로리는 줄이고 포만감은 유지' },
  { id: 'keep', label: '건강 유지', emoji: '🌿', sub: '균형 잡힌 영양 섭취' },
  { id: 'gain', label: '근육 증가', emoji: '💪', sub: '단백질을 충분히' },
  { id: 'care', label: '혈압·혈당 관리', emoji: '🩺', sub: '나트륨과 당을 낮게' },
];

const CONCERNS = [
  { id: 'skip', label: '끼니를 자주 걸러요', emoji: '⏰' },
  { id: 'delivery', label: '배달·편의점 음식이 많아요', emoji: '🛵' },
  { id: 'veg', label: '채소를 잘 안 먹어요', emoji: '🥦' },
  { id: 'salty', label: '짜게 먹는 편이에요', emoji: '🧂' },
  { id: 'night', label: '야식을 자주 먹어요', emoji: '🌙' },
];

const ALLERGENS = ['달걀', '우유', '대두', '밀', '생선', '연체류', '견과', '갑각류'];

const DEMO_PROFILE = {
  name: '이지민', gender: 'F', age: 27, height: 163, weight: 58,
  activity: 'light', goal: 'keep', allergies: [], concerns: ['delivery', 'veg'],
  address: '서울 마포구 망원동',
};
