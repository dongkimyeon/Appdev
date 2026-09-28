/* 오늘한상 — 화면 렌더링 & 상호작용 */

const STORAGE_KEY = 'ohansang_v1';
const $app = document.getElementById('app');

/* ───────── State ───────── */
function freshState() {
  return { profile: null, storeId: 's1', sub: null, meals: {}, logs: {}, prefs: {}, day: 0, startDate: null };
}
let state = load() || freshState();
const ui = {
  tab: 'home',
  stack: [],          // push 된 페이지: { name, params }
  ob: { step: 0, data: blankOb() },
  anim: 'fade-enter',
  record: {},         // 기록 중인 반찬별 비율
  planPick: 'meal',
  packPick: 10,
  timers: [],
};
function blankOb() {
  return { name: '', gender: '', age: '', height: '', weight: '', activity: '', goal: '', allergies: [], concerns: [], address: '서울 마포구 망원동' };
}
function load() {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* 저장 불가 환경 */ }
}

/* ───────── Helpers ───────── */
const won = n => n.toLocaleString('ko-KR') + '원';
const r0 = n => Math.round(n);
const WD = ['일', '월', '화', '수', '목', '금', '토'];
function dateOf(day) {
  const d = new Date(state.startDate || Date.now());
  d.setDate(d.getDate() + day);
  return d;
}
const fmtDate = d => `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`;
const dishesOf = meal => meal.items.map(i => ({ ...DISH[i.id], portion: i.portion }));
const portionLabel = (d) => d.type === 'rice' ? riceLabel(d.portion) : TYPE_LABEL[d.type];
const todayMeal = () => state.meals[state.day];
const todayLog = () => state.logs[state.day];
const hasDelivery = () => state.sub && state.sub.plan !== 'basic';

const ICON = {
  back: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  close: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  chev: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  down: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  bell: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a2 2 0 003.4 0"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.3 2.6a1 1 0 011.4 0l8.6 8.2c.6.6.2 1.7-.7 1.7H19V20a1.5 1.5 0 01-1.5 1.5H15v-6h-6v6H6.5A1.5 1.5 0 015 20v-7.5H3.4c-.9 0-1.3-1.1-.7-1.7l8.6-8.2z"/></svg>',
  meal: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 11.5h20a10 10 0 01-7 9.5v.5a1 1 0 01-1 1h-4a1 1 0 01-1-1V21a10 10 0 01-7-9.5z"/><path d="M8 3c0 1.3-1 1.7-1 3s1 1.7 1 3M12 2c0 1.5-1 2-1 3.5s1 2 1 3.5M16 3c0 1.3-1 1.7-1 3s1 1.7 1 3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  report: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="12" width="4.5" height="9" rx="1.5"/><rect x="9.75" y="7" width="4.5" height="14" rx="1.5"/><rect x="16.5" y="3" width="4.5" height="18" rx="1.5"/></svg>',
  store: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.2 3h15.6l1.9 5.3a3 3 0 01-5.2 2.4 3 3 0 01-5 0 3 3 0 01-5 0A3 3 0 012.3 8.3L4.2 3z"/><path d="M4 12.6a4.6 4.6 0 003.5-.4 4.6 4.6 0 004.5 0 4.6 4.6 0 004.5 0 4.6 4.6 0 003.5.4V20a1 1 0 01-1 1h-4v-5h-5v5H5a1 1 0 01-1-1v-7.4z"/></svg>',
  my: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="7.5" r="4.5"/><path d="M3.5 20.5c0-4.4 3.8-7.5 8.5-7.5s8.5 3.1 8.5 7.5c0 .6-.4 1-1 1h-15c-.6 0-1-.4-1-1z"/></svg>',
};

/* ───────── Presentation panel step ───────── */
function setFlow(steps) {
  document.querySelectorAll('#flow li').forEach(li => {
    li.classList.toggle('active', steps.includes(Number(li.dataset.step)));
  });
}

/* ───────── Render root ───────── */
function render() {
  ui.timers.forEach(clearTimeout); ui.timers = [];
  let html, flow = [];
  if (!state.profile) {
    ({ html, flow } = renderOnboarding());
  } else if (ui.stack.length) {
    const top = ui.stack[ui.stack.length - 1];
    ({ html, flow } = PAGES[top.name](top.params || {}));
  } else {
    ({ html, flow } = TABS[ui.tab]());
    html = `<div class="view ${ui.anim}">${html}${tabbar()}</div>`;
  }
  $app.innerHTML = html;
  setFlow(flow);
  ui.anim = 'fade-enter';
  if (afterRender) { const f = afterRender; afterRender = null; f(); }
}
let afterRender = null;

function push(name, params) { ui.stack.push({ name, params }); ui.anim = 'page-enter'; render(); }
function pop() { ui.stack.pop(); ui.anim = 'page-back'; render(); }
function withAnim(html, anim, white = false) {
  return `<div class="view ${white ? 'white' : ''} ${anim || ui.anim}">${html}</div>`;
}
function appbar(title = '', right = '', act = 'back') {
  return `<div class="pad-top"></div><div class="appbar"><button class="icon-btn" data-act="${act}">${ICON.back}</button><div class="appbar-title">${title}</div>${right}</div>`;
}

function tabbar() {
  const tabs = [['home', '홈', ICON.home], ['meal', '식단', ICON.meal], ['report', '리포트', ICON.report], ['store', '반찬가게', ICON.store], ['my', '마이', ICON.my]];
  return `<nav class="tabbar">${tabs.map(([id, label, ic]) =>
    `<button class="tab ${ui.tab === id ? 'on' : ''}" data-act="tab" data-id="${id}">${ic}<span>${label}</span></button>`).join('')}</nav>`;
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  $app.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

function openSheet(inner) {
  closeSheet(true);
  const dim = document.createElement('div'); dim.className = 'dim'; dim.dataset.act = 'close-sheet';
  const sh = document.createElement('div'); sh.className = 'sheet'; sh.innerHTML = inner;
  $app.append(dim, sh);
}
function closeSheet(instant) {
  const dim = $app.querySelector('.dim'), sh = $app.querySelector('.sheet');
  if (!sh) return;
  if (instant) { dim.remove(); sh.remove(); return; }
  dim.classList.add('out'); sh.classList.add('out');
  setTimeout(() => { dim.remove(); sh.remove(); }, 240);
}

/* ───────── Onboarding ───────── */
const OB_STEPS = ['intro', 'name', 'body', 'size', 'activity', 'goal', 'concerns', 'allergy', 'analyzing', 'result', 'plan'];

function obValid(step, d) {
  switch (step) {
    case 'name': return d.name.trim().length > 0;
    case 'body': return d.gender && d.age >= 10 && d.age <= 100;
    case 'size': return d.height >= 120 && d.height <= 220 && d.weight >= 30 && d.weight <= 200;
    case 'activity': return !!d.activity;
    case 'goal': return !!d.goal;
    default: return true;
  }
}

function renderOnboarding() {
  const step = OB_STEPS[ui.ob.step];
  const d = ui.ob.data;
  const total = 7;
  const idx = ui.ob.step; // 1..7 = 질문 단계
  const progress = idx >= 1 && idx <= total ? `<div class="ob-progress"><div style="width:${(idx / total) * 100}%"></div></div>` : '';
  const top = `<div class="pad-top"></div><div class="appbar"><button class="icon-btn" data-act="ob-back">${ICON.back}</button></div>${progress}`;
  const cta = (label = '다음', extra = '') =>
    `<div class="cta-bar">${extra}<button class="btn btn-primary" id="ob-next" data-act="ob-next" ${obValid(step, d) ? '' : 'disabled'}>${label}</button></div>`;
  const opt = (field, o, multi) => {
    const on = multi ? d[field].includes(o.id) : d[field] === o.id;
    return `<button class="opt ${on ? 'on' : ''}" data-act="ob-pick" data-field="${field}" data-val="${o.id}" data-multi="${multi ? 1 : ''}">
      ${o.emoji ? `<span class="opt-emoji">${o.emoji}</span>` : ''}
      <span class="opt-text"><b>${o.label}</b>${o.sub ? `<small>${o.sub}</small>` : ''}</span>
      <span class="opt-check">${ICON.check}</span></button>`;
  };

  let body = '', flow = [0];
  switch (step) {
    case 'intro':
      return {
        flow: [],
        html: withAnim(`<div class="pad-top"></div>
        <div class="splash">
          <div class="brand-mark splash-mark">한</div>
          <div class="big-title mt-24">나에게 필요한 식사를,<br/><span class="hl">필요한 만큼</span></div>
          <p class="ob-desc">오늘한상은 1인 가구의 영양 상태를 분석해<br/>동네 반찬가게의 당일 한상을 맞춰 보내드려요.</p>
          <div class="splash-points">
            <div class="sp"><div class="sp-ic" style="background:#e8f8ef">🎯</div><div><b>내 몸에 맞춘 식단</b><small>먹은 만큼 기록하면 다음 식사가 바뀌어요</small></div></div>
            <div class="sp"><div class="sp-ic" style="background:#fff3e6">🏘️</div><div><b>우리 동네 반찬가게</b><small>검증된 동네 가게가 직접 만들어요</small></div></div>
            <div class="sp"><div class="sp-ic" style="background:#ffeeee">🔥</div><div><b>오늘 만들어 오늘 도착</b><small>냉장·냉동이 아닌 따뜻한 한상</small></div></div>
          </div>
        </div>
        <div class="cta-bar"><button class="btn btn-primary" data-act="ob-next">시작하기</button>
        <button class="text-btn" data-act="demo">데모 계정으로 둘러보기</button></div>`, null, true),
      };
    case 'name':
      body = `<div class="big-title">반가워요!<br/>이름을 알려주세요</div>
        <div class="field"><div class="input-wrap"><input data-field="name" value="${d.name}" placeholder="이름" maxlength="10" autofocus/></div></div>`;
      break;
    case 'body':
      body = `<div class="big-title">${d.name}님의<br/>성별과 나이를 알려주세요</div>
        <p class="ob-desc">기초대사량을 계산하는 데 사용해요</p>
        <div class="field"><div class="field-label">성별</div><div class="seg">
          <button class="${d.gender === 'F' ? 'on' : ''}" data-act="ob-set" data-field="gender" data-val="F">여성</button>
          <button class="${d.gender === 'M' ? 'on' : ''}" data-act="ob-set" data-field="gender" data-val="M">남성</button></div></div>
        <div class="field"><div class="field-label">나이</div><div class="input-wrap"><input data-field="age" type="number" inputmode="numeric" value="${d.age}" placeholder="0"/><span class="unit">세</span></div></div>`;
      break;
    case 'size':
      body = `<div class="big-title">키와 몸무게를<br/>알려주세요</div>
        <p class="ob-desc">한 끼에 필요한 칼로리와 영양소를 계산해요</p>
        <div class="field-row">
          <div class="field"><div class="field-label">키</div><div class="input-wrap"><input data-field="height" type="number" inputmode="decimal" value="${d.height}" placeholder="0"/><span class="unit">cm</span></div></div>
          <div class="field"><div class="field-label">몸무게</div><div class="input-wrap"><input data-field="weight" type="number" inputmode="decimal" value="${d.weight}" placeholder="0"/><span class="unit">kg</span></div></div>
        </div>`;
      break;
    case 'activity':
      body = `<div class="big-title">평소 활동량은<br/>어느 정도인가요?</div>
        <div class="opt-list">${ACTIVITIES.map(o => opt('activity', o)).join('')}</div>`;
      break;
    case 'goal':
      body = `<div class="big-title">식사로 이루고 싶은<br/>목표를 골라주세요</div>
        <div class="opt-list">${GOALS.map(o => opt('goal', o)).join('')}</div>`;
      break;
    case 'concerns':
      body = `<div class="big-title">요즘 식생활에서<br/>해당하는 걸 모두 골라주세요</div>
        <p class="ob-desc">현재 영양 상태를 분석하는 데 사용해요</p>
        <div class="opt-list">${CONCERNS.map(o => opt('concerns', o, true)).join('')}</div>`;
      break;
    case 'allergy':
      body = `<div class="big-title">못 드시는 음식이<br/>있나요?</div>
        <p class="ob-desc">알레르기 성분이 들어간 메뉴는 추천하지 않아요</p>
        <div class="chips mt-24">${ALLERGENS.map(a => `<button class="chip ${d.allergies.includes(a) ? 'on' : ''}" data-act="ob-pick" data-field="allergies" data-val="${a}" data-multi="1">${a}</button>`).join('')}</div>`;
      return { flow, html: withAnim(`${top}<div class="scroll"><div class="ob-body">${body}</div></div>${cta(d.allergies.length ? '다음' : '없어요')}`, null, true) };
    case 'analyzing':
      afterRender = runAnalyzing;
      return {
        flow: [1],
        html: withAnim(`<div class="pad-top"></div><div class="analyzing">
          <div class="spinner-ring"><svg width="88" height="88" viewBox="0 0 88 88"><circle cx="44" cy="44" r="38" fill="none" stroke="#e8f8ef" stroke-width="8"/><circle cx="44" cy="44" r="38" fill="none" stroke="#16b46c" stroke-width="8" stroke-linecap="round" stroke-dasharray="60 240"/></svg><span>🥗</span></div>
          <div class="mid-title">${d.name}님의 영양 상태를<br/>분석하고 있어요</div>
          <div class="an-steps">
            <div class="an-step"><span class="dot">${ICON.check}</span>기초대사량 계산</div>
            <div class="an-step"><span class="dot">${ICON.check}</span>식습관 위험 요소 분석</div>
            <div class="an-step"><span class="dot">${ICON.check}</span>한 끼 영양 목표 설정</div>
            <div class="an-step"><span class="dot">${ICON.check}</span>동네 반찬가게 메뉴 매칭</div>
          </div></div>`, null, true),
      };
    case 'result':
      return renderObResult();
    case 'plan':
      return PAGES.plans({ onboarding: true });
  }
  return { flow, html: withAnim(`${top}<div class="scroll"><div class="ob-body">${body}</div></div>${cta()}`, null, true) };
}

function obProfile() {
  const d = ui.ob.data;
  return { ...d, name: d.name.trim(), age: +d.age, height: +d.height, weight: +d.weight };
}

function runAnalyzing() {
  const steps = $app.querySelectorAll('.an-step');
  steps.forEach((s, i) => ui.timers.push(setTimeout(() => s.classList.add('done'), 500 + i * 550)));
  ui.timers.push(setTimeout(() => { ui.ob.step++; ui.anim = 'fade-enter'; render(); }, 500 + steps.length * 550 + 300));
}

function renderObResult() {
  const p = obProfile();
  const t = calcTargets(p);
  const bmi = bmiOf(p);
  const pr = priorStatus(p);
  const risks = [];
  if (pr.fiber < 0.9) risks.push({ e: '🥬', t: '식이섬유 부족', s: '채소 반찬을 매 끼니 2가지 이상 넣을게요', c: 'orange' });
  if (pr.sodium > 1.1) risks.push({ e: '🧂', t: '나트륨 과다', s: '저염 국과 싱거운 반찬 위주로 구성할게요', c: 'red' });
  if (pr.protein < 0.9) risks.push({ e: '💪', t: '단백질 부족', s: '단백질이 풍부한 메인 메뉴를 우선할게요', c: 'orange' });
  if (pr.kcal < 0.9) risks.push({ e: '⏰', t: '불규칙한 식사', s: '거르지 않도록 든든한 한 끼를 챙길게요', c: 'orange' });
  if (pr.kcal > 1.1) risks.push({ e: '🌙', t: '칼로리 과잉', s: '밥 양을 조절해 가볍게 맞춰드릴게요', c: 'red' });
  if (!risks.length) risks.push({ e: '✅', t: '큰 위험 요소 없음', s: '지금의 좋은 식습관을 유지하도록 도울게요', c: 'green' });
  const macro = (label, v, color) => `<div class="kpi"><small>${label}</small><b style="color:${color}">${v}g</b></div>`;
  return {
    flow: [1],
    html: withAnim(`<div class="pad-top"></div><div class="scroll">
      <div class="ob-body" style="padding-bottom:8px">
        <span class="badge green">분석 완료</span>
        <div class="big-title mt-12">${p.name}님의 한 끼 목표는<br/><span class="hl">${t.kcal.toLocaleString()}kcal</span>예요</div>
        <p class="ob-desc">하루 권장 ${t.daily.toLocaleString()}kcal 중 오늘한상이 40%를 책임질게요</p>
      </div>
      <div class="card" style="margin-top:12px;background:var(--line-2)">
        <div class="between"><span class="muted small">BMI</span><span><b>${bmi.value}</b> <span class="badge ${bmi.label === '정상' ? 'green' : 'orange'}">${bmi.label}</span></span></div>
        <div class="between mt-12"><span class="muted small">기초대사량</span><b>${t.bmr.toLocaleString()} kcal</b></div>
        <div class="between mt-12"><span class="muted small">목표</span><b>${GOALS.find(g => g.id === p.goal).label}</b></div>
        <div class="kpis">${macro('탄수화물', t.carb, '#3182f6')}${macro('단백질', t.protein, '#16b46c')}${macro('지방', t.fat, '#ff8a1f')}</div>
      </div>
      <div style="padding:12px 24px 0"><div class="card-title">주의가 필요한 영양소</div></div>
      <div style="padding:4px 24px 20px">${risks.map(r => `<div class="reason"><div class="reason-ic">${r.e}</div><div><b>${r.t} <span class="badge ${r.c}">${r.c === 'green' ? '양호' : '주의'}</span></b><p>${r.s}</p></div></div>`).join('')}</div>
    </div>
    <div class="cta-bar"><button class="btn btn-primary" data-act="ob-next">요금제 고르기</button></div>`, null, true),
  };
}

function finishOnboarding(profile, planId, pack) {
  state = freshState();
  state.profile = profile;
  state.storeId = 's1';
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 6);
  state.startDate = start.getTime();
  const plan = pack ? { plan: 'single', name: `단품 ${pack}식`, remaining: pack, total: pack } :
    { plan: planId, name: PLAN[planId].name, remaining: PLAN[planId].meals, total: PLAN[planId].meals };
  state.sub = plan;
  seedHistory(state, 6);
  state.sub.remaining = Math.max(0, plan.remaining - (plan.total ? 6 : 0));
  save();
  ui.ob = { step: 0, data: blankOb() };
  ui.tab = 'home'; ui.stack = [];
  render();
  toast(`${profile.name}님, 오늘한상에 오신 걸 환영해요`);
}

/* ───────── Common pieces ───────── */
function plateGrid(meal, compareMeal) {
  const prev = compareMeal ? compareMeal.items.map(i => i.id) : null;
  return `<div class="plate">${dishesOf(meal).map(d => `
    <div class="plate-item">${prev && !prev.includes(d.id) ? '<span class="new">NEW</span>' : ''}
      <div class="e">${d.emoji}</div><div class="n">${d.name}</div><div class="t">${portionLabel(d)}</div></div>`).join('')}</div>`;
}

function reasonsHtml(reasons, limit) {
  return reasons.slice(0, limit || reasons.length).map(r =>
    `<div class="reason"><div class="reason-ic">${r.emoji}</div><div><b>${r.title}</b><p>${r.text}</p></div></div>`).join('');
}

function ringSvg(pct, color = '#16b46c', size = 108, stroke = 11) {
  const rr = (size - stroke) / 2, c = 2 * Math.PI * rr;
  const p = Math.max(0, Math.min(1, pct));
  return `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${rr}" fill="none" stroke="#f2f4f6" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${rr}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c * p} ${c}"/></svg>`;
}

function ntRows(values, targets, keys = NK) {
  return keys.map(k => {
    const n = NUTRIENTS.find(x => x.key === k);
    const r = values[k] / targets[k];
    const st = statusOf(k, r);
    const cls = st === 'ok' ? 'fill-ok' : st === 'low' ? 'fill-low' : 'fill-over';
    const bc = st === 'ok' ? 'green' : st === 'low' ? 'orange' : 'red';
    const w = Math.min(r / 1.5, 1) * 100;
    return `<div class="nt-row"><div class="nt-head"><span class="l">${n.label} <span class="badge ${bc}">${STATUS_LABEL[st]}</span></span>
      <span class="r"><b style="color:var(--text-2)">${r0(values[k]).toLocaleString()}</b> / ${r0(targets[k]).toLocaleString()}${n.unit} · ${r0(r * 100)}%</span></div>
      <div class="nt-track"><div class="nt-fill ${cls}" style="width:${w}%"></div><div class="nt-100" style="left:${100 / 1.5}%"></div></div></div>`;
  }).join('');
}

function deliveryStage() {
  if (todayLog()) return 4;
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  if (h < 7) return 0;
  if (h < 11) return 1;
  if (h < 12) return 2;
  return 3;
}

/* ───────── Tabs ───────── */
const TABS = {
  home() {
    const p = state.profile, meal = todayMeal(), log = todayLog(), store = STORE[meal.storeId];
    const main = meal.reasons[0];
    const stage = deliveryStage();
    const steps = ['주문 확정', '조리 중', '배달 중', '도착'];
    const stepHtml = steps.map((s, i) => {
      const cls = i < stage || stage === 4 ? 'done' : i === stage ? 'now' : '';
      return `<div class="ds ${cls}"><i>${cls ? ICON.check : ''}</i>${s}</div>`;
    }).join('');
    const stageText = ['오늘 아침 조리를 준비하고 있어요', `${store.cookAt}부터 조리하고 있어요`, '따뜻하게 배달 중이에요', '도착했어요! 맛있게 드세요', '맛있게 드셨나요?'][stage];
    const total = meal.total;
    const t = meal.baseTarget;
    const intake = log ? log.intake : null;
    const kcalNow = intake ? intake.kcal : total.kcal;
    const eatenPct = log ? Math.round(log.rate * 100) : null;

    const days = [];
    for (let d = state.day - 6; d <= state.day; d++) days.push(d);
    const week = days.map(d => {
      const lg = state.logs[d];
      const dt = dateOf(d);
      const isToday = d === state.day;
      let cls = '', txt = dt.getDate();
      if (lg) { const r = lg.ratio.kcal; cls = r >= 0.85 && r <= 1.15 ? 'good' : 'mid'; txt = Math.round(r * 100); }
      if (isToday && !lg) cls = 'today';
      return `<div class="wd"><div class="wd-dot ${cls}">${txt}</div>${isToday ? '오늘' : WD[dt.getDay()]}</div>`;
    }).join('');

    const deliveryCard = hasDelivery() ? `
      <div class="card pressable" data-act="open-store" data-id="${store.id}">
        <div class="store-line"><div class="store-av" style="background:${store.color}">${store.emoji}</div>
          <div style="flex:1"><div class="card-title" style="font-size:16px">${stageText}</div>
          <div class="card-sub" style="margin-top:0">${store.name} · 12:00 도착 예정</div></div>${ICON.chev}</div>
        <div class="delivery-steps">${stepHtml}</div>
      </div>` : `
      <div class="card"><div class="store-line"><div class="store-av" style="background:var(--blue-soft)">📋</div>
        <div style="flex:1"><div class="card-title" style="font-size:16px">Basic 요금제 이용 중</div>
        <div class="card-sub" style="margin-top:0">추천 식단대로 ${store.name}에서 1식 10,000원에 주문할 수 있어요</div></div></div>
        <button class="btn btn-soft btn-sm mt-16" data-act="go-plans" style="width:100%">배송 요금제 알아보기</button></div>`;

    return {
      flow: log ? [3, 4] : [2],
      html: `<div class="pad-top"></div><div class="scroll">
        <div class="header"><div class="logo"><div class="brand-mark">한</div>오늘한상</div>
          <button class="icon-btn" data-act="toast" data-msg="새로운 알림이 없어요">${ICON.bell}</button></div>
        <div class="greet">
          <div class="date">${fmtDate(dateOf(state.day))}</div>
          <div class="big-title">${p.name}님을 위한 오늘은<br/><span class="hl">${HEADLINES[main.type]}</span>이에요</div>
        </div>
        ${deliveryCard}
        <div class="card">
          <div class="between"><div class="card-title">오늘의 한상</div>
            <button class="link" data-act="open-meal" data-day="${state.day}">자세히 ${ICON.chev}</button></div>
          ${plateGrid(meal)}
          <div class="ring-wrap mt-20">
            <div class="ring">${ringSvg(kcalNow / t.kcal)}<div class="ring-center"><b>${r0(kcalNow)}</b><small>/ ${t.kcal} kcal</small></div></div>
            <div class="macro-bars" style="flex:1">${['carb', 'protein', 'fat'].map(k => {
              const v = (intake || total)[k], r = v / t[k];
              return `<div><div class="between small"><span style="color:var(--text-3);font-weight:600">${NUTRIENTS.find(n => n.key === k).label}</span><span class="muted"><b style="color:var(--text-2)">${r0(v)}</b>/${t[k]}g</span></div>
                <div class="mb-track mt-4"><div class="mb-fill" style="width:${Math.min(r, 1) * 100}%;background:${r < 0.9 ? 'var(--orange)' : 'var(--primary)'}"></div></div></div>`;
            }).join('')}</div>
          </div>
          ${log ? `<div class="done-banner"><span style="font-size:24px">✅</span><div style="flex:1"><b>기록 완료 · ${eatenPct}% 섭취</b><div class="small muted">내일 식사에 벌써 반영했어요</div></div></div>
            <button class="btn btn-gray mt-12" data-act="open-analysis" data-day="${state.day}">분석 결과와 내일 식단 보기</button>`
          : `<button class="btn btn-primary mt-20" data-act="open-record">먹은 만큼 기록하기</button>`}
        </div>
        <div class="card"><div class="card-title">왜 이렇게 차렸을까요?</div><div class="mt-8">${reasonsHtml(meal.reasons, 3)}</div></div>
        <div class="card pressable" data-act="tab" data-id="report">
          <div class="between"><div class="card-title">이번 주 섭취율</div><span class="link">리포트 ${ICON.chev}</span></div>
          <div class="week">${week}</div>
        </div>
        <div style="height:12px"></div>
      </div>`,
    };
  },

  meal() {
    const days = [state.day + 1, state.day, state.day - 1, state.day - 2, state.day - 3].filter(d => state.meals[d]);
    const card = d => {
      const m = state.meals[d], lg = state.logs[d], st = STORE[m.storeId];
      const label = d === state.day ? '<span class="badge dark">오늘</span>' : d > state.day ? '<span class="badge blue">내일 · 조정됨</span>' :
        `<span class="badge ${lg && lg.rate >= 0.85 ? 'green' : 'orange'}">${lg ? Math.round(lg.rate * 100) + '% 섭취' : '기록 없음'}</span>`;
      return `<div class="card pressable" data-act="open-meal" data-day="${d}">
        <div class="between"><div><div class="small muted" style="font-weight:600">${fmtDate(dateOf(d))}</div>
          <div class="card-title mt-4">${HEADLINES[m.reasons[0].type]}</div></div>${label}</div>
        <div class="hero-emojis" style="font-size:28px;margin:12px 0 0">${dishesOf(m).map(x => x.emoji).join('')}</div>
        <div class="card-sub">${dishesOf(m).filter(x => x.type !== 'rice').map(x => x.name).join(' · ')}</div>
        <div class="between mt-12 small"><span class="muted">${st.name}</span><b>${r0(m.total.kcal)} kcal</b></div></div>`;
    };
    const hasNext = !!state.meals[state.day + 1];
    return {
      flow: [2, 5],
      html: `<div class="pad-top"></div><div class="scroll">
        <div class="greet" style="padding-top:20px"><div class="big-title">식단</div>
          <p class="ob-desc" style="margin-top:4px">기록할수록 내 몸에 맞게 바뀌어요</p></div>
        ${hasNext ? '' : `<div class="card" style="background:var(--blue-soft)"><div class="row gap-12"><span style="font-size:24px">🔮</span><div class="small" style="color:var(--blue);font-weight:600;line-height:1.5">오늘 식사를 기록하면 내일 식단이 자동으로 만들어져요</div></div></div>`}
        ${days.map(card).join('')}<div style="height:12px"></div></div>`,
    };
  },

  report() {
    const logged = Object.keys(state.logs).map(Number).sort((a, b) => a - b).slice(-7);
    if (!logged.length) {
      return { flow: [4], html: `<div class="pad-top"></div><div class="scroll"><div class="greet" style="padding-top:20px"><div class="big-title">리포트</div></div>
        <div class="card"><div class="card-title">아직 기록이 없어요</div><div class="card-sub">식사를 기록하면 영양 리포트를 만들어드려요</div></div></div>` };
    }
    const base = calcTargets(state.profile);
    const avg = zero(), avgR = zero();
    logged.forEach(d => NK.forEach(k => { avg[k] += state.logs[d].intake[k] / logged.length; avgR[k] += state.logs[d].ratio[k] / logged.length; }));
    const avgRate = logged.reduce((s, d) => s + state.logs[d].rate, 0) / logged.length;
    const good = logged.filter(d => { const r = state.logs[d].ratio.kcal; return r >= 0.85 && r <= 1.15; }).length;

    const maxK = Math.max(base.kcal * 1.3, ...logged.map(d => state.logs[d].intake.kcal));
    const bars = logged.map(d => {
      const k = state.logs[d].intake.kcal, r = k / base.kcal;
      const col = r < 0.85 ? 'var(--orange)' : r > 1.15 ? 'var(--red)' : 'var(--primary)';
      return `<div class="bar-col ${d === state.day ? 'today' : ''}"><div class="bar" style="height:${(k / maxK) * 100}%;background:${col}"></div><small>${d === state.day ? '오늘' : WD[dateOf(d).getDay()]}</small></div>`;
    }).join('');

    const prefs = Object.entries(state.prefs || {}).filter(([, v]) => v.n >= 1).map(([id, v]) => ({ d: DISH[id], v: v.v, n: v.n }));
    const liked = prefs.slice().sort((a, b) => b.v - a.v).slice(0, 3);
    const left = prefs.filter(x => x.v < 0.6).sort((a, b) => a.v - b.v).slice(0, 3);
    const prefRow = (x, bad) => `<div class="pref"><span class="e">${x.d.emoji}</span><span class="n">${x.d.name}</span>
      <span class="badge ${bad ? 'orange' : 'green'}">평균 ${Math.round(x.v * 100)}% 섭취</span></div>`;

    const worst = NK.filter(k => k !== 'carb' && k !== 'fat').map(k => ({ k, st: statusOf(k, avgR[k]), r: avgR[k] })).filter(x => x.st !== 'ok');
    const loopSteps = [['📊', '현재 상태 분석'], ['🍱', '오늘 식사 제공'], ['✍️', '섭취 기록'], ['🔍', '부족·과다 분석'], ['⚙️', '다음 식사 조정'], ['🔁', '다시 반영']];

    return {
      flow: [4, 6],
      html: `<div class="pad-top"></div><div class="scroll">
        <div class="greet" style="padding-top:20px"><div class="big-title">리포트</div>
          <p class="ob-desc" style="margin-top:4px">최근 ${logged.length}일 · ${fmtDate(dateOf(logged[0]))} ~</p></div>
        <div class="card">
          <div class="muted small" style="font-weight:600">평균 섭취율</div>
          <div class="big-num">${Math.round(avgRate * 100)}<small>%</small></div>
          <div class="card-sub" style="margin-top:0">목표 칼로리 달성 ${good}일 / ${logged.length}일</div>
          <div class="chart"><div class="target-line" style="bottom:calc(22px + ${(base.kcal / maxK) * 128}px)"><span>목표 ${base.kcal}kcal</span></div>${bars}</div>
        </div>
        <div class="card"><div class="card-title">영양소별 평균</div>
          <div class="card-sub">${worst.length ? worst.map(x => `${NUTRIENTS.find(n => n.key === x.k).label} ${STATUS_LABEL[x.st]}`).join(', ') + '을 다음 식사에서 조정하고 있어요' : '모든 영양소가 목표 범위 안에 있어요'}</div>
          <div class="mt-8">${ntRows(avg, base)}</div></div>
        <div class="card"><div class="card-title">반찬 취향 분석</div><div class="card-sub">남긴 양을 학습해서 추천에 반영해요</div>
          <div class="section-label" style="padding:18px 0 0">잘 먹는 반찬</div><div class="pref-list">${liked.map(x => prefRow(x)).join('')}</div>
          ${left.length ? `<div class="section-label" style="padding:18px 0 0">자주 남기는 반찬 → 추천에서 줄이는 중</div><div class="pref-list">${left.map(x => prefRow(x, true)).join('')}</div>` : ''}
        </div>
        <div class="card"><div class="card-title">오늘한상 식사 루프</div><div class="card-sub">기록이 쌓일수록 추천이 정확해져요</div>
          <div class="loop">${loopSteps.map(([e, t], i) => `<div class="loop-step ${todayLog() ? (i >= 2 ? 'on' : '') : (i <= 1 ? 'on' : '')}"><i>${e}</i>${i + 1}. ${t}</div>`).join('')}</div></div>
        <div style="height:12px"></div></div>`,
    };
  },

  store() {
    const cur = state.storeId;
    const pos = { s1: [30, 58], s2: [68, 36], s3: [78, 74] };
    return {
      flow: [2],
      html: `<div class="pad-top"></div><div class="scroll">
        <div class="greet" style="padding-top:20px"><div class="big-title">우리 동네 반찬가게</div>
          <p class="ob-desc" style="margin-top:4px">${state.profile.address} 근처 제휴 가게 ${STORES.length}곳</p></div>
        <div class="map"><div class="river"></div><div class="me-dot" style="left:44%;top:62%"></div>
          ${STORES.map(s => `<div class="pin ${s.id === cur ? 'on' : ''}" style="left:${pos[s.id][0]}%;top:${pos[s.id][1]}%" data-act="open-store" data-id="${s.id}"><span>${s.emoji} ${s.name.split(' ')[1]}</span></div>`).join('')}
        </div>
        ${STORES.map(s => `<div class="card pressable" data-act="open-store" data-id="${s.id}">
          <div class="store-card"><div class="store-av" style="background:${s.color}">${s.emoji}</div>
            <div style="flex:1"><div class="between"><div class="card-title" style="font-size:17px">${s.name}</div>${s.id === cur ? '<span class="badge green">이용 중</span>' : ''}</div>
              <div class="store-meta"><span class="star">★</span> ${s.rating} (${s.reviews}) · ${s.dist}km · 매일 ${s.cookAt} 조리</div>
              <div class="chips mt-8" style="gap:6px">${s.tags.map(t => `<span class="badge gray">${t}</span>`).join('')}</div></div></div></div>`).join('')}
        <div class="card" style="background:var(--primary-soft)"><div class="row gap-12"><span style="font-size:24px">🤝</span>
          <div class="small" style="color:var(--primary-dark);line-height:1.5;font-weight:600">오늘한상은 동네 반찬가게에 안정적인 정기 주문을 만들어 지역 상권과 함께 성장해요</div></div></div>
        <div style="height:12px"></div></div>`,
    };
  },

  my() {
    const p = state.profile, t = calcTargets(p), bmi = bmiOf(p), sub = state.sub;
    const g = GOALS.find(x => x.id === p.goal);
    const subCard = sub.plan === 'basic'
      ? `<div class="between"><div><div class="small muted" style="font-weight:600">구독 중</div><div class="card-title">Basic · 월 4,900원</div></div><button class="btn btn-soft btn-sm" data-act="go-plans">변경</button></div>
         <div class="card-sub mt-8">식단 추천과 영양 리포트를 받고 있어요</div>`
      : `<div class="between"><div><div class="small muted" style="font-weight:600">${sub.plan === 'single' ? '단품 이용권' : '구독 중'}</div><div class="card-title">${sub.name}${PLAN[sub.plan] ? ' · 월 ' + won(PLAN[sub.plan].price) : ''}</div></div><button class="btn btn-soft btn-sm" data-act="go-plans">변경</button></div>
         <div class="between mt-16 small"><span class="muted">남은 식사</span><b>${sub.remaining}식 / ${sub.total}식</b></div>
         <div class="progress"><div style="width:${(sub.remaining / sub.total) * 100}%"></div></div>`;
    return {
      flow: [0],
      html: `<div class="pad-top"></div><div class="scroll">
        <div class="greet" style="padding-top:20px"><div class="big-title">${p.name}님</div>
          <p class="ob-desc" style="margin-top:4px">${p.gender === 'F' ? '여성' : '남성'} · ${p.age}세 · ${p.height}cm · ${p.weight}kg</p></div>
        <div class="card"><div class="kpis" style="margin-top:0">
          <div class="kpi"><small>BMI</small><b>${bmi.value}</b></div>
          <div class="kpi"><small>하루 권장</small><b>${t.daily.toLocaleString()}</b></div>
          <div class="kpi"><small>한 끼 목표</small><b style="color:var(--primary)">${t.kcal}</b></div></div></div>
        <div class="card">${subCard}</div>
        <div class="card" style="padding-top:8px;padding-bottom:8px">
          <button class="list-item" data-act="edit-goal"><span class="li-ic">${g.emoji}</span><span class="li-t">식사 목표</span><span class="li-v">${g.label}</span>${ICON.chev}</button>
          <button class="list-item" data-act="edit-allergy"><span class="li-ic">🚫</span><span class="li-t">못 먹는 음식</span><span class="li-v">${p.allergies.length ? p.allergies.join(', ') : '없음'}</span>${ICON.chev}</button>
          <button class="list-item" data-act="tab" data-id="store"><span class="li-ic">🏠</span><span class="li-t">배송지·가게</span><span class="li-v">${STORE[state.storeId].name.split(' ')[1]}</span>${ICON.chev}</button>
        </div>
        <div class="section-label">발표 시연용</div>
        <div class="card" style="padding-top:8px;padding-bottom:8px">
          <button class="list-item" data-act="next-day"><span class="li-ic">⏭️</span><span class="li-t">다음 날로 넘어가기</span>${ICON.chev}</button>
          <button class="list-item" data-act="reset"><span class="li-ic">🔄</span><span class="li-t">처음부터 다시 시작</span>${ICON.chev}</button>
        </div>
        <div style="height:12px"></div></div>`,
    };
  },
};

/* ───────── Pushed pages ───────── */
const PAGES = {
  meal({ day }) {
    const m = state.meals[day], lg = state.logs[day], st = STORE[m.storeId];
    const values = lg ? lg.intake : m.total;
    return {
      flow: day > state.day ? [5] : [2],
      html: withAnim(`${appbar(fmtDate(dateOf(day)))}<div class="scroll">
        <div class="hero-plate">
          ${day > state.day ? '<span class="badge blue">기록을 반영해 조정한 내일 식단</span>' : lg ? `<span class="badge green">${Math.round(lg.rate * 100)}% 섭취</span>` : '<span class="badge dark">오늘의 한상</span>'}
          <div class="big-title mt-12">${HEADLINES[m.reasons[0].type]}</div>
          <div class="kpis">
            <div class="kpi"><small>칼로리</small><b>${r0(m.total.kcal)}</b></div>
            <div class="kpi"><small>단백질</small><b>${r0(m.total.protein)}g</b></div>
            <div class="kpi"><small>나트륨</small><b>${r0(m.total.sodium)}mg</b></div></div>
        </div>
        <div class="card flat" style="margin-top:12px;padding-top:12px;padding-bottom:12px">
          ${dishesOf(m).map(d => `<div class="dish-row"><div class="dish-ic">${d.emoji}</div>
            <div class="dish-info"><b>${d.name}</b><small>${portionLabel(d)} · 단백질 ${r0(d.protein * d.portion)}g · 나트륨 ${r0(d.sodium * d.portion)}mg</small></div>
            <span class="dish-kcal">${r0(d.kcal * d.portion)}kcal</span></div>`).join('')}
        </div>
        <div class="card flat" style="margin-top:12px"><div class="card-title">이렇게 차린 이유</div><div class="mt-8">${reasonsHtml(m.reasons)}</div></div>
        <div class="card flat" style="margin-top:12px"><div class="card-title">${lg ? '실제 섭취 영양' : '영양 구성'}</div>
          <div class="card-sub">한 끼 목표 대비 · 점선이 100%예요</div><div class="mt-8">${ntRows(values, m.baseTarget)}</div></div>
        <div class="card flat pressable" style="margin-top:12px" data-act="open-store" data-id="${st.id}">
          <div class="store-line"><div class="store-av" style="background:${st.color}">${st.emoji}</div>
            <div style="flex:1"><b>${st.name}</b><div class="small muted">당일 ${st.cookAt} 조리 · ${st.dist}km</div></div>${ICON.chev}</div></div>
        <div style="height:24px;background:var(--card)"></div>
      </div>
      ${day === state.day && !lg ? '<div class="cta-bar"><button class="btn btn-primary" data-act="open-record">먹은 만큼 기록하기</button></div>' : ''}`),
    };
  },

  record() {
    const m = todayMeal();
    const opts = [[0, '안 먹음'], [0.25, '조금'], [0.5, '절반'], [0.75, '거의'], [1, '다 먹음']];
    const ds = dishesOf(m);
    ds.forEach(d => { if (ui.record[d.id] === undefined) ui.record[d.id] = 1; });
    return {
      flow: [3],
      html: withAnim(`${appbar('섭취 기록')}<div class="scroll">
        <div class="greet"><div class="mid-title">얼마나 드셨나요?</div>
          <p class="ob-desc" style="margin-top:4px">반찬별로 먹은 양을 알려주시면<br/>부족하거나 넘친 영양을 다음 식사에 반영해요</p></div>
        ${ds.map(d => {
          const v = ui.record[d.id];
          return `<div class="rec-card"><div class="rec-top"><div class="dish-ic">${d.emoji}</div>
            <div class="dish-info"><b>${d.name}</b><small>${portionLabel(d)} · ${r0(d.kcal * d.portion)}kcal</small></div>
            <span class="rec-pct ${v < 0.5 ? 'low' : ''}" id="pct-${d.id}">${Math.round(v * 100)}%</span></div>
            <div class="rec-seg">${opts.map(([val, lab]) => `<button class="${v === val ? 'on' : ''}" data-act="rec-set" data-id="${d.id}" data-val="${val}">${lab}</button>`).join('')}</div></div>`;
        }).join('')}
        <div style="height:8px"></div></div>
      <div class="cta-bar"><button class="btn btn-primary" data-act="save-record">기록 완료</button></div>`),
    };
  },

  analyzing() {
    afterRender = () => {
      const steps = $app.querySelectorAll('.an-step');
      steps.forEach((s, i) => ui.timers.push(setTimeout(() => s.classList.add('done'), 350 + i * 450)));
      ui.timers.push(setTimeout(() => {
        ui.stack[ui.stack.length - 1] = { name: 'analysis', params: { day: state.day, fresh: true } };
        ui.anim = 'fade-enter'; render();
      }, 350 + steps.length * 450 + 250));
    };
    return {
      flow: [4],
      html: withAnim(`<div class="pad-top"></div><div class="analyzing">
        <div class="spinner-ring"><svg width="88" height="88" viewBox="0 0 88 88"><circle cx="44" cy="44" r="38" fill="none" stroke="#e8f8ef" stroke-width="8"/><circle cx="44" cy="44" r="38" fill="none" stroke="#16b46c" stroke-width="8" stroke-linecap="round" stroke-dasharray="60 240"/></svg><span>🔍</span></div>
        <div class="mid-title">섭취 데이터를<br/>분석하고 있어요</div>
        <div class="an-steps">
          <div class="an-step"><span class="dot">${ICON.check}</span>반찬별 섭취량 계산</div>
          <div class="an-step"><span class="dot">${ICON.check}</span>영양 부족·과다 분석</div>
          <div class="an-step"><span class="dot">${ICON.check}</span>반찬 취향 학습</div>
          <div class="an-step"><span class="dot">${ICON.check}</span>내일 식단 자동 조정</div>
        </div></div>`, 'fade-enter', true),
    };
  },

  analysis({ day, fresh }) {
    const m = state.meals[day], lg = state.logs[day], next = state.meals[day + 1];
    const st = NK.map(k => ({ k, s: statusOf(k, lg.ratio[k]) }));
    const low = st.filter(x => x.s === 'low').map(x => NUTRIENTS.find(n => n.key === x.k).label);
    const over = st.filter(x => x.s === 'over').map(x => NUTRIENTS.find(n => n.key === x.k).label);
    const summary = [low.length ? `${low.join('·')} 부족` : '', over.length ? `${over.join('·')} 과다` : ''].filter(Boolean).join(', ') || '모든 영양소 적정';
    const cmp = (k, label, unit) => {
      const a = m.total[k], b = next.total[k], diff = b - a;
      const dir = Math.abs(diff) < (k === 'sodium' ? 20 : 1) ? '' : diff > 0 ? 'up' : 'down';
      return `<div class="cmp"><span class="muted">${label}</span><span><span class="from">${r0(a)}${unit}</span><span class="to ${dir}">${r0(b)}${unit} ${dir === 'up' ? '▲' : dir === 'down' ? '▼' : ''}</span></span></div>`;
    };
    const riceA = m.items.find(i => i.id === 'rice').portion, riceB = next.items.find(i => i.id === 'rice').portion;
    return {
      flow: [4, 5, 6],
      html: withAnim(`<div class="pad-top"></div><div class="appbar"><div style="flex:1"></div><button class="icon-btn" data-act="close-analysis">${ICON.close}</button></div>
      <div class="scroll">
        <div class="ob-body" style="padding-top:4px">
          <span class="badge green">${fresh ? '분석 완료' : fmtDate(dateOf(day))}</span>
          <div class="big-title mt-12">오늘 한상의 <span class="hl">${Math.round(lg.rate * 100)}%</span>를<br/>드셨어요</div>
          <p class="ob-desc">${summary}</p>
        </div>
        <div class="card flat" style="padding-top:0"><div class="card-title" style="font-size:16px">목표 대비 섭취량</div><div class="mt-8">${ntRows(lg.intake, m.baseTarget)}</div></div>
        <div style="height:12px;background:var(--bg)"></div>
        <div class="card flat">
          <span class="badge blue">자동 조정</span>
          <div class="mid-title mt-12">내일 한상은<br/>이렇게 바꿀게요</div>
          ${plateGrid(next, m)}
          <div class="compare">
            ${cmp('protein', '단백질', 'g')}${cmp('sodium', '나트륨', 'mg')}${cmp('fiber', '식이섬유', 'g')}
            ${riceA !== riceB ? `<div class="cmp"><span class="muted">밥 양</span><span><span class="from">${riceLabel(riceA)}</span><span class="to">${riceLabel(riceB)}</span></span></div>` : ''}
          </div>
          <div class="mt-16">${reasonsHtml(next.reasons)}</div>
        </div>
        <div style="height:12px;background:var(--card)"></div>
      </div>
      <div class="cta-bar"><button class="btn btn-primary" data-act="close-analysis">확인</button></div>`, null, true),
    };
  },

  store({ id }) {
    const s = STORE[id], cur = state.storeId === id;
    const group = (type, title) => `<div class="menu-group"><h4>${title}</h4>${s.menu[type].map(did => {
      const d = DISH[did];
      const blocked = d.allergens.some(a => state.profile.allergies.includes(a));
      return `<div class="dish-row" style="${blocked ? 'opacity:.4' : ''}"><div class="dish-ic" style="width:44px;height:44px;font-size:22px">${d.emoji}</div>
        <div class="dish-info"><b style="font-size:15px">${d.name}</b><small>${blocked ? '알레르기 성분 포함 · 추천 제외' : `단백질 ${d.protein}g · 나트륨 ${d.sodium}mg`}</small></div><span class="dish-kcal">${d.kcal}kcal</span></div>`;
    }).join('')}</div>`;
    return {
      flow: [2],
      html: withAnim(`${appbar()}<div class="scroll">
        <div class="hero-plate" style="padding-top:0">
          <div class="store-av" style="background:${s.color};width:72px;height:72px;font-size:38px;border-radius:22px">${s.emoji}</div>
          <div class="big-title mt-16">${s.name}</div>
          <div class="store-meta" style="font-size:14px"><span class="star">★</span> ${s.rating} · 리뷰 ${s.reviews} · ${s.dist}km · ${s.since}년부터</div>
          <p class="ob-desc">${s.desc}</p>
          <div class="chips mt-12" style="gap:6px">${s.tags.map(t => `<span class="badge green">${t}</span>`).join('')}<span class="badge gray">매일 ${s.cookAt} 조리</span></div>
        </div>
        <div class="card flat" style="margin-top:12px"><div class="card-title">오늘 조리하는 메뉴</div>
          <div class="card-sub">이 메뉴 안에서 ${state.profile.name}님께 맞는 조합을 골라요</div>
          ${group('main', '메인')}${group('soup', '국·찌개')}${group('side', '반찬')}</div>
        <div style="height:12px;background:var(--card)"></div>
      </div>
      ${cur ? '' : `<div class="cta-bar"><button class="btn btn-primary" data-act="switch-store" data-id="${id}">이 가게로 바꾸기</button></div>`}`),
    };
  },

  plans({ onboarding }) {
    const pick = ui.planPick;
    const pack = SINGLE_PACKS.find(x => x.count === ui.packPick);
    const label = pick === 'single' ? `${pack.count}식 ${won(pack.price)} 결제하기` : `월 ${won(PLAN[pick].price)} 구독하기`;
    return {
      flow: [2],
      html: withAnim(`${appbar(onboarding ? '' : '요금제', '', onboarding ? 'ob-back' : 'back')}<div class="scroll">
        <div class="ob-body" style="padding-top:8px;padding-bottom:16px"><div class="big-title">나에게 맞는<br/>요금제를 골라주세요</div>
          <p class="ob-desc">언제든 변경하거나 해지할 수 있어요</p></div>
        <div style="padding:0 16px">
          ${PLANS.map(p => `<button class="plan ${pick === p.id ? 'on' : ''}" data-act="plan-pick" data-id="${p.id}">
            <span class="plan-radio">${ICON.check}</span>
            <div class="plan-name">${p.name}${p.badge ? `<span class="badge green">${p.badge}</span>` : ''}</div>
            <div class="plan-price">${won(p.price)}<small> / 월</small></div>
            <div class="plan-sum">${p.summary}${p.meals ? ` · 1식 ${won(Math.round(p.price / p.meals / 10) * 10)}` : ''}</div>
            ${pick === p.id ? `<div class="plan-feats">${p.features.map(f => `<div><span style="color:var(--primary)">✓</span>${f}</div>`).join('')}</div>` : ''}
          </button>`).join('')}
          <div class="section-label" style="padding-left:4px">필요할 때만 단품으로 · 1식 10,000원</div>
          <div class="pack-grid">${SINGLE_PACKS.map(p => `<button class="pack ${pick === 'single' && ui.packPick === p.count ? 'on' : ''}" data-act="pack-pick" data-count="${p.count}"><b>${p.count}식</b><small>${(p.price / 10000)}만원</small></button>`).join('')}</div>
        </div><div style="height:16px"></div></div>
      <div class="cta-bar"><button class="btn btn-primary" data-act="plan-confirm" data-onboarding="${onboarding ? 1 : ''}">${label}</button></div>`, null, false),
    };
  },
};

/* ───────── Actions ───────── */
const ACTIONS = {
  tab(el) { ui.tab = el.dataset.id; ui.stack = []; ui.anim = 'fade-enter'; render(); $app.querySelector('.scroll')?.scrollTo(0, 0); },
  back() { pop(); },
  toast(el) { toast(el.dataset.msg); },
  'close-sheet'() { closeSheet(); },

  'ob-next'() {
    const step = OB_STEPS[ui.ob.step];
    if (!obValid(step, ui.ob.data)) return;
    ui.ob.step++; ui.anim = 'page-enter'; render();
  },
  'ob-back'() {
    if (ui.ob.step === 0) return;
    ui.ob.step--;
    if (OB_STEPS[ui.ob.step] === 'analyzing') ui.ob.step--;
    ui.anim = 'page-back'; render();
  },
  'ob-set'(el) {
    ui.ob.data[el.dataset.field] = el.dataset.val;
    el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el));
    refreshObCta();
  },
  'ob-pick'(el) {
    const { field, val, multi } = el.dataset;
    const d = ui.ob.data;
    if (multi) {
      d[field] = d[field].includes(val) ? d[field].filter(x => x !== val) : [...d[field], val];
      el.classList.toggle('on');
      if (field === 'allergies') document.getElementById('ob-next').textContent = d.allergies.length ? '다음' : '없어요';
    } else {
      d[field] = val;
      el.parentElement.querySelectorAll('.opt').forEach(b => b.classList.toggle('on', b === el));
      refreshObCta();
      ui.timers.push(setTimeout(() => ACTIONS['ob-next'](), 280));
    }
  },
  demo() {
    ui.planPick = 'meal';
    finishOnboarding({ ...DEMO_PROFILE }, 'meal');
  },

  'open-meal'(el) { push('meal', { day: Number(el.dataset.day) }); },
  'open-record'() { ui.record = {}; push('record'); },
  'rec-set'(el) {
    const v = Number(el.dataset.val);
    ui.record[el.dataset.id] = v;
    el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el));
    const pct = document.getElementById('pct-' + el.dataset.id);
    pct.textContent = Math.round(v * 100) + '%';
    pct.classList.toggle('low', v < 0.5);
  },
  'save-record'() {
    recordIntake(state, state.day, ui.record);
    save();
    ui.stack[ui.stack.length - 1] = { name: 'analyzing' };
    ui.anim = 'fade-enter'; render();
  },
  'open-analysis'(el) { push('analysis', { day: Number(el.dataset.day) }); },
  'close-analysis'() { ui.stack = []; ui.tab = 'home'; ui.anim = 'fade-enter'; render(); },

  'open-store'(el) { push('store', { id: el.dataset.id }); },
  'switch-store'(el) {
    const s = STORE[el.dataset.id];
    openSheet(`<div class="sheet-title">${s.name}로 바꿀까요?</div>
      <p class="sheet-desc">${todayLog() ? '내일 식사부터' : '오늘 식사부터'} ${s.name}의 메뉴로 다시 추천해드려요.</p>
      <div class="btn-row mt-24"><button class="btn btn-gray" data-act="close-sheet">취소</button><button class="btn btn-primary" data-act="do-switch-store" data-id="${s.id}">바꾸기</button></div>`);
  },
  'do-switch-store'(el) {
    state.storeId = el.dataset.id;
    const target = todayLog() ? state.day + 1 : state.day;
    state.meals[target] = recommend(state, target);
    save(); closeSheet(true); pop();
    toast(`${STORE[state.storeId].name}로 변경했어요`);
  },

  'go-plans'() {
    ui.planPick = state.sub.plan === 'single' ? 'single' : state.sub.plan;
    push('plans', {});
  },
  'plan-pick'(el) { ui.planPick = el.dataset.id; rerenderKeepScroll(); },
  'pack-pick'(el) { ui.planPick = 'single'; ui.packPick = Number(el.dataset.count); rerenderKeepScroll(); },
  'plan-confirm'(el) {
    const single = ui.planPick === 'single';
    if (el.dataset.onboarding) {
      finishOnboarding(obProfile(), ui.planPick, single ? ui.packPick : null);
      return;
    }
    if (single) state.sub = { plan: 'single', name: `단품 ${ui.packPick}식`, remaining: ui.packPick, total: ui.packPick };
    else { const p = PLAN[ui.planPick]; state.sub = { plan: p.id, name: p.name, remaining: p.meals, total: p.meals }; }
    save(); pop();
    toast(`${state.sub.name}${single ? '' : ' 요금제'}로 변경했어요`);
  },

  'edit-goal'() {
    const p = state.profile;
    openSheet(`<div class="sheet-title">식사 목표를 바꿀까요?</div><p class="sheet-desc">바꾸면 한 끼 목표와 추천 식단이 다시 계산돼요</p>
      <div class="opt-list" style="margin-top:20px">${GOALS.map(o => `<button class="opt ${p.goal === o.id ? 'on' : ''}" data-act="set-goal" data-id="${o.id}">
        <span class="opt-emoji">${o.emoji}</span><span class="opt-text"><b>${o.label}</b><small>${o.sub}</small></span><span class="opt-check">${ICON.check}</span></button>`).join('')}</div>`);
  },
  'set-goal'(el) {
    state.profile.goal = el.dataset.id;
    rerecommend(); closeSheet(true); render();
    toast(`목표를 ‘${GOALS.find(g => g.id === el.dataset.id).label}’로 바꾸고 식단을 다시 짰어요`);
  },
  'edit-allergy'() {
    const a = state.profile.allergies;
    openSheet(`<div class="sheet-title">못 먹는 음식</div><p class="sheet-desc">선택한 성분이 들어간 메뉴는 추천하지 않아요</p>
      <div class="chips mt-20">${ALLERGENS.map(x => `<button class="chip ${a.includes(x) ? 'on' : ''}" data-act="toggle-allergy" data-val="${x}">${x}</button>`).join('')}</div>
      <button class="btn btn-primary mt-24" data-act="save-allergy">저장</button>`);
  },
  'toggle-allergy'(el) { el.classList.toggle('on'); },
  'save-allergy'() {
    state.profile.allergies = [...$app.querySelectorAll('.sheet .chip.on')].map(c => c.dataset.val);
    rerecommend(); closeSheet(true); render();
    toast('식단을 다시 짰어요');
  },

  'next-day'() {
    if (!todayLog()) {
      openSheet(`<div class="sheet-title">오늘 식사를 아직 기록하지 않았어요</div>
        <p class="sheet-desc">기록 없이 넘어가면 다 드신 것으로 처리할게요.</p>
        <div class="btn-row mt-24"><button class="btn btn-gray" data-act="close-sheet">취소</button><button class="btn btn-primary" data-act="do-next-day">넘어가기</button></div>`);
      return;
    }
    ACTIONS['do-next-day']();
  },
  'do-next-day'() {
    if (!todayLog()) recordIntake(state, state.day, {});
    state.day += 1;
    if (!state.meals[state.day]) state.meals[state.day] = recommend(state, state.day);
    save(); closeSheet(true);
    ui.tab = 'home'; ui.stack = []; render();
    toast(`${fmtDate(dateOf(state.day))}로 넘어갔어요`);
  },
  reset() {
    openSheet(`<div class="sheet-title">처음부터 다시 시작할까요?</div><p class="sheet-desc">모든 기록이 지워지고 온보딩부터 다시 시작해요.</p>
      <div class="btn-row mt-24"><button class="btn btn-gray" data-act="close-sheet">취소</button><button class="btn btn-primary" data-act="do-reset" style="background:var(--red)">초기화</button></div>`);
  },
  'do-reset'() {
    state = freshState(); save();
    ui.ob = { step: 0, data: blankOb() }; ui.stack = []; ui.tab = 'home';
    closeSheet(true); render();
  },
};

// 목표·알레르기 변경 시: 아직 기록 안 한 식사를 다시 추천
function rerecommend() {
  const target = todayLog() ? state.day + 1 : state.day;
  state.meals[target] = recommend(state, target);
  save();
}

function rerenderKeepScroll() {
  const sc = $app.querySelector('.scroll'), top = sc ? sc.scrollTop : 0;
  ui.anim = 'none'; render();
  const sc2 = $app.querySelector('.scroll'); if (sc2) sc2.scrollTop = top;
}

function refreshObCta() {
  const btn = document.getElementById('ob-next');
  if (btn) btn.disabled = !obValid(OB_STEPS[ui.ob.step], ui.ob.data);
}

/* ───────── Events ───────── */
$app.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || !$app.contains(el)) return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) { e.stopPropagation(); fn(el); }
});
$app.addEventListener('input', e => {
  const f = e.target.dataset.field;
  if (!f) return;
  ui.ob.data[f] = e.target.value;
  refreshObCta();
});
$app.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.dataset.field) ACTIONS['ob-next']();
});

/* ───────── Device scaling (desktop) ───────── */
function fitDevice() {
  const dev = document.getElementById('device');
  if (window.innerWidth <= 500) { dev.style.transform = ''; return; }
  const s = Math.min(1, (window.innerHeight - 32) / 868);
  dev.style.transform = `scale(${s})`;
  const slot = dev.parentElement;
  slot.style.width = 414 * s + 'px'; slot.style.height = 868 * s + 'px';
}
window.addEventListener('resize', fitDevice);
fitDevice();

/* ───────── Status bar clock ───────── */
function tick() {
  const d = new Date();
  document.querySelector('.sb-time').textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}
tick(); setInterval(tick, 30000);

// 저장된 데이터가 깨졌으면 초기화
if (state.profile && !state.meals[state.day]) state = freshState();
render();
