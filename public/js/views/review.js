// Révisions libres : toutes les cartes et exercices dus, en dehors de la séance du jour.
import { h, icon, setMode } from '../ui.js';
import { store } from '../store.js';
import { runCards, runExercises } from '../components.js';
import { dueIds, MASTERED_DAYS } from '../srs.js';
import { buildListening, runListening, studiedUnits } from '../listening.js';
import { runWriting } from '../writing.js';

export function reviewView(root, params) {
  setMode(null);
  const holder = h('div');
  const done = () => { location.hash = '#/review'; };
  if (params[0] === 'cards') {
    root.replaceChildren(holder);
    return runCards(holder, dueIds(['c:', 'r:']), { title: 'Révision des cartes', subtitle: 'Révisions libres', onFinish: done });
  }
  if (params[0] === 'ex') {
    root.replaceChildren(holder);
    return runExercises(holder, dueIds(['x:']).slice(0, 30), { title: 'Révision des exercices', subtitle: 'Révisions libres', onFinish: done });
  }
  if (params[0] === 'listening' || params[0] === 'speaking') {
    root.replaceChildren(holder);
    const speakOnly = params[0] === 'speaking';
    return buildListening(speakOnly ? { dictation: 0, choice: 0, speaking: 10 } : { dictation: 8, choice: 4, speaking: 0 })
      .then(items => runListening(holder, items, { title: speakOnly ? 'Prononciation' : 'Écoute et dictée', subtitle: 'Révisions libres', onFinish: done }));
  }
  if (params[0] === 'writing') {
    root.replaceChildren(holder);
    return runWriting(holder, { onFinish: done });
  }
  if (params[0] === 'mistakes') {
    root.replaceChildren(holder);
    const hard = Object.entries(store.state.items).filter(([, it]) => it.lapses > 0).sort((a, b) => b[1].lapses - a[1].lapses).map(([id]) => id);
    const cards = hard.filter(id => !id.startsWith('x:')), ex = hard.filter(id => id.startsWith('x:'));
    return ex.length
      ? runExercises(holder, ex.slice(0, 20), { title: 'Mes erreurs fréquentes', subtitle: 'Les exercices que tu as le plus ratés', onFinish: () => runCards(holder, cards.slice(0, 30), { title: 'Cartes difficiles', subtitle: 'Mes erreurs fréquentes', onFinish: done }) })
      : runCards(holder, cards.slice(0, 30), { title: 'Cartes difficiles', subtitle: 'Mes erreurs fréquentes', onFinish: done, emptyText: 'Aucune erreur répétée pour l’instant. Continue comme ça !' });
  }

  const items = Object.entries(store.state.items);
  const cardsDue = dueIds(['c:', 'r:']).length, exDue = dueIds(['x:']).length;
  const total = items.filter(([id]) => !id.startsWith('x:')).length;
  const mastered = items.filter(([id, it]) => !id.startsWith('x:') && it.interval >= MASTERED_DAYS).length;
  const learning = total - mastered;
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(23, 59);
  const dueTomorrow = items.filter(([, it]) => it.due > Date.now() && it.due <= tomorrow.getTime()).length;

  root.replaceChildren(h('h1', { class: 'page-title' }, 'Révisions'),
    h('p', { class: 'muted' }, 'La répétition espacée te présente chaque élément juste avant que tu ne l’oublies. Réviser un peu chaque jour vaut mieux que beaucoup une fois par semaine.'),
    h('div', { class: 'kpis' },
      h('div', { class: 'kpi card amber' }, h('div', { class: 'kpi-ic' }, icon('cards', 20)), h('strong', {}, String(cardsDue)), h('span', {}, 'cartes à revoir')),
      h('div', { class: 'kpi card' }, h('div', { class: 'kpi-ic' }, icon('pencil', 20)), h('strong', {}, String(exDue)), h('span', {}, 'exercices à revoir')),
      h('div', { class: 'kpi card' }, h('div', { class: 'kpi-ic' }, icon('clock', 20)), h('strong', {}, String(dueTomorrow)), h('span', {}, 'prévus demain')),
      h('div', { class: 'kpi card amber' }, h('div', { class: 'kpi-ic' }, icon('star', 20)), h('strong', {}, `${mastered} / ${total}`), h('span', {}, `cartes maîtrisées (${learning} en cours)`))),
    h('div', { class: 'grid-3' },
      action('cards', 'Réviser les cartes', `${cardsDue} carte${cardsDue > 1 ? 's' : ''} due${cardsDue > 1 ? 's' : ''}`, '#/review/cards', cardsDue),
      action('pencil', 'Réviser les exercices', `${exDue} exercice${exDue > 1 ? 's' : ''} dû${exDue > 1 ? 's' : ''}`, '#/review/ex', exDue),
      action('target', 'Mes erreurs fréquentes', 'Retravailler ce qui résiste', '#/review/mistakes', 1),
      action('sound', 'Écoute et dictée', 'Écrire ce que dit la voix anglaise', '#/review/listening', 1),
      action('play', 'Prononciation', 'Répéter des phrases au micro (hors ligne)', '#/review/speaking', 1),
      action('pencil', 'Expression écrite', 'Écrire un texte, corrigé hors ligne', '#/review/writing', 1)));
}

function action(ic, title, sub, href, n) {
  return h('a', { class: 'card action' + (n ? '' : ' disabled'), href: n ? href : null },
    h('div', { class: 'kpi-ic' }, icon(ic, 22)), h('strong', {}, title), h('span', { class: 'muted small' }, sub));
}
