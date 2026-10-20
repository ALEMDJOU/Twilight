// Planification de la séance du jour.
// Répartition fondée sur la recherche (Dunlosky et al., 2013 ; Roediger & Karpicke, 2006 ; Cepeda et al., 2006) :
//   40 % flashcards en répétition espacée, 40 % exercices (récupération active), 20 % leçons.
import { store, today, dayKey } from './store.js';
import { nextUnit, loadUnit, cardIds, exerciseIds, proverbExerciseIds, getProverbs, unitMeta } from './content.js';
import { dueIds, addItem } from './srs.js';

export const SPLIT = { cards: 0.4, exercise: 0.4, lesson: 0.2 };
// Durées moyennes estimées, servent à doser la séance.
const SEC_PER_CARD = 12, SEC_PER_EXERCISE = 45, MIN_PER_LESSON = 9;

export function budgets() {
  const m = store.state.settings.minutesPerDay;
  return { cards: m * SPLIT.cards * 60, exercise: m * SPLIT.exercise * 60, lesson: m * SPLIT.lesson * 60 };
}

// Le créneau « vocabulaire » alterne entre le vocabulaire et les collocations (deux livres complémentaires).
function vocabBook(i) {
  const track = store.state.settings.vocabTrack;
  const cycle = track === 'parallel' ? ['vocab_int', 'collocations', 'vocab_adv'] : ['vocab_int', 'collocations'];
  return cycle[i % cycle.length];
}

// Séances des jours précédents (14 derniers jours) qui ne sont pas terminées : on peut les reprendre.
const PENDING_DAYS = 14;
export function pendingDays() {
  const now = dayKey(), limit = new Date(); limit.setDate(limit.getDate() - PENDING_DAYS);
  const min = dayKey(limit);
  return Object.entries(store.state.days)
    .filter(([k, d]) => k < now && k >= min && d.plan?.steps?.some(s => !s.done && s.type !== 'warmup'))
    .map(([k, d]) => ({ key: k, plan: d.plan, left: d.plan.steps.filter(s => !s.done && s.type !== 'warmup').length }))
    .sort((a, b) => b.key.localeCompare(a.key));
}

// Unités prévues dans une séance passée non terminée : on ne les reprogramme pas aujourd'hui.
function reservedUnits() {
  const out = [];
  for (const p of pendingDays()) for (const s of p.plan.steps) if (s.type === 'lesson' && !s.done) out.push(s.uid);
  return out;
}

// Choisit les nouvelles unités du jour en alternant grammaire et vocabulaire (apprentissage entrelacé).
function pickUnits(count) {
  const picked = [];
  const reserved = reservedUnits();
  let v = 0;
  for (let i = 0; i < count; i++) {
    const wantGrammar = i % 2 === 0;
    const ex = [...picked, ...reserved];
    let u = wantGrammar ? nextUnit('grammar', ex) : nextUnit(vocabBook(v++), ex);
    if (!u && !wantGrammar) u = nextUnit('vocab_int', ex) || nextUnit('collocations', ex) || nextUnit('vocab_adv', ex);
    if (!u) u = nextUnit('grammar', ex) || nextUnit('vocab_int', ex) || nextUnit('collocations', ex) || nextUnit('vocab_adv', ex);
    if (!u) break;
    picked.push(u.id);
  }
  return picked;
}

// Jour dont on joue la séance : aujourd'hui, ou un jour passé repris.
export function dayRecord(key) { return key ? store.state.days[key] : today(); }
export function planFor(key) { return key ? store.state.days[key]?.plan || null : getPlan(); }

export function getPlan() {
  const d = today();
  const b = budgets();
  const nUnits = Math.max(1, Math.round(b.lesson / 60 / MIN_PER_LESSON));
  if (d.plan && d.plan.minutes === store.state.settings.minutesPerDay) {
    // Recalcule si de nouvelles unités sont arrivées et qu'aucune leçon du jour n'a commencé.
    const started = d.plan.steps.some(s => s.done && s.type !== 'warmup');
    if (started || d.plan.units.length >= nUnits || pickUnits(nUnits).length <= d.plan.units.length) return d.plan;
  }
  const warmDone = d.plan?.steps?.[0]?.done || false;
  const units = pickUnits(nUnits);
  const steps = [{ type: 'warmup', done: warmDone }];
  for (const uid of units) {
    steps.push({ type: 'lesson', uid, done: false });
    steps.push({ type: 'unit-ex', uid, done: false });
  }
  steps.push({ type: 'review-ex', done: false });
  steps.push({ type: 'proverbs', done: false });
  steps.push({ type: 'cards', done: false });
  d.plan = { minutes: store.state.settings.minutesPerDay, units, steps, created: Date.now() };
  store.save();
  return d.plan;
}

export function resetPlan() { today().plan = null; return getPlan(); }

export function stepInfo(step) {
  switch (step.type) {
    case 'warmup': return { title: 'Échauffement', desc: 'Révise les cartes du jour avant d’apprendre du neuf.', method: 'cards', icon: 'cards' };
    case 'lesson': { const m = unitMeta(step.uid); return { title: `Leçon — ${m.title}`, desc: `${m.book.short} · Unité ${m.n}`, method: 'lesson', icon: 'book' }; }
    case 'unit-ex': { const m = unitMeta(step.uid); return { title: `Exercices — ${m.title}`, desc: `Pratique immédiate de l’unité ${m.n}`, method: 'exercise', icon: 'pencil' }; }
    case 'review-ex': return { title: 'Révision mélangée', desc: 'Exercices des unités passées, mélangés pour mieux retenir.', method: 'exercise', icon: 'target' };
    case 'proverbs': return { title: 'Proverbes du jour', desc: `${store.state.settings.newProverbsPerDay} nouveaux proverbes à découvrir.`, method: 'cards', icon: 'quote' };
    case 'cards': return { title: 'Flashcards', desc: 'Nouvelles cartes des leçons du jour et révisions restantes.', method: 'cards', icon: 'cards' };
  }
  return { title: step.type, desc: '', method: 'lesson', icon: 'book' };
}

// Quand une leçon est terminée, ses cartes et exercices entrent dans le planning.
export async function markLessonDone(uid) {
  const unit = await loadUnit(uid);
  const u = store.state.units[uid] || (store.state.units[uid] = {});
  if (!u.lessonDone) u.lessonDone = Date.now();
  for (const id of cardIds(uid, unit)) addItem(id, 0);
  store.save();
}

export function markUnitExercises(uid, right, total) {
  const u = store.state.units[uid] || (store.state.units[uid] = {});
  u.exDone = Date.now();
  u.right = right; u.total = total;
  store.save();
}

/* ---- Contenu de chaque étape (calculé au moment où l'étape commence) ---- */

const CARD_PREFIX = ['c:', 'r:'];
const isNew = id => (store.state.items[id]?.reps ?? 0) === 0 && !(store.state.items[id]?.last);

export function warmupCards() {
  const max = Math.round(budgets().cards / SEC_PER_CARD / 2);
  return dueIds(CARD_PREFIX).filter(id => !isNew(id)).slice(0, max);
}

export async function unitExercises(uid) {
  const unit = await loadUnit(uid);
  return exerciseIds(uid, unit);
}

export function reviewExercises(plan = getPlan()) {
  const used = plan.units.length * 10 * SEC_PER_EXERCISE;
  const max = Math.max(8, Math.round((budgets().exercise - used) / SEC_PER_EXERCISE));
  const todays = new Set(plan.units);
  const due = dueIds(['x:']).filter(id => !todays.has(id.split(':')[1]));
  return interleave(due).slice(0, max);
}

// Mélange les exercices de sources différentes pour éviter les blocs d'un même sujet.
function interleave(ids) {
  const groups = new Map();
  for (const id of ids) {
    const k = id.split(':')[1];
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(id);
  }
  const out = [], lists = [...groups.values()];
  while (lists.some(l => l.length)) for (const l of lists) if (l.length) out.push(l.shift());
  return out;
}

export function introduceProverbs(d = today()) {
  const per = store.state.settings.newProverbsPerDay;
  if (d.proverbsFrom == null) {
    d.proverbsFrom = store.state.proverbsIntroduced;
    store.state.proverbsIntroduced = Math.min(getProverbs().length, d.proverbsFrom + per);
  }
  const ids = [];
  for (let n = d.proverbsFrom + 1; n <= store.state.proverbsIntroduced; n++) {
    ids.push(`c:p:${n}`);
    addItem(`c:p:${n}`, 0);
    for (const x of proverbExerciseIds(n)) addItem(x, 2);
  }
  store.save();
  return ids.filter(id => (store.state.items[id]?.due ?? 0) <= Date.now());
}

export function remainingCards() {
  const max = Math.round(budgets().cards / SEC_PER_CARD);
  const due = dueIds(CARD_PREFIX);
  // Les nouvelles cartes après les révisions, mais toujours incluses (elles viennent des leçons du jour).
  const reviews = due.filter(id => !isNew(id)), fresh = due.filter(isNew);
  return [...reviews.slice(0, Math.max(0, max - fresh.length)), ...fresh];
}

export function dueSummary() {
  const cards = dueIds(CARD_PREFIX).length;
  const ex = dueIds(['x:']).length;
  return { cards, ex };
}
