// Section « Accent tonique » : règles, exceptions, écoute des mots et quiz sur la syllabe accentuée.
import { h, icon, rich, setMode, anchorNav } from '../ui.js';
import { store, today } from '../store.js';
import { speakWord, cheer } from '../tts.js';
import { frBlock, pickPraise, pickComfort, sayEnd } from '../components.js';
import { confetti, pulse } from '../fx.js';
import { STRESS_INTRO, STRESS_RULES, parseWord, sayOf, quizWords } from '../stress-data.js';

const QUIZ_SIZE = 12;
const DAILY_WORDS = 10;
const scores = () => (store.state.stress = store.state.stress || {});
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Mot affiché syllabe par syllabe, la syllabe accentuée mise en évidence.
function wordLabel(w) {
  return h('span', { class: 'st-syl' }, ...parseWord(w[0]).flatMap(s => [
    h('span', { class: s.on ? 'st-on' : '' }, s.text),
    s.sep === '-' ? h('span', { class: 'st-dot' }, '·') : s.sep === ' ' ? ' ' : null,
  ]));
}

function wordChip(w) {
  const say = sayOf(w);
  const inner = [wordLabel(w), h('small', {}, w[1])];
  if (!say) return h('div', { class: 'st-word no-audio' }, ...inner);
  return h('button', { type: 'button', class: 'st-word', title: 'Écouter', onclick: () => speakWord(say, w[3], 0.85) }, ...inner, h('span', { class: 'st-sound' }, icon('sound', 14)));
}

const words = list => h('div', { class: 'st-words' }, list.map(wordChip));

function ruleSection(rule, n) {
  const qs = quizWords(rule);
  const best = scores()[rule.id]?.best;
  return h('section', { class: 'card st-rule', id: `st-${rule.id}` },
    h('div', { class: 'eyebrow' }, `Règle ${n}`),
    h('h2', {}, rule.title),
    h('p', { class: 'st-title-fr' }, rule.titleFr),
    h('p', { html: rich(rule.en) }),
    frBlock(rule.fr, 'En français'),
    ...(rule.groups || []).map(g => h('div', { class: 'st-group' }, h('h3', {}, g.label), words(g.words))),
    rule.pairs ? h('div', { class: 'st-group' },
      h('div', { class: 'st-pairs' },
        h('h3', {}, rule.pairLabels?.[0] || (rule.id === 'numbers' ? '-teen' : 'Nom')),
        h('h3', {}, rule.pairLabels?.[1] || (rule.id === 'numbers' ? '-ty' : 'Verbe')),
        ...rule.pairs.flat().map(wordChip))) : null,
    ...(rule.exceptions || []).map(e => h('div', { class: 'st-group st-exc' },
      h('h3', {}, h('span', { class: 'st-exc-tag' }, 'Exceptions'), e.label), words(e.words))),
    rule.tip ? h('p', { class: 'st-tip', html: rich(rule.tip) }) : null,
    qs.length ? h('div', { class: 'row-actions' },
      h('a', { class: 'btn ghost', href: `#/stress/quiz/${rule.id}` }, icon('target', 18), 'M’entraîner sur cette règle'),
      best != null ? h('span', { class: 'muted small' }, `Meilleur score : ${best} %`) : null) : null);
}

function overview(root) {
  const sections = STRESS_RULES.map((r, i) => ruleSection(r, i + 1));
  const intro = h('section', { class: 'card st-intro' },
    h('h2', {}, icon('sound', 18), 'What is word stress?'),
    h('p', { html: rich(STRESS_INTRO.en) }),
    h('div', { class: 'st-words' }, wordChip(['ba-NA-na', 'une banane'])),
    frBlock(STRESS_INTRO.fr, 'En français'),
    h('p', { class: 'st-tip', html: rich(STRESS_INTRO.method) }),
    h('div', { class: 'row-actions' },
      h('a', { class: 'btn primary', href: '#/stress/quiz/all' }, icon('target', 18), 'Test général', icon('arrow', 18)),
      scores().all?.best != null ? h('span', { class: 'muted small' }, `Meilleur score : ${scores().all.best} %`) : null));
  const nav = anchorNav([['Introduction', intro], ...STRESS_RULES.map((r, i) => [r.short, sections[i]])], { label: 'Règles' });
  root.replaceChildren(
    h('h1', { class: 'page-title' }, 'Accent tonique'),
    h('p', { class: 'muted' }, 'Sur quelle syllabe appuyer ? Les règles, leurs exceptions, et un entraînement à l’oreille.'),
    nav, intro, ...sections);
}

// Mots de la séance du jour : d'abord ceux ratés la dernière fois, puis les nouveaux, puis les plus anciens.
export function dailyStressWords(n = DAILY_WORDS) {
  const seen = new Set();
  const pool = STRESS_RULES.flatMap(quizWords).filter(q => !seen.has(q.w[0]) && seen.add(q.w[0]));
  const stats = store.state.stressWords || {};
  const rank = q => { const st = stats[q.w[0]]; return !st ? 1 : st.ok ? 2 : 0; };
  const last = q => stats[q.w[0]]?.last || 0;
  return shuffle(shuffle(pool).sort((a, b) => rank(a) - rank(b) || last(a) - last(b)).slice(0, n));
}

function recordWord(w, ok) {
  const stats = store.state.stressWords || (store.state.stressWords = {});
  stats[w[0]] = { ok, last: Date.now() };
}

// Série « trouve la syllabe accentuée ». Les erreurs reviennent une fois à la fin.
// listenFirst : le mot peut être écouté avant de répondre (entraînement à l'oreille).
export function runStressQuiz(root, items, { title, subtitle = '', listenFirst = true, onFinish, onDone, restart, back } = {}) {
  const queue = items.map(q => ({ ...q, retry: false }));
  const total = queue.length;
  let right = 0, done = 0;
  setMode('exercise');

  const stage = h('div', { class: 'st-stage' });
  const bar = h('div', { class: 'progress' }, h('span'));
  const count = h('span', { class: 'runner-count' });
  root.replaceChildren(...[
    back ? h('a', { class: 'back', href: back[0] }, icon('back', 16), back[1]) : null,
    subtitle ? h('div', { class: 'eyebrow' }, subtitle) : null,
    h('div', { class: 'runner-head' }, h('h2', {}, title), count),
    bar, stage].filter(Boolean));

  let keys = null;
  const onKey = e => {
    if (!stage.isConnected) return document.removeEventListener('keydown', onKey);
    if (!e.ctrlKey && !e.metaKey && !e.altKey) keys?.(e);
  };
  document.addEventListener('keydown', onKey);

  function next() {
    bar.firstChild.style.width = `${(done / total) * 100}%`;
    if (!queue.length) return finish();
    const q = queue.shift();
    count.textContent = `${Math.min(done + 1, total)} / ${total}`;
    const syl = parseWord(q.w[0]);
    const say = sayOf(q.w);
    const listen = () => speakWord(say, q.w[3], 0.85);
    const speakIt = () => h('button', { class: 'speak', type: 'button', title: 'Écouter', 'aria-label': 'Écouter', onclick: listen }, icon('sound', 18));
    const feedback = h('div', { class: 'feedback', 'aria-live': 'polite' });
    const actions = h('div', { class: 'ex-actions' });
    let answered = false;
    const box = h('div', { class: 'card exercise' + (q.retry ? ' retry' : '') });
    const opts = h('div', { class: 'st-choices' });
    const answer = i => {
      if (answered) return;
      answered = true;
      const ok = syl[i].on;
      opts.querySelectorAll('button').forEach((b, j) => { b.disabled = true; if (syl[j].on) b.classList.add('right'); });
      if (!ok) opts.children[i].classList.add('wrong');
      box.classList.add(ok ? 'is-right' : 'is-wrong');
      pulse(box, ok ? 'pop' : 'shake');
      if (!q.retry) {
        const d = today();
        if (ok) { right++; d.right++; } else d.wrong++;
        recordWord(q.w, ok);
        store.save();
        done++;
        if (!ok) queue.push({ ...q, retry: true });
      }
      const msg = ok ? pickPraise() : pickComfort();
      feedback.replaceChildren(
        h('div', { class: 'fb-title' }, icon(ok ? 'check' : 'x', 20), msg),
        h('div', { class: 'fb-sentence' }, speakIt(), wordLabel(q.w), h('span', { class: 'muted' }, ` — ${q.w[1]}`)),
        h('div', { class: 'fb-why' }, q.exception ? h('strong', {}, 'Exception : ') : null, q.why));
      const nextBtn = h('button', { class: 'btn primary', onclick: next }, 'Suivant', icon('arrow', 18));
      actions.replaceChildren(nextBtn);
      nextBtn.focus();
      keys = null;
      // Le compliment d'abord, puis le mot correctement accentué.
      cheer(msg, { soft: !ok }, listen);
    };
    syl.forEach((s, i) => opts.append(h('button', { type: 'button', class: 'option st-choice', onclick: () => answer(i) }, h('span', { class: 'key' }, String(i + 1)), s.text)));
    keys = e => { const n = Number(e.key); if (n >= 1 && n <= syl.length) answer(n - 1); };
    if (q.retry) box.append(h('div', { class: 'retry-badge' }, 'Deuxième essai — tu l’avais manqué'));
    box.append(
      h('p', { class: 'ex-instr' }, listenFirst ? 'Listen if you like, then choose the stressed syllable.' : 'Choose the syllable to stress, then listen to the word.'),
      h('p', { class: 'ex-instr-fr' }, listenFirst ? 'Écoute si tu veux, puis choisis la syllabe accentuée.' : 'Choisis la syllabe à accentuer, puis écoute le mot.'),
      h('p', { class: 'st-q' }, listenFirst ? speakIt() : null, h('span', {}, say), h('small', { class: 'muted' }, q.w[1].split(' · ')[0])),
      opts, feedback, actions);
    stage.replaceChildren(box);
    window.scrollTo(0, 0);
  }

  function finish() {
    keys = null;
    bar.firstChild.style.width = '100%';
    count.textContent = `${total} / ${total}`;
    const pct = total ? Math.round((right / total) * 100) : 100;
    onDone?.(pct);
    store.save();
    if (pct >= 80) confetti(pct === 100 ? 1.2 : 0.7);
    stage.replaceChildren(h('div', { class: 'card done-card' },
      h('div', { class: 'big-score' + (pct >= 80 ? ' good' : pct >= 50 ? ' mid' : ' low') }, `${pct} %`),
      h('p', { class: 'end-praise' }, sayEnd(pct)),
      h('p', {}, `${right} bonne${right > 1 ? 's' : ''} réponse${right > 1 ? 's' : ''} du premier coup sur ${total}.`),
      h('div', { class: 'row-actions' },
        onFinish ? h('button', { class: 'btn primary', onclick: onFinish }, 'Continuer', icon('arrow', 18)) : null,
        restart ? h('button', { class: 'btn primary', onclick: restart }, icon('target', 18), 'Recommencer') : null,
        h('a', { class: 'btn ghost', href: '#/stress' }, 'Revoir les règles'))));
  }
  next();
}

function quiz(root, id) {
  const rule = STRESS_RULES.find(r => r.id === id);
  if (id !== 'all' && !rule) { location.hash = '#/stress'; return; }
  const pool = id === 'all' ? STRESS_RULES.flatMap(quizWords) : quizWords(rule);
  runStressQuiz(root, shuffle(pool).slice(0, QUIZ_SIZE), {
    title: rule ? rule.titleFr : 'Test général',
    back: ['#/stress', 'Accent tonique'],
    restart: () => quiz(root, id),
    onDone: pct => { const s = scores(); s[id] = { best: Math.max(pct, s[id]?.best ?? 0), last: pct }; },
  });
}

export function stressView(root, params) {
  if (params[0] === 'quiz') return quiz(root, params[1]);
  setMode('lesson');
  overview(root);
}
