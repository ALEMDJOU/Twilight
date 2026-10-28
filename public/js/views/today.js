// Séance du jour : enchaîne les étapes du plan (révisions → leçon → exercices → révision mélangée → proverbes → cartes).
import { h, icon, setMode, fmtMin, speakBtn, rich } from '../ui.js';
import { store, today } from '../store.js';
import { loadUnit, unitMeta, getProverbs } from '../content.js';
import { renderLesson, runExercises, runCards, lessonAnchors } from '../components.js';
import { confetti } from '../fx.js';
import { buildListening, runListening } from '../listening.js';
import { planFor, dayRecord, pendingDays, stepInfo, markLessonDone, markUnitExercises, warmupCards, unitExercises, reviewExercises, introduceProverbs, remainingCards } from '../session.js';

const fmtDay = k => new Date(k + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

// Liens vers les séances des jours précédents qui ne sont pas finies.
function pendingList() {
  const list = pendingDays();
  if (!list.length) return null;
  return h('div', { class: 'pending-days' },
    h('h3', {}, 'À terminer'),
    ...list.map(p => h('a', { href: `#/today/${p.key}` },
      h('span', {}, `Séance du ${fmtDay(p.key)}`),
      h('span', {}, `${p.left} étape${p.left > 1 ? 's' : ''}`))));
}

export function todayView(root, params) {
  // #/today/<étape> pour aujourd'hui, ou #/today/AAAA-MM-JJ[/<étape>] pour reprendre un jour passé.
  const dayKey = /^\d{4}-\d{2}-\d{2}$/.test(params[0] || '') ? params[0] : null;
  const stepParam = dayKey ? params[1] : params[0];
  const plan = planFor(dayKey);
  if (!plan) { location.hash = '#/today'; return; }
  const dayRec = dayRecord(dayKey);
  const stepper = h('ol', { class: 'stepper' });
  const main = h('div', { class: 'session-main' });
  root.replaceChildren(h('div', { class: 'session' }, h('aside', { class: 'session-side card' },
    h('h2', {}, dayKey ? `Séance du ${fmtDay(dayKey)}` : 'Séance du jour', dayKey ? h('span', { class: 'catchup-badge' }, 'rattrapage') : null),
    h('p', { class: 'muted small' }, `Objectif : ${fmtMin(plan.minutes * 60)}`),
    h('div', { class: 'today-time muted small' }),
    stepper,
    dayKey ? h('p', { class: 'small' }, h('a', { href: '#/today' }, '← Revenir à la séance d’aujourd’hui')) : pendingList()), main));

  const timeEl = root.querySelector('.today-time');
  const tick = () => { const t = today().time; timeEl.textContent = `Temps actif aujourd’hui : ${fmtMin(t.lesson + t.exercise + t.cards)}`; };
  tick();
  document.addEventListener('tick', tick);
  root._cleanup = () => document.removeEventListener('tick', tick);

  let current = stepParam != null ? Number(stepParam) : plan.steps.findIndex(s => !s.done);

  function drawStepper() {
    stepper.replaceChildren(...plan.steps.map((s, i) => {
      const info = stepInfo(s);
      return h('li', { class: `step ${s.done ? 'done' : ''} ${i === current ? 'current' : ''} m-${info.method}` },
        h('button', { type: 'button', onclick: () => go(i) },
          h('span', { class: 'step-ic' }, icon(s.done ? 'check' : info.icon, 16)),
          h('span', { class: 'step-txt' }, h('strong', {}, info.title), h('small', {}, info.desc))));
    }));
  }

  function complete(i) {
    plan.steps[i].done = true;
    store.save();
    const nxt = plan.steps.findIndex(s => !s.done);
    go(nxt);
  }

  function go(i) {
    current = i;
    drawStepper();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (i < 0 || i >= plan.steps.length) return finished();
    runStep(plan.steps[i], i);
  }

  async function runStep(step, i) {
    const info = stepInfo(step);
    const sub = `Étape ${i + 1} / ${plan.steps.length}`;
    if (step.type === 'warmup') {
      runCards(main, warmupCards(), { title: info.title, subtitle: sub, onFinish: () => complete(i), emptyText: 'Aucune ancienne carte à revoir ce matin. On passe directement à la leçon !' });
    } else if (step.type === 'lesson') {
      setMode('lesson');
      const unit = await loadUnit(step.uid);
      const meta = unitMeta(step.uid);
      const lesson = renderLesson(unit, meta);
      main.replaceChildren(h('div', { class: 'eyebrow' }, sub), lesson,
        h('div', { class: 'lesson-end card' },
          h('p', {}, 'Lis bien chaque partie et écoute les exemples. Ensuite, on passe tout de suite à la pratique : c’est elle qui fixe la leçon.'),
          h('button', { class: 'btn primary', onclick: async () => { await markLessonDone(step.uid); complete(i); } }, 'J’ai lu la leçon — aux exercices', icon('arrow', 18))));
      const nav = lessonAnchors(lesson, unit, [['Aux exercices', main.querySelector('.lesson-end')]]);
      if (nav) lesson.before(nav);
    } else if (step.type === 'unit-ex') {
      const ids = await unitExercises(step.uid);
      runExercises(main, ids, { title: info.title, subtitle: sub, onFinish: ({ right, total }) => { markUnitExercises(step.uid, right, total); complete(i); } });
    } else if (step.type === 'review-ex') {
      const ids = reviewExercises(plan);
      if (!ids.length) {
        main.replaceChildren(h('div', { class: 'card done-card' }, h('h2', {}, info.title),
          h('p', {}, 'Pas encore d’exercices anciens à revoir : ils reviendront dans les prochains jours.'),
          h('button', { class: 'btn primary', onclick: () => complete(i) }, 'Continuer', icon('arrow', 18))));
      } else runExercises(main, ids, { title: info.title, subtitle: sub, onFinish: () => complete(i) });
    } else if (step.type === 'listening') {
      main.replaceChildren(h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Préparation des phrases…')));
      const items = await buildListening();
      runListening(main, items, { title: info.title, subtitle: sub, onFinish: () => complete(i) });
    } else if (step.type === 'proverbs') {
      setMode('lesson');
      const ids = introduceProverbs(dayRec);
      const d = dayRec;
      const list = getProverbs().slice(d.proverbsFrom, store.state.proverbsIntroduced);
      if (!list.length) {
        main.replaceChildren(h('div', { class: 'card done-card' }, h('p', {}, 'Tu as découvert les 150 proverbes ! Ils reviennent maintenant en révision.'),
          h('button', { class: 'btn primary', onclick: () => complete(i) }, 'Continuer', icon('arrow', 18))));
        return;
      }
      main.replaceChildren(h('div', { class: 'eyebrow' }, sub), h('h1', {}, info.title),
        h('p', { class: 'muted' }, 'Lis chaque proverbe à voix haute avec la voix anglaise, puis passe aux cartes.'),
        ...list.map(p => h('section', { class: 'card proverb' },
          h('div', { class: 'eyebrow' }, `N° ${p.n}`),
          h('blockquote', {}, speakBtn(p.en), h('span', {}, p.en)),
          h('p', { class: 'flash-fr' }, p.fr),
          h('p', {}, p.meaning),
          p.example ? h('p', { class: 'flash-ex' }, speakBtn(p.example), h('span', { html: rich(p.example) })) : null)),
        h('button', { class: 'btn primary', onclick: () => runCards(main, ids, { title: 'Cartes : proverbes', subtitle: sub, onFinish: () => complete(i) }) }, 'Passer aux cartes', icon('arrow', 18)));
    } else if (step.type === 'cards') {
      runCards(main, remainingCards(), { title: info.title, subtitle: sub, onFinish: () => complete(i), emptyText: 'Toutes les cartes du jour sont révisées.' });
    }
  }

  function finished() {
    setMode(null);
    confetti(1.4);
    if (dayKey) {
      main.replaceChildren(h('div', { class: 'card done-card big' },
        h('div', { class: 'big-score good' }, icon('star', 40)),
        h('h1', {}, 'Séance rattrapée !'),
        h('p', {}, `La séance du ${fmtDay(dayKey)} est maintenant terminée. Le temps passé compte pour aujourd’hui.`),
        h('div', { class: 'row-actions' },
          h('a', { class: 'btn primary', href: '#/today' }, icon('play', 18), 'Séance d’aujourd’hui'),
          h('a', { class: 'btn ghost', href: '#/' }, 'Tableau de bord'))));
      return;
    }
    const t = today().time, total = t.lesson + t.exercise + t.cards;
    const goal = plan.minutes * 60;
    main.replaceChildren(h('div', { class: 'card done-card big' },
      h('div', { class: 'big-score good' }, icon('star', 40)),
      h('h1', {}, 'Séance terminée !'),
      h('p', {}, `Temps actif aujourd’hui : ${fmtMin(total)} sur ${fmtMin(goal)}.`),
      total < goal ? h('p', { class: 'muted' }, 'Il te reste du temps : continue avec des révisions libres ou étudie une unité supplémentaire dans la bibliothèque.') : h('p', { class: 'muted' }, 'Objectif atteint. Reviens demain : la régularité compte plus que la quantité.'),
      h('div', { class: 'row-actions' },
        h('a', { class: 'btn primary', href: '#/review' }, icon('cards', 18), 'Révisions libres'),
        h('a', { class: 'btn amber', href: '#/library' }, icon('book', 18), 'Bibliothèque'),
        h('a', { class: 'btn ghost', href: '#/' }, 'Tableau de bord'))));
  }

  go(current);
}
