// Répétition espacée (variante de SM-2, l'algorithme d'origine de SuperMemo / Anki).
// Notes : 0 = À revoir, 1 = Difficile, 2 = Bien, 3 = Facile.
import { store } from './store.js';

const DAY = 86400000;
export const AGAIN = 0, HARD = 1, GOOD = 2, EASY = 3;
export const MASTERED_DAYS = 21;

function fuzz(days) {
  if (days < 3) return days;
  return days * (0.95 + Math.random() * 0.1);
}

// Fin de journée « logique » : une révision prévue dans N jours est due dès le matin de ce jour-là.
function dueIn(days) {
  if (days <= 0) return Date.now() + 60 * 1000;
  const d = new Date(Date.now() + Math.round(fuzz(days)) * DAY);
  d.setHours(4, 0, 0, 0);
  return d.getTime();
}

export function getItem(id) { return store.state.items[id]; }

// Ajoute un élément au planning. firstDelay = 0 → à étudier tout de suite (nouvelle carte).
export function addItem(id, firstDelay = 0) {
  const items = store.state.items;
  if (items[id]) return items[id];
  items[id] = { ef: 2.5, interval: 0, reps: 0, lapses: 0, due: firstDelay ? dueIn(firstDelay) : Date.now(), last: 0, added: Date.now() };
  return items[id];
}

export function grade(id, q) {
  const it = store.state.items[id] || addItem(id);
  const wasNew = it.reps === 0;
  if (q === AGAIN) {
    if (it.reps > 0) it.lapses++;
    it.reps = 0;
    it.ef = Math.max(1.3, it.ef - 0.2);
    it.interval = 0;
    it.due = dueIn(0);
  } else {
    if (it.reps === 0) {
      it.interval = q === EASY ? 4 : 1;
    } else if (it.reps === 1 && it.interval < 3) {
      it.interval = q === HARD ? 2 : q === GOOD ? 3 : 6;
    } else {
      const mult = q === HARD ? 1.2 : q === GOOD ? it.ef : it.ef * 1.3;
      it.interval = Math.max(it.interval + 1, Math.round(it.interval * mult));
    }
    if (q === HARD) it.ef = Math.max(1.3, it.ef - 0.15);
    if (q === EASY) it.ef = it.ef + 0.15;
    it.reps++;
    it.due = dueIn(it.interval);
  }
  it.last = Date.now();
  return { item: it, wasNew };
}

// Les exercices déjà réussis reviennent plus tard (récupération espacée), ratés → demain.
export function gradeExercise(id, correct) {
  const it = store.state.items[id] || addItem(id, 2);
  if (correct) {
    it.interval = it.reps === 0 ? Math.max(2, it.interval) : Math.round(Math.max(it.interval, 2) * it.ef);
    it.reps++;
    it.due = dueIn(it.interval);
  } else {
    if (it.reps > 0) it.lapses++;
    it.reps = 0;
    it.ef = Math.max(1.3, it.ef - 0.2);
    it.interval = 1;
    it.due = dueIn(1);
  }
  it.last = Date.now();
  return it;
}

export function isDue(it, at = Date.now()) { return it && it.due <= at; }

export function dueIds(prefixes, at = Date.now()) {
  const out = [];
  for (const [id, it] of Object.entries(store.state.items)) {
    if (it.due <= at && prefixes.some(p => id.startsWith(p))) out.push(id);
  }
  // Les plus en retard d'abord.
  out.sort((a, b) => store.state.items[a].due - store.state.items[b].due);
  return out;
}

export function intervalLabel(days) {
  if (days <= 0) return '< 1 min';
  if (days === 1) return '1 j';
  if (days < 30) return `${days} j`;
  if (days < 365) return `${Math.round(days / 30)} mois`;
  return `${(days / 365).toFixed(1)} an`;
}

// Aperçu de l'intervalle obtenu pour chaque note (affiché sous les boutons).
export function preview(id) {
  const saved = store.state.items[id] ? { ...store.state.items[id] } : null;
  const res = [AGAIN, HARD, GOOD, EASY].map(q => {
    const tmp = saved ? { ...saved } : { ef: 2.5, interval: 0, reps: 0, lapses: 0 };
    store.state.items[id] = tmp;
    grade(id, q);
    return store.state.items[id].interval;
  });
  if (saved) store.state.items[id] = saved; else delete store.state.items[id];
  return res;
}
