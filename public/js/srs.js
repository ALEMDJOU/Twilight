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

// Révision « hors planning » (bibliothèque, erreurs fréquentes…) d'un élément déjà vu et pas encore dû :
// une réussite ne change pas son planning (sinon les intervalles gonflent), un échec le fait revenir plus tôt.
// Les éléments en cours d'apprentissage (intervalle 0) restent toujours notés.
export function isEarly(it, at = Date.now()) { return !!it && it.last > 0 && it.interval > 0 && it.due > at; }
const DAYS_LEFT = it => Math.max(1, Math.round((it.due - Date.now()) / DAY));
const LEARN_MIN = 10; // « Difficile » sur une carte en apprentissage : revient dans 10 min

export function grade(id, q) {
  const it = store.state.items[id] || addItem(id);
  // Nouvelle = jamais révisée (une carte oubliée remise à 0 n'est pas nouvelle).
  const wasNew = !it.last;
  if (q !== AGAIN && isEarly(it)) return { item: it, wasNew, early: true };
  if (q === AGAIN) {
    if (it.reps > 0) it.lapses++;
    it.reps = 0;
    it.ef = Math.max(1.3, it.ef - 0.2);
    it.interval = 0;
    it.due = dueIn(0);
  } else {
    // Intervalles toujours distincts et croissants : Difficile < Bien < Facile.
    if (it.reps === 0 && q === HARD) {
      it.interval = 0;
      it.due = Date.now() + LEARN_MIN * 60 * 1000;
    } else {
      if (it.reps === 0) {
        it.interval = q === EASY ? 4 : 1;
      } else if (it.reps === 1 && it.interval < 3) {
        it.interval = q === HARD ? 2 : q === GOOD ? 3 : 6;
      } else {
        const hard = Math.max(it.interval + 1, Math.round(it.interval * 1.2));
        const good = Math.max(hard + 1, Math.round(it.interval * it.ef));
        it.interval = q === HARD ? hard : q === GOOD ? good : Math.max(good + 1, Math.round(it.interval * it.ef * 1.3));
      }
      it.reps++;
      it.due = dueIn(it.interval);
    }
    if (q === HARD) it.ef = Math.max(1.3, it.ef - 0.15);
    if (q === EASY) it.ef = Math.min(2.8, it.ef + 0.15);
  }
  it.last = Date.now();
  return { item: it, wasNew };
}

// Les exercices déjà réussis reviennent plus tard (récupération espacée), ratés → demain.
// result : true (réussi), 'hard' (réussi avec une faute de frappe tolérée), false (raté).
// ef évolue comme pour les cartes, dans des bornes modestes (1,3 – 2,8).
export function gradeExercise(id, result) {
  const it = store.state.items[id] || addItem(id, 2);
  const hard = result === 'hard';
  if (result && isEarly(it)) return it;
  if (result) {
    if (it.reps === 0) it.interval = hard ? 1 : Math.max(2, it.interval);
    else it.interval = hard ? Math.max(it.interval + 1, Math.round(it.interval * 1.2)) : Math.round(Math.max(it.interval, 2) * it.ef);
    if (hard) it.ef = Math.max(1.3, it.ef - 0.15);
    else if (it.reps > 0) it.ef = Math.min(2.8, it.ef + 0.1);
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

// Raté récemment : exercice faux (reps remis à 0) ou carte réapprise après un oubli (intervalle ≤ 1 j).
export function isRecentFail(it) {
  return !!it && it.last > 0 && (it.reps === 0 || (it.lapses > 0 && it.interval <= 1));
}

// Garde au plus `max` éléments dus : une part (30 %) est réservée aux erreurs récentes (les plus récentes d'abord),
// pour qu'elles reviennent vite même s'il y a du retard ; le reste suit l'ordre « les plus en retard d'abord ».
export const FAIL_SHARE = 0.3;
export function pickDue(ids, max, share = FAIL_SHARE) {
  if (ids.length <= max) return ids;
  const items = store.state.items;
  const fails = ids.filter(id => isRecentFail(items[id]))
    .sort((a, b) => items[b].last - items[a].last)
    .slice(0, Math.round(max * share));
  const kept = new Set(fails);
  return [...fails, ...ids.filter(id => !kept.has(id)).slice(0, max - fails.length)];
}

export function intervalLabel(days) {
  if (days <= 0) return '< 1 min';
  if (days < 1) return `${Math.round(days * 1440)} min`;
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
    const { early } = grade(id, q);
    const it = store.state.items[id];
    // hors planning : la date prévue ne bouge pas ; en apprentissage : quelques minutes
    if (early) return DAYS_LEFT(it);
    return it.interval === 0 && q !== AGAIN ? LEARN_MIN / 1440 : it.interval;
  });
  if (saved) store.state.items[id] = saved; else delete store.state.items[id];
  return res;
}
