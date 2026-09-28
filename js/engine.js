/* 오늘한상 — 추천 엔진
   상태 분석 → 목표 조정 → 가게 메뉴 안에서 최적 조합 탐색 → 섭취 기록 반영 */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const zero = () => Object.fromEntries(NK.map(k => [k, 0]));
const DEFAULT_PREF = 0.85;

// 한 끼(하루 주요 식사 = 하루 권장량의 40%) 영양 목표
function calcTargets(p) {
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.gender === 'M' ? 5 : -161);
  const act = (ACTIVITIES.find(a => a.id === p.activity) || ACTIVITIES[1]).factor;
  const goalAdj = { lose: -400, keep: 0, gain: 300, care: 0 }[p.goal] || 0;
  const daily = Math.round((bmr * act + goalAdj) / 10) * 10;
  const kcal = Math.round(daily * 0.4);
  const proteinRatio = p.goal === 'gain' || p.goal === 'lose' ? 0.3 : 0.22;
  const fatRatio = 0.25;
  return {
    daily,
    bmr: Math.round(bmr),
    kcal,
    protein: Math.round((kcal * proteinRatio) / 4),
    fat: Math.round((kcal * fatRatio) / 9),
    carb: Math.round((kcal * (1 - proteinRatio - fatRatio)) / 4),
    sodium: p.goal === 'care' ? 850 : 1000,
    fiber: 10,
  };
}

function bmiOf(p) {
  const bmi = p.weight / Math.pow(p.height / 100, 2);
  let label = '정상';
  if (bmi < 18.5) label = '저체중';
  else if (bmi >= 25) label = '비만';
  else if (bmi >= 23) label = '과체중';
  return { value: Math.round(bmi * 10) / 10, label };
}

function nutriOf(items, useRatio) {
  const t = zero();
  items.forEach(it => {
    const d = DISH[it.id];
    const r = useRatio ? (it.ratio ?? 1) : 1;
    NK.forEach(k => { t[k] += d[k] * it.portion * r; });
  });
  return t;
}

// 설문(식습관 고민)으로 만든 초기 상태 — 섭취 기록이 없을 때 사용
function priorStatus(p) {
  const r = Object.fromEntries(NK.map(k => [k, 1]));
  const c = p.concerns || [];
  if (c.includes('veg')) r.fiber = 0.7;
  if (c.includes('salty')) r.sodium = 1.35;
  if (c.includes('delivery')) { r.sodium = Math.max(r.sodium, 1.25); r.fiber = Math.min(r.fiber, 0.8); }
  if (c.includes('skip')) { r.protein = 0.8; r.kcal = 0.85; }
  if (c.includes('night')) r.kcal = Math.max(r.kcal, 1.15);
  return r;
}

// 최근 최대 3일 섭취 기록의 목표 대비 비율 평균
function recentStatus(state, day) {
  const days = Object.keys(state.logs).map(Number).filter(d => d < day).sort((a, b) => b - a).slice(0, 3);
  if (!days.length) return { ratio: priorStatus(state.profile), days: [], source: 'survey' };
  const ratio = zero();
  days.forEach(d => { NK.forEach(k => { ratio[k] += state.logs[d].ratio[k] / days.length; }); });
  return { ratio, days, source: 'log' };
}

function adjustTargets(base, r) {
  const kf = clamp(1 + (1 - r.kcal) * 0.5, 0.85, 1.15);
  return {
    ...base,
    kcal: base.kcal * kf,
    carb: base.carb * kf,
    fat: base.fat * kf,
    protein: base.protein * clamp(1 + (1 - r.protein) * 0.8, 0.95, 1.35),
    fiber: base.fiber * clamp(1 + (1 - r.fiber) * 0.8, 1, 1.4),
    sodium: base.sodium * clamp(1 - (r.sodium - 1) * 0.6, 0.7, 1.05),
  };
}

function combos(arr, k, start = 0, acc = [], out = []) {
  if (acc.length === k) { out.push(acc.slice()); return out; }
  for (let i = start; i < arr.length; i++) { acc.push(arr[i]); combos(arr, k, i + 1, acc, out); acc.pop(); }
  return out;
}

function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}

const sq = x => x * x;

function recommend(state, day) {
  const p = state.profile;
  const store = STORE[state.storeId];
  const base = calcTargets(p);
  const status = recentStatus(state, day);
  const tgt = adjustTargets(base, status.ratio);
  const prefs = state.prefs || {};
  const idsOf = d => (state.meals[d] ? state.meals[d].items.map(i => i.id) : []);
  const prevIds = idsOf(day - 1), prev2Ids = idsOf(day - 2);

  const allowed = id => !DISH[id].allergens.some(a => (p.allergies || []).includes(a));
  const pref = id => prefs[id]?.v ?? DEFAULT_PREF;
  const pick = (ids, min) => {
    let ok = ids.filter(allowed);
    if (!ok.length) ok = ids.slice();
    const liked = ok.filter(id => pref(id) >= 0.45);
    return { list: liked.length >= min ? liked : ok, dropped: liked.length >= min ? ok.filter(id => pref(id) < 0.45) : [] };
  };
  const mains = pick(store.menu.main, 1);
  const soups = pick(store.menu.soup, 1);
  const sides = pick(store.menu.side, 4);
  const sideSets = combos(sides.list, 3).concat(combos(sides.list, 4));
  if (!sideSets.length) sideSets.push(sides.list.slice());

  const dishPenalty = id =>
    Math.max(0, 0.9 - pref(id)) * 0.5 +
    (prevIds.includes(id) ? (DISH[id].type === 'main' ? 0.5 : 0.1) : 0) +
    (prev2Ids.includes(id) ? (DISH[id].type === 'main' ? 0.2 : 0.04) : 0) +
    hash01(day + id) * 0.04;

  let best = null;
  for (const m of mains.list) {
    for (const s of soups.list) {
      for (const set of sideSets) {
        const fixed = [m, s, ...set];
        const fixedN = zero();
        let pen = 0;
        fixed.forEach(id => { NK.forEach(k => { fixedN[k] += DISH[id][k]; }); pen += dishPenalty(id); });
        for (const rp of RICE_PORTIONS) {
          const t = {};
          NK.forEach(k => { t[k] = fixedN[k] + DISH.rice[k] * rp.v; });
          const score =
            1.0 * sq((t.kcal - tgt.kcal) / tgt.kcal) +
            0.4 * sq((t.carb - tgt.carb) / tgt.carb) +
            0.4 * sq((t.fat - tgt.fat) / tgt.fat) +
            (t.protein < tgt.protein ? 2.0 : 0.3) * sq((t.protein - tgt.protein) / tgt.protein) +
            1.6 * sq(Math.max(0, t.sodium - tgt.sodium) / tgt.sodium) +
            1.2 * sq(Math.max(0, tgt.fiber - t.fiber) / tgt.fiber) +
            pen;
          if (!best || score < best.score) best = { score, main: m, soup: s, sides: set, rice: rp.v };
        }
      }
    }
  }

  const items = [
    { id: 'rice', portion: best.rice },
    { id: best.main, portion: 1 },
    { id: best.soup, portion: 1 },
    ...best.sides.map(id => ({ id, portion: 1 })),
  ];
  const meal = {
    day, storeId: store.id, items,
    target: tgt, baseTarget: base,
    status, total: nutriOf(items),
  };
  meal.reasons = buildReasons(meal, [...mains.dropped, ...soups.dropped, ...sides.dropped], p);
  return meal;
}

function josa(word, pair) {
  const [a, b] = pair.split('/');
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return b;
  return code % 28 ? a : b;
}

function riceLabel(v) {
  return (RICE_PORTIONS.find(r => r.v === v) || RICE_PORTIONS[2]).label;
}

function buildReasons(meal, dropped, p) {
  const r = meal.status.ratio;
  const pct = x => Math.round(x * 100);
  const byType = t => meal.items.filter(i => DISH[i.id].type === t).map(i => DISH[i.id]);
  const main = byType('main')[0];
  const soup = byType('soup')[0];
  const sides = byType('side');
  const rice = meal.items.find(i => i.id === 'rice');
  const src = meal.status.source === 'log' ? '최근 식사에서' : '식습관 분석 결과';
  const out = [];

  if (r.protein < 0.9) {
    out.push({ type: 'protein', emoji: '💪', title: '단백질 채우기',
      text: `${src} 단백질이 목표의 ${pct(r.protein)}%였어요. 단백질이 풍부한 ${main.name}${josa(main.name, '을/를')} 골랐어요.` });
  }
  if (r.sodium > 1.1) {
    out.push({ type: 'sodium', emoji: '🧂', title: '나트륨 줄이기',
      text: `${src} 나트륨이 목표보다 ${pct(r.sodium) - 100}% 많았어요. 국은 ${soup.name}, 반찬은 싱거운 메뉴 위주로 담았어요.` });
  }
  if (r.fiber < 0.9) {
    const veg = sides.filter(s => s.tags.includes('채소')).map(s => s.name);
    out.push({ type: 'fiber', emoji: '🥬', title: '식이섬유 채우기',
      text: `${src} 식이섬유가 목표의 ${pct(r.fiber)}%였어요. ${veg.length ? veg.join(', ') + josa(veg[veg.length - 1], '을/를') + ' 넣었어요.' : '채소 반찬을 늘렸어요.'}` });
  }
  if (r.kcal > 1.1 && rice.portion < 1) {
    out.push({ type: 'kcal_down', emoji: '🍚', title: '밥 양 줄이기',
      text: `칼로리가 목표의 ${pct(r.kcal)}%로 넘쳤어요. 밥을 ${riceLabel(rice.portion)}로 줄였어요.` });
  } else if (r.kcal < 0.9 && rice.portion >= 1) {
    out.push({ type: 'kcal_up', emoji: '🍚', title: '든든하게 먹기',
      text: `칼로리가 목표의 ${pct(r.kcal)}%로 부족했어요. 밥을 ${riceLabel(rice.portion)}로 맞췄어요.` });
  }
  if (dropped.length) {
    const names = dropped.map(id => DISH[id].name).slice(0, 2).join(', ');
    out.push({ type: 'dislike', emoji: '🙅', title: '남긴 반찬은 빼기',
      text: `${names}${josa(names, '은/는')} 자주 남기셔서 이번 추천에서 뺐어요.` });
  }
  if (!out.length) {
    const g = GOALS.find(g => g.id === p.goal);
    out.push({ type: 'balance', emoji: '✅', title: '지금처럼 균형 있게',
      text: `최근 식사가 목표에 잘 맞았어요. ‘${g.label}’ 목표에 맞춰 지금 구성을 유지할게요.` });
  }
  return out;
}

const HEADLINES = {
  protein: '단백질을 채우는 한상',
  sodium: '싱겁고 건강한 한상',
  fiber: '채소 가득한 한상',
  kcal_down: '가볍게 먹는 한상',
  kcal_up: '든든하게 먹는 한상',
  dislike: '입맛에 맞춘 한상',
  balance: '균형 잡힌 한상',
};

// 섭취 기록: ratios = { dishId: 0~1 }
function recordIntake(state, day, ratios) {
  const meal = state.meals[day];
  const eaten = meal.items.map(i => ({ ...i, ratio: ratios[i.id] ?? 1 }));
  const intake = nutriOf(eaten, true);
  const ratio = {};
  NK.forEach(k => { ratio[k] = intake[k] / meal.baseTarget[k]; });
  const rate = intake.kcal / meal.total.kcal;
  state.logs[day] = { ratios: { ...ratios }, intake, ratio, rate };

  state.prefs = state.prefs || {};
  meal.items.forEach(i => {
    if (i.id === 'rice') return;
    const prev = state.prefs[i.id] || { v: DEFAULT_PREF, n: 0 };
    const r = ratios[i.id] ?? 1;
    state.prefs[i.id] = { v: prev.n ? prev.v * 0.6 + r * 0.4 : r * 0.7 + DEFAULT_PREF * 0.3, n: prev.n + 1 };
  });

  if (state.sub && state.sub.remaining > 0) state.sub.remaining -= 1;
  state.meals[day + 1] = recommend(state, day + 1);
}

function statusOf(key, r) {
  if (key === 'sodium') return r > 1.1 ? 'over' : 'ok';
  if (r < 0.9) return 'low';
  if (r > 1.15 && key !== 'fiber' && key !== 'protein') return 'over';
  return 'ok';
}
const STATUS_LABEL = { low: '부족', ok: '적정', over: '과다' };

// 결정적 난수 (시연 데이터용)
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 지난 6일 이용 기록 생성 (시연용) — 식습관 고민에 따라 먹는 패턴이 달라짐
function seedHistory(state, days = 6) {
  const rnd = mulberry32(42);
  const c = state.profile.concerns || [];
  for (let d = 0; d < days; d++) {
    state.meals[d] = recommend(state, d);
    const ratios = {};
    state.meals[d].items.forEach(i => {
      const dd = DISH[i.id];
      let r;
      if (dd.type === 'main') r = rnd() < 0.8 ? 1 : 0.75;
      else if (dd.type === 'rice') r = [0.75, 1, 1][Math.floor(rnd() * 3)];
      else if (dd.type === 'soup') r = c.includes('salty') ? 1 : [0.5, 0.75, 1][Math.floor(rnd() * 3)];
      else if (i.id === 'd_anchovy' || i.id === 'd_bellflower') r = 0.25;
      else if (dd.tags.includes('채소') && c.includes('veg')) r = [0.25, 0.5, 0.75][Math.floor(rnd() * 3)];
      else r = [0.75, 1, 1][Math.floor(rnd() * 3)];
      ratios[i.id] = r;
    });
    const remaining = state.sub?.remaining;
    recordIntake(state, d, ratios);
    if (state.sub) state.sub.remaining = remaining;
  }
  state.day = days;
  if (!state.meals[days]) state.meals[days] = recommend(state, days);
}
