// Écoute, dictée et prononciation — entièrement hors ligne :
// la voix Piper lit des phrases tirées des unités déjà étudiées, Vosk écoute la prononciation.
import { h, icon, setMode, rich } from './ui.js';
import { store, today } from './store.js';
import { loadUnit, unitMeta, unitList } from './content.js';
import { speak } from './tts.js';
import { normalize } from './check.js';
import { confetti, pulse } from './fx.js';
import { pickPraise, pickComfort, endPraise } from './components.js';
import { speechAvailable, listen } from './speech.js';

/* ---------- Phrases ---------- */
const plain = s => String(s).replace(/\*\*|==|~~|\*/g, '').replace(/\s+/g, ' ').replace(/ (['’](s|re|ve|ll|d|m|t))/g, '$1').replace(/ ([,.!?;:])/g, '$1').trim();
// Une bonne phrase à dicter : une vraie phrase (majuscule, point final), sans trou, alternative
// ni crochet, de 4 à 14 mots.
function usable(s) {
  if (!s || /___|…|\.\.\.|\/|\[|\]|\(|\)|^[A-Z]:|\s[A-Z]:\s|«|»/.test(s)) return false;
  if (!/^[A-Z][A-Za-z0-9 ,.'’?!;:-]*[.?!]$/.test(s)) return false;
  const n = s.split(' ').length;
  return n >= 4 && n <= 14;
}

function fillGap(q, a) {
  const groups = Array.isArray(a[0]) ? a : [a];
  let i = 0;
  return q.replace(/_{3,}/g, () => (groups[i++] || [''])[0]);
}

export async function sentencesFrom(uids) {
  const out = [], seen = new Set();
  const add = (text, uid) => {
    const t = plain(text);
    const k = t.toLowerCase();
    if (usable(t) && !seen.has(k)) { seen.add(k); out.push({ text: t, uid }); }
  };
  for (const uid of uids) {
    let u;
    try { u = await loadUnit(uid); } catch { continue; }
    for (const s of u.sections || []) for (const e of s.examples || []) add(e.en, uid);
    for (const c of u.cards || []) { if (c.ex) add(c.ex, uid); if (c.q && c.en && c.en.split(' ').length >= 3) add(c.en, uid); }
    for (const x of u.exercises || []) {
      if (x.t === 'gap' && !/\(/.test(x.q)) add(fillGap(x.q, x.a), uid);
      if ((x.t === 'write' || x.t === 'fix' || x.t === 'order') && Array.isArray(x.a)) add(x.a[0], uid);
    }
  }
  return out;
}

// Unités déjà étudiées (leçon terminée), les plus récentes d'abord.
export function studiedUnits() {
  return Object.entries(store.state.units)
    .filter(([, u]) => u.lessonDone)
    .sort((a, b) => b[1].lessonDone - a[1].lessonDone)
    .map(([id]) => id);
}

const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Prépare une série : dictées, « qu'as-tu entendu ? » et, si le micro et Vosk sont prêts, prononciation.
export async function buildListening({ dictation = 6, choice = 3, speaking = 3, uids = studiedUnits() } = {}) {
  // Rien d'étudié pour l'instant : on prend les premières unités de grammaire disponibles.
  if (!uids.length) uids = unitList('grammar').filter(u => u.available).slice(0, 3).map(u => u.id);
  const pool = shuffle(await sentencesFrom(uids.slice(0, 30)));
  const canSpeak = speaking > 0 && await speechAvailable();
  const items = [];
  const take = () => pool.shift();
  for (let i = 0; i < dictation && pool.length; i++) items.push({ t: 'dictation', ...take() });
  for (let i = 0; i < choice && pool.length >= 3; i++) {
    const target = take();
    const others = shuffle(pool.filter(p => p.text !== target.text)).sort((a, b) => (b.uid === target.uid) - (a.uid === target.uid)).slice(0, 2);
    items.push({ t: 'choice', ...target, options: shuffle([target.text, ...others.map(o => o.text)]) });
  }
  if (canSpeak) for (let i = 0; i < speaking && pool.length; i++) items.push({ t: 'speak', ...take() });
  return shuffle(items);
}

/* ---------- Comparaison mot à mot ---------- */
const toWords = s => normalize(s).replace(/[,.!?;:"]/g, ' ').split(/\s+/).filter(Boolean);

// Plus longue sous-suite commune : marque chaque mot attendu comme trouvé ou manqué.
export function compareWords(expected, given) {
  const a = toWords(expected), b = toWords(given);
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hit = new Array(a.length).fill(false);
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { hit[i] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  const found = hit.filter(Boolean).length;
  return { words: a, hit, extra: Math.max(0, b.length - found), score: a.length ? found / a.length : 0 };
}

function diffView(expected, cmp) {
  // On affiche la phrase avec sa ponctuation : les mots manqués en évidence.
  const raw = expected.split(/\s+/);
  let k = 0;
  return h('p', { class: 'dict-diff' }, ...raw.flatMap((w, idx) => {
    const n = toWords(w).length;
    const ok = cmp.hit.slice(k, k + n).every(Boolean);
    k += n;
    return [h('span', { class: ok ? 'w-ok' : 'w-miss' }, w), idx < raw.length - 1 ? ' ' : null];
  }));
}

// Niveau de prononciation selon la sévérité choisie dans les réglages.
const SEVERITY = { easy: [0.4, 0.8], normal: [0.6, 0.9], strict: [0.8, 1] };
function pronunciationLevel(strict, guided) {
  const [need, needGuided] = SEVERITY[store.state.settings.pronunciation || 'normal'] || SEVERITY.normal;
  if (strict >= 0.85) return { ok: true, cls: 'great', label: 'Excellente prononciation !' };
  if (strict >= need || (guided >= needGuided && strict >= need - 0.25)) return { ok: true, cls: 'good', label: 'Bien compris — quelques mots à travailler.' };
  return { ok: false, cls: 'low', label: 'À retravailler : écoute le modèle et réessaie.' };
}

function pronView(expected, strict, guided) {
  const raw = expected.split(/\s+/);
  let k = 0;
  return h('p', { class: 'dict-diff' }, ...raw.flatMap((w, idx) => {
    const n = toWords(w).length;
    const s = strict.hit.slice(k, k + n).every(Boolean), g = guided.hit.slice(k, k + n).every(Boolean);
    k += n;
    return [h('span', { class: s ? 'w-ok' : g ? 'w-approx' : 'w-miss' }, w), idx < raw.length - 1 ? ' ' : null];
  }));
}

/* ---------- Interface ---------- */
export function runListening(root, items, { title = 'Écoute et prononciation', subtitle = '', onFinish } = {}) {
  setMode('exercise');
  const head = h('div', { class: 'runner-head' }, h('div', {}, h('div', { class: 'eyebrow' }, subtitle), h('h2', {}, title)), h('div', { class: 'runner-count' }));
  const bar = h('div', { class: 'progress' }, h('span'));
  const stage = h('div', { class: 'stage' });
  root.replaceChildren(head, bar, stage);
  let i = 0, right = 0;

  if (!items.length) {
    stage.replaceChildren(h('div', { class: 'card done-card' }, h('h2', {}, title),
      h('p', {}, 'Termine d’abord une leçon : les phrases d’écoute viennent des unités que tu as étudiées.'),
      onFinish ? h('button', { class: 'btn primary', onclick: () => onFinish({ right: 0, total: 0 }) }, 'Continuer', icon('arrow', 18)) : null));
    return;
  }

  const next = () => {
    if (i >= items.length) return finish();
    head.querySelector('.runner-count').textContent = `${i + 1} / ${items.length}`;
    bar.firstChild.style.width = `${(i / items.length) * 100}%`;
    const it = items[i++];
    stage.replaceChildren(render(it, ok => { const d = today(); ok ? (right++, d.right++) : d.wrong++; store.save(); }, next));
  };

  const finish = () => {
    bar.firstChild.style.width = '100%';
    const pct = Math.round((right / items.length) * 100);
    if (pct >= 80) confetti(pct === 100 ? 1.2 : 0.7);
    stage.replaceChildren(h('div', { class: 'card done-card' },
      h('div', { class: 'big-score' + (pct >= 80 ? ' good' : pct >= 50 ? ' mid' : ' low') }, `${pct} %`),
      h('p', { class: 'end-praise' }, endPraise(pct)),
      h('p', {}, `${right} réussite${right > 1 ? 's' : ''} sur ${items.length}.`),
      h('p', { class: 'muted' }, 'Écouter puis écrire ou répéter une phrase entière entraîne l’oreille et la mémoire en même temps.'),
      onFinish ? h('button', { class: 'btn primary', onclick: () => onFinish({ right, total: items.length }) }, 'Continuer', icon('arrow', 18)) : null));
  };
  next();
}

function playButtons(text) {
  const mk = (label, rate, ic) => h('button', { class: 'btn ghost', type: 'button', onclick: e => {
    const b = e.currentTarget; b.classList.add('playing'); speak(text, rate, () => b.classList.remove('playing'));
  } }, icon(ic, 18), label);
  return h('div', { class: 'listen-actions' }, mk('Écouter', undefined, 'sound'), mk('Plus lentement', 0.7, 'clock'));
}

function render(it, onResult, onNext) {
  const box = h('div', { class: 'card exercise listening' });
  const meta = unitMeta(it.uid);
  box.append(h('div', { class: 'ex-top' }, h('div', { class: 'ex-source' }, `${meta.book.short} · Unité ${meta.n}`)));
  const feedback = h('div', { class: 'feedback', 'aria-live': 'polite' });
  const actions = h('div', { class: 'ex-actions' });
  let answered = false;
  const conclude = (ok, extra) => {
    if (answered) return;
    answered = true;
    onResult(ok);
    box.classList.add(ok ? 'is-right' : 'is-wrong');
    pulse(box, ok ? 'pop' : 'shake');
    feedback.replaceChildren(h('div', { class: 'fb-title' }, icon(ok ? 'check' : 'x', 20), ok ? pickPraise() : pickComfort()), extra);
    const nextBtn = h('button', { class: 'btn primary', onclick: onNext }, 'Suivant', icon('arrow', 18));
    actions.replaceChildren(nextBtn);
    nextBtn.focus();
  };

  if (it.t === 'dictation') {
    box.append(h('p', { class: 'ex-instr' }, 'Écoute la phrase et écris-la.'), h('p', { class: 'ex-instr-fr' }, 'Tu peux la réécouter autant de fois que tu veux.'), playButtons(it.text));
    const inp = h('input', { class: 'write-input', type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: 'Écris ce que tu entends…' });
    const check = () => {
      if (!inp.value.trim()) return inp.focus();
      const cmp = compareWords(it.text, inp.value);
      const ok = cmp.score === 1 && cmp.extra === 0;
      inp.disabled = true;
      conclude(ok, h('div', {}, ok ? null : h('p', { class: 'small muted' }, `${Math.round(cmp.score * 100)} % des mots trouvés. En rouge, les mots manqués :`), diffView(it.text, cmp)));
    };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); check(); } });
    box.append(h('div', { class: 'ex-body' }, inp));
    actions.append(h('button', { class: 'btn primary', onclick: check }, 'Vérifier', icon('check', 18)));
    setTimeout(() => { speak(it.text); inp.focus(); }, 250);
  } else if (it.t === 'choice') {
    box.append(h('p', { class: 'ex-instr' }, 'Qu’as-tu entendu ?'), playButtons(it.text));
    const opts = h('div', { class: 'options' });
    it.options.forEach((o, n) => opts.append(h('button', { class: 'option', type: 'button', onclick: e => {
      if (answered) return;
      const ok = o === it.text;
      opts.querySelectorAll('.option').forEach((x, j) => { if (it.options[j] === it.text) x.classList.add('right'); });
      if (!ok) e.currentTarget.classList.add('wrong');
      conclude(ok, null);
    } }, h('span', { class: 'key' }, String(n + 1)), h('span', {}, o))));
    box.append(h('div', { class: 'ex-body' }, opts));
    setTimeout(() => speak(it.text), 250);
  } else if (it.t === 'speak') {
    // Prononciation : autant d'essais que tu veux. L'exercice est réussi dès qu'un essai est bon ;
    // « Passer » le compte comme raté. Après une réussite, tu peux encore t'entraîner.
    box.append(h('p', { class: 'ex-instr' }, 'Écoute, puis répète la phrase à voix haute.'),
      h('p', { class: 'ex-q speak-target', html: rich(it.text) }), playButtons(it.text));
    const live = h('p', { class: 'speak-live muted' }, '');
    const tries = h('div', { class: 'speak-tries', 'aria-live': 'polite' });
    const mic = h('button', { class: 'btn amber mic', type: 'button' }, icon('play', 18), h('span', {}, 'Parler'));
    const label = t => { mic.lastChild.textContent = t; };
    let session = null, attempt = 0, best = 0;
    const skip = h('button', { class: 'btn ghost', type: 'button', onclick: async () => {
      if (answered) return;
      if (session) { await session.stop(); session = null; }
      conclude(false, h('p', { class: 'small muted' }, attempt ? 'Exercice passé : il reviendra pour t’entraîner encore.' : 'Exercice passé.'));
      mic.remove();
    } }, 'Passer');
    mic.onclick = async () => {
      if (!session) {
        mic.disabled = true; live.textContent = 'Préparation du micro…';
        try {
          session = await listen(it.text, t => { live.textContent = t ? `« ${t} »` : 'Je t’écoute…'; });
          mic.disabled = false; mic.classList.add('recording'); label('J’ai fini');
          live.textContent = 'Je t’écoute…';
        } catch (e) {
          mic.disabled = false; session = null;
          live.textContent = e?.name === 'NotAllowedError' ? 'Micro refusé : autorise-le dans Chrome (icône à gauche de l’adresse).' : 'Micro ou reconnaissance vocale indisponible.';
        }
        return;
      }
      mic.disabled = true; live.textContent = 'Analyse…';
      const said = await session.stop();
      session = null; mic.classList.remove('recording'); mic.disabled = false;
      attempt++;
      const strict = compareWords(it.text, said.strict), guided = compareWords(it.text, said.guided);
      const lvl = pronunciationLevel(strict.score, guided.score);
      best = Math.max(best, strict.score);
      live.textContent = '';
      // Le dernier essai s'affiche en haut ; les précédents restent visibles en plus petit.
      tries.querySelectorAll('.speak-try').forEach(t => t.classList.add('old'));
      tries.prepend(h('div', { class: 'speak-try' },
        h('p', { class: 'pron-level ' + lvl.cls }, `Essai ${attempt} — ${lvl.label}`),
        pronView(it.text, strict, guided),
        h('p', { class: 'small muted' }, `Bien prononcés : ${Math.round(strict.score * 100)} % · compris avec aide : ${Math.round(guided.score * 100)} %`
          + (said.strict ? ` · j’ai entendu : « ${said.strict} »` : ' · je n’ai rien entendu : parle plus fort et plus près du micro.'))));
      label(lvl.ok ? 'Recommencer pour m’entraîner' : 'Réessayer');
      if (lvl.ok && !answered) {
        conclude(true, h('p', { class: 'small muted' }, attempt > 1 ? `Réussi au ${attempt}e essai. Bravo pour ta persévérance !` : 'Réussi du premier coup !'));
        actions.prepend(mic);
      } else if (!answered) {
        tries.prepend(h('p', { class: 'small speak-hint' }, 'Réécoute le modèle (tu peux le ralentir), puis réessaie autant de fois que tu veux.'));
      }
    };
    box.append(h('div', { class: 'ex-body' }, mic, live, tries));
    actions.append(skip);
    setTimeout(() => speak(it.text), 250);
  }
  box.append(feedback, actions);
  return box;
}
