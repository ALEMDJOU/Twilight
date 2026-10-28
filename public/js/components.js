// Composants d'apprentissage : leçon, série d'exercices, série de flashcards.
import { h, rich, icon, speakBtn, toast, setMode, anchorNav } from './ui.js';
import { store, today } from './store.js';
import { isCorrect, isNearMiss, normalize } from './check.js';
import { grade, gradeExercise, preview, addItem, getItem, intervalLabel, AGAIN, HARD, GOOD, EASY } from './srs.js';
import { cardData, exerciseData, unitCached, unitMeta, photoFor, glossaryFor, ILLUSTRATED } from './content.js';
import { sceneFor, sceneSVG } from './scenes.js';
import { speak } from './tts.js';
import { confetti, pulse } from './fx.js';

const frOn = () => store.state.settings.showFr;

function frBlock(text, label = 'Aide en français') {
  if (!text) return null;
  return h('details', { class: 'fr-help', open: frOn() || null },
    h('summary', {}, h('span', { class: 'flag' }, 'FR'), label),
    h('div', { class: 'fr-body', html: rich(text) }));
}

/* ======================= Leçon ======================= */
// Barre d'ancrages d'une leçon rendue par renderLesson (+ éléments supplémentaires : cartes, exercices…).
export function lessonAnchors(lessonEl, unit, extra = []) {
  const secs = [...lessonEl.querySelectorAll('.lesson-sec')];
  const short = t => (t || '').length > 26 ? t.slice(0, 24).trim() + '…' : t;
  const entries = secs.map((el, i) => {
    const s = unit.sections?.[i] || {};
    return [s.id ? `${s.id} · ${short(s.title)}` : short(s.title) || `Partie ${i + 1}`, el];
  });
  entries.push(['Images', lessonEl.querySelector('.gallery')?.closest('section')]);
  entries.push(['À retenir', lessonEl.querySelector('.remember')]);
  return anchorNav([...entries, ...extra], { label: 'Leçon' });
}

export function renderLesson(unit, meta) {
  const wrap = h('article', { class: 'lesson' });
  wrap.append(h('header', { class: 'lesson-head' },
    h('div', { class: 'eyebrow' }, `${meta.book.title} · Unité ${meta.n}`),
    h('h1', {}, meta.title),
    unit.titleFr ? h('p', { class: 'lesson-fr-title' }, unit.titleFr) : null,
  ));
  if (unit.goal) wrap.append(h('p', { class: 'lesson-goal' }, icon('target', 18), h('span', { html: rich(unit.goal) })));

  for (const s of unit.sections || []) {
    const sec = h('section', { class: 'lesson-sec card' });
    sec.append(h('h2', {}, s.id ? h('span', { class: 'sec-id' }, s.id) : null, s.title || ''));
    if (s.en) sec.append(h('div', { class: 'lesson-text', html: rich(s.en) }));
    if (s.table) sec.append(renderTable(s.table));
    if (s.examples?.length) {
      const ul = h('ul', { class: 'examples' });
      for (const ex of s.examples) {
        ul.append(h('li', {},
          speakBtn(ex.en),
          h('div', {},
            h('div', { class: 'ex-en', html: rich(ex.en) }),
            ex.note ? h('div', { class: 'ex-note' }, ex.note) : null,
            ex.fr ? h('div', { class: 'ex-fr' }, ex.fr) : null)));
      }
      sec.append(ul);
    }
    if (s.tip) sec.append(h('div', { class: 'tip' }, icon('bulb', 18), h('div', { html: rich(s.tip) })));
    sec.append(frBlock(s.fr));
    wrap.append(sec);
  }

  if (unit.book !== 'grammar') wrap.append(gallery(unit));
  if (unit.remember?.length) {
    wrap.append(h('section', { class: 'card remember' },
      h('h2', {}, icon('star', 18), 'À retenir'),
      h('ul', {}, unit.remember.map(r => h('li', { html: rich(r) })))));
  }
  return wrap;
}

export function photoEl(p, small = false) {
  return h('figure', { class: 'photo' + (small ? ' small' : '') },
    h('img', { src: p.src, alt: '', loading: 'lazy', decoding: 'async' }),
    h('figcaption', { title: p.source }, '© ', p.credit));
}

// Galerie « Vocabulaire en images » à la fin des leçons de vocabulaire.
const BOOK_CODES = { grammar: 'g', vocab_int: 'vi', vocab_adv: 'va', collocations: 'co', idioms: 'id', idioms_pv: 'ip' };

function gallery(unit) {
  const drawn = ILLUSTRATED.has(BOOK_CODES[unit.book]);
  const items = (unit.cards || []).filter(c => !c.q).map(c => {
    const p = photoFor(c);
    return { c, p, s: drawn && !p ? sceneFor(`${c.en} ${c.def || ''}`) : null };
  }).filter(x => x.p || x.s || x.c.pic);
  if (items.length < 3) return null;
  return h('section', { class: 'card' }, h('h2', {}, icon('star', 18), drawn ? 'Expressions en images' : 'Vocabulaire en images'),
    h('div', { class: 'gallery' }, items.map(({ c, p, s }) => h('button', { class: 'g-item', type: 'button', onclick: () => speak(c.en) },
      p ? h('img', { src: p.src, alt: '', loading: 'lazy', title: '© ' + p.credit })
        : s ? h('span', { class: 'g-scene', html: sceneSVG(s) }) : h('span', { class: 'g-pic' }, c.pic),
      h('strong', {}, c.en), h('small', {}, c.fr)))));
}

// Petit glossaire français des collocations / idiomes présents dans le texte d'un exercice.
function glossBox(uid, texts, title = 'Vocabulaire', extra = []) {
  if (!ILLUSTRATED.has(unitMeta(uid)?.book?.code)) return null;
  // Traductions écrites pour l'exercice (champ gloss) + celles trouvées automatiquement dans les cartes.
  const g = (extra || []).map(([en, fr]) => ({ en, fr }));
  for (const x of glossaryFor(uid, texts)) if (!g.some(y => y.en.toLowerCase() === x.en.toLowerCase())) g.push(x);
  if (!g.length) return null;
  return h('div', { class: 'gloss' }, h('span', { class: 'gloss-title' }, icon('book', 14), title),
    ...g.map(x => h('span', { class: 'gloss-item' }, h('strong', {}, x.en), ' — ', x.fr)));
}

function renderTable(t) {
  return h('div', { class: 'table-wrap' }, h('table', {},
    t.head ? h('thead', {}, h('tr', {}, t.head.map(c => h('th', { html: rich(c) })))) : null,
    h('tbody', {}, t.rows.map(r => h('tr', {}, r.map(c => h('td', { html: rich(c) })))))));
}

/* ======================= Exercices ======================= */
// Lance une série d'exercices. Chaque erreur revient une fois à la fin de la série
// et l'exercice est replanifié (répétition espacée). Résolve avec { right, total }.
export function runExercises(root, ids, { title = 'Exercices', subtitle = '', onFinish } = {}) {
  setMode('exercise');
  const queue = ids.map(id => ({ id, retry: false }));
  const total = ids.length;
  let done = 0, right = 0;
  const results = {};

  const head = h('div', { class: 'runner-head' },
    h('div', {}, h('div', { class: 'eyebrow' }, subtitle), h('h2', {}, title)),
    h('div', { class: 'runner-count' }));
  const bar = h('div', { class: 'progress' }, h('span'));
  const stage = h('div', { class: 'stage' });
  root.replaceChildren(head, bar, stage);

  function updateHead() {
    head.querySelector('.runner-count').textContent = `${Math.min(done + 1, total)} / ${total}`;
    bar.firstChild.style.width = `${(done / Math.max(total, 1)) * 100}%`;
  }

  let lastUid = null;
  function next() {
    if (!queue.length) return finish();
    updateHead();
    const { id, retry } = queue[0];
    const ex = exerciseData(id);
    if (!ex) { queue.shift(); return next(); }
    // Petit résumé de la leçon avant de s'exercer, à chaque fois qu'on change d'unité.
    if (ex.uid !== 'p' && ex.uid !== lastUid) {
      lastUid = ex.uid;
      const recap = renderRecap(ex.uid, () => next());
      if (recap) return stage.replaceChildren(recap);
    }
    queue.shift();
    stage.replaceChildren(renderExercise(ex, retry, ok => {
      if (!retry) {
        results[id] = ok;
        gradeExercise(id, ok);
        const d = today();
        ok ? d.right++ : d.wrong++;
        if (ok) right++;
        done++;
        if (!ok) queue.splice(Math.min(queue.length, 3), 0, { id, retry: true });
        store.save();
      }
    }, next));
  }

  function finish() {
    bar.firstChild.style.width = '100%';
    const pct = total ? Math.round((right / total) * 100) : 100;
    if (pct >= 80) confetti(pct === 100 ? 1.2 : 0.7);
    stage.replaceChildren(h('div', { class: 'card done-card' },
      h('div', { class: 'big-score' + (pct >= 80 ? ' good' : pct >= 50 ? ' mid' : ' low') }, `${pct} %`),
      h('p', { class: 'end-praise' }, endPraise(pct)),
      h('p', {}, `${right} bonne${right > 1 ? 's' : ''} réponse${right > 1 ? 's' : ''} du premier coup sur ${total}.`),
      h('p', { class: 'muted' }, pct >= 80 ? 'Excellent ! Ces exercices reviendront dans quelques jours pour bien les ancrer.' : 'Les exercices ratés reviendront dès demain : c’est en se trompant puis en corrigeant qu’on retient le mieux.'),
      onFinish ? h('button', { class: 'btn primary', onclick: () => onFinish({ right, total, results }) }, 'Continuer', icon('arrow', 18)) : null));
  }
  next();
}

/* ---------- Rappel de leçon ---------- */
function recapPoints(unit) {
  if (unit.remember?.length) return unit.remember;
  return (unit.sections || []).map(s => `**${s.title}**`);
}

export function renderRecap(uid, onGo) {
  const unit = unitCached(uid);
  if (!unit) return null;
  const meta = unitMeta(uid);
  const box = h('div', { class: 'card recap' },
    h('div', { class: 'eyebrow' }, `Rappel de la leçon · ${meta.book.short} · Unité ${meta.n}`),
    h('h2', {}, icon('bulb', 20), meta.title),
    unit.titleFr ? h('p', { class: 'lesson-fr-title' }, unit.titleFr) : null,
    h('ul', {}, recapPoints(unit).map(r => h('li', { html: rich(r) }))),
    h('div', { class: 'recap-sections' }, (unit.sections || []).map(s => h('details', {},
      h('summary', {}, s.id ? `${s.id} — ${s.title}` : s.title),
      s.en ? h('div', { class: 'lesson-text', html: rich(s.en) }) : null,
      s.examples?.length ? h('ul', { class: 'examples' }, s.examples.slice(0, 3).map(e => h('li', {}, speakBtn(e.en), h('div', {}, h('div', { class: 'ex-en', html: rich(e.en) }), e.note ? h('div', { class: 'ex-note' }, e.note) : null)))) : null))),
    h('button', { class: 'btn primary', onclick: onGo }, 'C’est clair, aux exercices', icon('arrow', 18)));
  setTimeout(() => box.querySelector('.btn.primary')?.focus({ preventScroll: true }), 50);
  return box;
}

function inlineRecap(uid) {
  const unit = unitCached(uid);
  if (!unit) return null;
  let open = null;
  const btn = h('button', { class: 'recap-btn', type: 'button', onclick: () => {
    if (open) { open.remove(); open = null; return; }
    open = h('div', { class: 'recap-inline' }, h('strong', {}, 'Rappel'), h('ul', {}, recapPoints(unit).map(r => h('li', { html: rich(r) }))));
    btn.closest('.exercise').querySelector('.ex-body').before(open);
  } }, icon('bulb', 15), 'Rappel');
  return btn;
}

function fullSentence(ex) {
  const acc = normAnswers(ex);
  if (ex.t === 'gap') {
    let i = 0;
    return ex.q.replace(/_{3,}/g, () => (acc[i++] || [''])[0]);
  }
  if (ex.t === 'mcq') return ex.say || null;
  if (ex.t === 'order') return acc[0][0];
  if (ex.t === 'write' || ex.t === 'fix') return acc[0][0];
  return null;
}

function normAnswers(ex) {
  if (ex.t === 'gap') return Array.isArray(ex.a[0]) ? ex.a : [ex.a];
  if (ex.t === 'order' || ex.t === 'write' || ex.t === 'fix') return [Array.isArray(ex.a) ? ex.a : [ex.a]];
  return [];
}

export function renderExercise(ex, retry, onResult, onNext) {
  const box = h('div', { class: 'card exercise' + (retry ? ' retry' : '') });
  if (retry) box.append(h('div', { class: 'retry-badge' }, 'Deuxième essai — tu l’avais manqué'));
  box.append(h('div', { class: 'ex-top' }, h('div', { class: 'ex-source' }, ex.source), ex.uid !== 'p' ? inlineRecap(ex.uid) : null));
  box.append(h('p', { class: 'ex-instr' }, ex.instr || defaultInstr(ex.t)),
    ex.instrFr && frOn() ? h('p', { class: 'ex-instr-fr' }, ex.instrFr) : null);
  if (ex.ctx) box.append(h('p', { class: 'ex-ctx', html: rich(ex.ctx) }));

  const feedback = h('div', { class: 'feedback', 'aria-live': 'polite' });
  const actions = h('div', { class: 'ex-actions' });
  let answered = false;

  const conclude = (ok, near) => {
    if (answered) return;
    answered = true;
    onResult(ok);
    box.classList.add(ok ? 'is-right' : 'is-wrong');
    pulse(box, ok ? 'pop' : 'shake');
    const sentence = fullSentence(ex);
    feedback.replaceChildren(
      h('div', { class: 'fb-title' }, icon(ok ? 'check' : 'x', 20), ok ? (near ? `${pickPraise()} (attention à l’orthographe)` : pickPraise()) : pickComfort()),
      !ok || near ? correctAnswer(ex) : null,
      sentence ? h('div', { class: 'fb-sentence' }, speakBtn(sentence), h('span', { html: rich(sentence) })) : null,
      ex.why ? h('div', { class: 'fb-why', html: rich(ex.why) }) : null,
      glossBox(ex.uid, [sentence, ...normAnswers(ex).map(x => x[0]), ex.t === 'mcq' ? ex.o[ex.a] : null, ex.why], 'Traductions'),
      ex.fr ? frBlock(ex.fr, 'Explication en français') : null);
    const nextBtn = h('button', { class: 'btn primary', onclick: onNext }, 'Suivant', icon('arrow', 18));
    actions.replaceChildren(nextBtn);
    nextBtn.focus();
    if (store.state.settings.autoSpeak && sentence) speak(sentence);
  };

  const body = h('div', { class: 'ex-body' });
  if (ex.t === 'mcq') {
    body.append(h('p', { class: 'ex-q', html: rich(ex.q) }));
    const opts = h('div', { class: 'options' });
    ex.o.forEach((o, i) => {
      const b = h('button', { class: 'option', type: 'button', onclick: () => {
        if (answered) return;
        opts.querySelectorAll('.option').forEach((x, j) => { if (j === ex.a) x.classList.add('right'); });
        if (i !== ex.a) b.classList.add('wrong');
        conclude(i === ex.a);
      } }, h('span', { class: 'key' }, String(i + 1)), h('span', { html: rich(o) }));
      opts.append(b);
    });
    body.append(opts);
    box._keys = e => { const n = Number(e.key); if (n >= 1 && n <= ex.o.length) opts.children[n - 1].click(); };
  } else if (ex.t === 'gap') {
    const acc = normAnswers(ex);
    const p = h('p', { class: 'ex-q gap-q' });
    const parts = ex.q.split(/_{3,}/);
    const inputs = [];
    parts.forEach((part, i) => {
      p.append(h('span', { html: rich(part) }));
      if (i < parts.length - 1) {
        const inp = h('input', { class: 'gap-input', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': `Trou ${i + 1}`, size: Math.max(6, Math.min(28, (acc[i]?.[0] || '').length + 2)) });
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); check(); } });
        inputs.push(inp); p.append(inp);
      }
    });
    if (ex.hint) p.append(h('span', { class: 'hint' }, ` (${ex.hint})`));
    body.append(p);
    const check = () => {
      if (answered) return;
      if (inputs.some(i => !i.value.trim())) { inputs.find(i => !i.value.trim()).focus(); return; }
      let ok = true, near = false;
      inputs.forEach((inp, i) => {
        const good = isCorrect(inp.value, acc[i]);
        const almost = !good && isNearMiss(inp.value, acc[i]);
        inp.classList.add(good || almost ? 'right' : 'wrong');
        inp.disabled = true;
        if (!good && !almost) ok = false;
        if (almost) near = true;
      });
      conclude(ok, near);
    };
    actions.append(h('button', { class: 'btn primary', onclick: check }, 'Vérifier'));
    setTimeout(() => inputs[0]?.focus(), 30);
  } else if (ex.t === 'write' || ex.t === 'fix') {
    body.append(h('p', { class: 'ex-q' + (ex.t === 'fix' ? ' fix-q' : ''), html: rich(ex.q) }));
    if (ex.hint) body.append(h('p', { class: 'hint' }, ex.hint));
    const inp = h('input', { class: 'write-input', type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: ex.t === 'fix' ? 'Écris la phrase corrigée…' : 'Écris ta réponse…' });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); check(); } });
    body.append(inp);
    // Réponses acceptées : celles du livre + les variantes que tu as validées toi-même.
    const variants = (store.state.settings.acceptedVariants ||= {});
    const acc = [...normAnswers(ex)[0], ...(variants[ex.id] || [])];
    let checking = false;
    const check = async () => {
      if (answered || checking || !inp.value.trim()) return;
      const good = isCorrect(inp.value, acc), almost = !good && ex.t !== 'fix' && isNearMiss(inp.value, acc);
      if (good || almost) { inp.classList.add('right'); inp.disabled = true; return conclude(true, almost); }
      // Pas dans la liste : si la phrase est grammaticalement juste et très proche d'une réponse attendue,
      // c'est peut-être une variante correcte — c'est toi qui tranches.
      inp.disabled = true; checking = true;
      const v = await variantCheck(inp.value, acc);
      checking = false;
      if (v) {
        inp.classList.add('maybe');
        feedback.replaceChildren(h('div', { class: 'variant-box' },
          h('div', { class: 'fb-title' }, icon('bulb', 20), 'Variante possible'),
          h('p', {}, 'Ta phrase n’est pas dans les réponses du livre, mais elle est proche de la réponse attendue et le correcteur n’y trouve aucune faute.'),
          h('p', { class: 'small muted' }, 'Réponse attendue :'), h('p', { class: 'variant-expected', html: rich(v.best) }),
          h('p', { class: 'small muted' }, 'Le sens et le temps sont-ils les mêmes ?'),
          h('div', { class: 'row-actions' },
            h('button', { class: 'btn primary', type: 'button', onclick: () => {
              (variants[ex.id] ||= []).push(inp.value.trim()); store.save();
              inp.classList.remove('maybe'); inp.classList.add('right'); feedback.replaceChildren(); conclude(true, false);
              feedback.prepend(h('p', { class: 'small muted' }, 'Variante enregistrée : elle sera acceptée la prochaine fois.'));
            } }, icon('check', 18), 'Oui, ma réponse est correcte'),
            h('button', { class: 'btn ghost', type: 'button', onclick: () => {
              inp.classList.remove('maybe'); inp.classList.add('wrong'); feedback.replaceChildren(); conclude(false, false);
            } }, 'Non, je me suis trompé'))));
        actions.replaceChildren();
        return;
      }
      inp.classList.add('wrong');
      conclude(false, false);
      // Réponse fausse : le correcteur hors ligne explique les fautes de grammaire de TA phrase.
      if (inp.value.trim().split(/\s+/).length >= 3) grammarHelp(inp.value, feedback);
    };
    actions.append(h('button', { class: 'btn primary', onclick: check }, 'Vérifier'));
    setTimeout(() => inp.focus(), 30);
  } else if (ex.t === 'order') {
    const target = normAnswers(ex)[0];
    const words = ex.words || target[0].replace(/[.?!]$/, '').split(' ');
    const shuffled = shuffle(words.map((w, i) => ({ w, i })));
    const line = h('div', { class: 'order-line', 'aria-label': 'Ta phrase' });
    const pool = h('div', { class: 'order-pool' });
    const chosen = [];
    const redraw = () => {
      line.replaceChildren(...chosen.map((c, k) => h('button', { class: 'chip on', type: 'button', onclick: () => { if (answered) return; chosen.splice(k, 1); redraw(); } }, c.w)));
      pool.replaceChildren(...shuffled.map(c => h('button', { class: 'chip', type: 'button', disabled: chosen.includes(c) || null, onclick: () => { if (answered) return; chosen.push(c); redraw(); } }, c.w)));
    };
    if (ex.q) body.append(h('p', { class: 'ex-q', html: rich(ex.q) }));
    body.append(line, pool); redraw();
    const check = () => {
      if (answered || chosen.length < words.length) return;
      const given = chosen.map(c => c.w).join(' ');
      const strip = s => normalize(s).replace(/[.?!]$/, '');
      const ok = target.some(t => strip(t) === strip(given));
      line.classList.add(ok ? 'right' : 'wrong');
      conclude(ok);
    };
    actions.append(h('button', { class: 'btn primary', onclick: check }, 'Vérifier'));
  } else if (ex.t === 'match') {
    const rights = shuffle(ex.pairs.map(p => p[1]));
    const table = h('div', { class: 'match' });
    const selects = ex.pairs.map(([l]) => {
      const sel = h('select', { class: 'match-sel' }, h('option', { value: '' }, '— choisir —'), rights.map(r => h('option', { value: r }, r)));
      table.append(h('div', { class: 'match-row' }, h('span', { class: 'match-l', html: rich(l) }), sel));
      return sel;
    });
    if (ex.q) body.append(h('p', { class: 'ex-q', html: rich(ex.q) }));
    body.append(table);
    const check = () => {
      if (answered) return;
      if (selects.some(s => !s.value)) { toast('Associe chaque élément avant de vérifier.'); return; }
      let ok = true;
      selects.forEach((s, i) => { const good = s.value === ex.pairs[i][1]; s.classList.add(good ? 'right' : 'wrong'); s.disabled = true; if (!good) ok = false; });
      conclude(ok);
    };
    actions.append(h('button', { class: 'btn primary', onclick: check }, 'Vérifier'));
  }

  // Avant de répondre : traductions des expressions déjà visibles (consigne, options, paires) — jamais la réponse cachée.
  const visible = [ex.q, ex.ctx, ...(ex.t === 'mcq' ? ex.o : []), ...(ex.t === 'match' ? ex.pairs.flat() : [])];
  box.append(body, glossBox(ex.uid, visible, 'Vocabulaire', ex.gloss), feedback, actions);
  return box;
}

function correctAnswer(ex) {
  let txt = '';
  if (ex.t === 'mcq') txt = ex.o[ex.a];
  else if (ex.t === 'gap') txt = normAnswers(ex).map(a => a[0]).join(' … ');
  else if (ex.t === 'match') txt = ex.pairs.map(p => `${p[0]} → ${p[1]}`).join(' · ');
  else txt = normAnswers(ex)[0][0];
  const alts = ex.t === 'gap' && normAnswers(ex).length === 1 && normAnswers(ex)[0].length > 1 ? normAnswers(ex)[0].slice(1) : [];
  return h('div', { class: 'fb-answer' }, h('span', { class: 'muted' }, 'Réponse : '), h('strong', { html: rich(txt) }),
    alts.length ? h('span', { class: 'muted' }, `  (aussi accepté : ${alts.join(' / ')})`) : null);
}

function defaultInstr(t) {
  return { mcq: 'Choose the correct answer.', gap: 'Complete the sentence.', write: 'Write the sentence.', fix: 'Correct the mistake.', order: 'Put the words in the correct order.', match: 'Match the items.' }[t] || '';
}

// Messages d'encouragement en anglais après chaque bonne réponse (et plus forts en série).
const PRAISE = ['Well done!', 'Incredible!', 'Well deserved!', 'You are worth it!', 'Brilliant!', 'Excellent!', 'Fantastic!', 'Great job!', 'Spot on!', 'Superb!', 'You nailed it!', 'Perfect!', 'Keep it up!', 'Outstanding!', 'Amazing work!', 'That’s right!', 'You’re a star!', 'Nicely done!', 'Impressive!', 'Way to go!'];
const COMBO = { 3: 'Three in a row! You’re on fire!', 5: 'Five in a row! Unstoppable!', 8: 'Eight in a row! You are worth it!', 10: 'Ten in a row! Incredible, well deserved!', 15: 'Fifteen in a row! Absolutely brilliant!' };
const COMFORT = ['Not quite — you’ll get it next time!', 'Almost! Mistakes help you learn.', 'Don’t give up, you’re learning!', 'Good try! Look at the answer below.', 'Keep going, you can do it!'];
const pick = a => a[Math.floor(Math.random() * a.length)];
let combo = 0;
// Proximité mot à mot entre la réponse donnée et la plus proche des réponses attendues (0 à 1),
// mesurée dans les deux sens pour pénaliser aussi bien les mots manquants que les mots en trop.
function closeness(given, answer) {
  const w = s => normalize(s).replace(/[,.!?;:"]/g, ' ').split(/\s+/).filter(Boolean);
  const a = w(answer), b = w(given);
  if (!a.length || !b.length) return 0;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  return (2 * dp[0][0]) / (a.length + b.length);
}

async function variantCheck(given, answers) {
  if (given.trim().split(/\s+/).length < 3) return null;
  let best = null, score = 0;
  for (const a of answers) { const c = closeness(given, a); if (c > score) { score = c; best = a; } }
  if (score < 0.75) return null;
  try {
    const { checkText } = await import('./grammar.js');
    const issues = await checkText(given);
    return issues.length ? null : { best, score };
  } catch { return null; }
}

// Analyse grammaticale (Harper, hors ligne) d'une réponse écrite fausse.
async function grammarHelp(text, feedback) {
  const box = h('div', { class: 'gram-help' }, h('p', { class: 'muted small' }, 'Analyse de ta phrase…'));
  feedback.append(box);
  try {
    const { checkText } = await import('./grammar.js');
    const issues = await checkText(text);
    box.replaceChildren(h('div', { class: 'gram-help-title' }, icon('pencil', 16), 'Analyse de ta phrase'),
      issues.length
        ? h('ul', { class: 'gram-list' }, issues.map(it => h('li', {}, h('span', { class: 'gram-kind' }, it.kindFr),
            h('strong', {}, `« ${it.text} » `), h('span', {}, it.message),
            it.suggestions.length ? h('span', { class: 'muted' }, ` → ${it.suggestions.filter(Boolean).join(' / ')}`) : null)))
        : h('p', { class: 'small muted' }, 'Aucune faute de grammaire détectée dans ta phrase : le problème vient plutôt du sens, du temps ou du mot choisi. Compare-la avec la réponse attendue.'));
  } catch { box.remove(); }
}

export function pickPraise() {
  combo++;
  return COMBO[combo] || (combo > 15 && combo % 5 === 0 ? `${combo} in a row! Legendary!` : pick(PRAISE));
}
export function pickComfort() { combo = 0; return pick(COMFORT); }
// Fin de série : message selon le score.
export function endPraise(pct) {
  if (pct === 100) return pick(['Flawless! You are worth it!', 'Perfect score! Incredible!', '100 %! Well deserved!']);
  if (pct >= 80) return pick(['Excellent work! Well deserved!', 'Great session! Keep it up!', 'Brilliant! You’re making real progress!']);
  if (pct >= 50) return pick(['Good effort! You’re getting there!', 'Nice work! Practice makes perfect.', 'Well done for sticking with it!']);
  return pick(['Every mistake is a lesson. Keep going!', 'Don’t give up! Tomorrow will be easier.', 'Brave effort! You’re learning a lot.']);
}

function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ======================= Flashcards ======================= */
// Révision active : on essaie de se souvenir AVANT de retourner la carte, puis on s'auto-évalue.
// Les cartes se révisent par petites séances de 50 au maximum : au-delà, on propose une nouvelle petite séance.
export const CARDS_PER_SESSION = 50;

export function runCards(root, allIds, { title = 'Flashcards', subtitle = '', onFinish, emptyText, part = 1 } = {}) {
  setMode('cards');
  const ids = allIds.slice(0, CARDS_PER_SESSION), rest = allIds.slice(CARDS_PER_SESSION);
  const queue = [...ids];
  const seen = new Set();
  let count = 0;
  const total = ids.length;

  const head = h('div', { class: 'runner-head' },
    h('div', {}, h('div', { class: 'eyebrow' }, allIds.length > CARDS_PER_SESSION || part > 1 ? `${subtitle}${subtitle ? ' · ' : ''}petite séance ${part}` : subtitle), h('h2', {}, title)),
    h('div', { class: 'runner-count' }));
  const bar = h('div', { class: 'progress amber' }, h('span'));
  const stage = h('div', { class: 'stage' });
  root.replaceChildren(head, bar, stage);

  if (!ids.length) {
    stage.append(h('div', { class: 'card done-card' }, h('p', {}, emptyText || 'Aucune carte à revoir pour le moment.'),
      onFinish ? h('button', { class: 'btn primary', onclick: () => onFinish({ count: 0 }) }, 'Continuer', icon('arrow', 18)) : null));
    return;
  }

  function next() {
    const id = queue.shift();
    if (!id) return finish();
    const c = cardData(id);
    if (!c) return next();
    head.querySelector('.runner-count').textContent = `${queue.length + 1} restante${queue.length ? 's' : ''}`;
    bar.firstChild.style.width = `${Math.min(100, (seen.size / Math.max(total, 1)) * 100)}%`;
    stage.replaceChildren(renderCard(c, q => {
      const res = grade(id, q);
      const d = today();
      if (!seen.has(id)) { seen.add(id); res.wasNew ? d.newCards++ : d.reviews++; }
      count++;
      if (q === AGAIN) queue.splice(Math.min(queue.length, 4), 0, id);
      // Production (français → anglais) débloquée quand la reconnaissance est solide.
      if (c.dir === 'c' && res.item.interval >= 4) {
        const rev = id.replace(/^c:/, 'r:');
        if (!getItem(rev)) addItem(rev, 1);
      }
      store.save();
      next();
    }));
  }

  function finish() {
    bar.firstChild.style.width = '100%';
    stage.replaceChildren(h('div', { class: 'card done-card' },
      h('div', { class: 'big-score good' }, icon('check', 36)),
      h('p', {}, `${seen.size} carte${seen.size > 1 ? 's' : ''} révisée${seen.size > 1 ? 's' : ''}${rest.length ? ' : petite séance terminée !' : '.'}`),
      h('p', { class: 'muted' }, rest.length
        ? `Il reste ${rest.length} carte${rest.length > 1 ? 's' : ''}. Fais une pause si tu veux : elles t’attendront.`
        : 'Chaque carte reviendra juste avant que tu ne l’oublies.'),
      h('div', { class: 'row-actions' },
        rest.length ? h('button', { class: 'btn amber', onclick: () => runCards(root, rest, { title, subtitle, onFinish, emptyText, part: part + 1 }) },
          icon('cards', 18), `Nouvelle petite séance (${Math.min(rest.length, CARDS_PER_SESSION)} cartes)`) : null,
        onFinish ? h('button', { class: rest.length ? 'btn ghost' : 'btn primary', onclick: () => onFinish({ count }) }, rest.length ? 'Plus tard, continuer' : 'Continuer', icon('arrow', 18)) : null)));
  }
  next();
}

function renderCard(c, onGrade) {
  const wrap = h('div', { class: 'flash-wrap' });
  const front = h('div', { class: 'card flash-face front', style: { cursor: 'pointer' } });
  const f = c.front;
  front.append(h('div', { class: 'ex-source' }, c.source + (c.dir === 'r' ? ' · production' : '')));
  if (f.photo) front.append(photoEl(f.photo));
  else if (f.scene) front.append(h('div', { class: 'scene', html: sceneSVG(f.scene) }));
  else if (f.pic) front.append(h('div', { class: 'flash-pic', 'aria-hidden': 'true' }, f.pic));
  if (f.kind === 'rev' || f.kind === 'proverb-rev') {
    front.append(h('p', { class: 'flash-prompt' }, f.kind === 'proverb-rev' ? 'Quel est le proverbe anglais ?' : 'Comment dit-on en anglais ?'));
    front.append(h('div', { class: 'flash-main fr' }, f.fr));
    if (f.def) front.append(h('div', { class: 'flash-def' }, f.def));
    if (f.hint) front.append(h('div', { class: 'hint' }, f.hint));
  } else if (f.kind === 'rule') {
    front.append(h('p', { class: 'flash-prompt' }, 'Rappelle-toi :'));
    front.append(h('div', { class: 'flash-main q', html: rich(f.q || f.en) }));
  } else {
    front.append(h('p', { class: 'flash-prompt' }, f.kind === 'proverb' ? 'Que veut dire ce proverbe ?' : 'Que veut dire… ?'));
    front.append(h('div', { class: 'flash-main' }, speakBtn(f.en), h('span', { html: rich(f.en) })));
  }
  front.append(h('p', { class: 'muted small hint-line' }, 'Réponds dans ta tête, puis clique sur la carte pour la retourner.'));

  const b = c.back;
  const back = h('div', { class: 'card flash-face back' },
    h('div', { class: 'ex-source' }, c.source),
    b.photo ? photoEl(b.photo, true) : b.pic ? h('div', { class: 'flash-pic small', 'aria-hidden': 'true' }, b.pic) : null,
    h('div', { class: 'flash-main' }, speakBtn(b.en), h('span', { html: rich(b.en) })),
    b.fr ? h('div', { class: 'flash-fr' }, b.fr) : null,
    b.def ? h('div', { class: 'flash-def', html: rich(b.def) }) : null,
    b.ex ? h('div', { class: 'flash-ex' }, speakBtn(b.ex), h('span', { html: rich(b.ex) })) : null,
    b.note ? h('div', { class: 'tip' }, icon('bulb', 16), h('span', { html: rich(b.note) })) : null);

  const prev = preview(c.id);
  const labels = [['À revoir', 'again'], ['Difficile', 'hard'], ['Bien', 'good'], ['Facile', 'easy']];
  const grades = h('div', { class: 'grades' }, labels.map(([l, cls], q) =>
    h('button', { class: `grade ${cls}`, type: 'button', onclick: () => onGrade(q) },
      h('span', {}, l), h('small', {}, intervalLabel(prev[q])), h('kbd', {}, String(q + 1)))));

  const flip = h('button', { class: 'btn primary wide', onclick: () => show() }, 'Retourner la carte', h('kbd', {}, 'Espace'));
  const controls = h('div', { class: 'flash-controls' }, flip);

  function show() {
    if (wrap.classList.contains('flipped')) return;
    wrap.classList.add('flipped');
    back.removeAttribute('aria-hidden'); front.setAttribute('aria-hidden', 'true');
    controls.replaceChildren(grades);
    if (store.state.settings.autoSpeak) speak(b.en);
  }
  back.setAttribute('aria-hidden', 'true');
  front.addEventListener('click', e => { if (!e.target.closest('button')) show(); });
  wrap.append(h('div', { class: 'flash-3d' }, h('div', { class: 'flash-inner' }, front, back)), controls);
  wrap._keys = e => {
    if (!wrap.classList.contains('flipped')) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); show(); } }
    else { const n = Number(e.key); if (n >= 1 && n <= 4) onGrade(n - 1); }
  };
  return wrap;
}

// Raccourcis clavier : transmis au composant actif (carte ou QCM).
addEventListener('keydown', e => {
  if (e.target.matches('input, textarea, select')) return;
  const el = document.querySelector('.stage > *');
  el?._keys?.(e);
});
