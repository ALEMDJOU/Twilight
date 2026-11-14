// Professeur d'essay local (llama.cpp + Qwen3 sur ce PC, via le serveur Twilight), en deux étapes :
//   1. correction stricte → texte corrigé et liste des corrections (calculée ici, mot à mot, sans invention),
//      expliquées par une liste vérifiée d'erreurs typiques (mistakes.js) ;
//   2. retour de professeur → grille notée, conseils sur l'essay, essay modèle de niveau B2.
import { h, icon, esc, toast, speakBtn, anchorNav } from './ui.js';
import { explain, autoFix, keepSpelling } from './mistakes.js';

// Messages d'erreur du serveur, en clair.
const ERRORS = {
  'engine-timeout': 'Le moteur a mis plus de 3 minutes à démarrer : ton PC est sans doute très occupé. Ferme les programmes lourds, puis réessaie.',
  'engine-exited': 'Le moteur s’est arrêté au démarrage : la mémoire est peut-être pleine. Ferme quelques onglets ou programmes, puis réessaie.',
  'not-installed': 'L’IA locale n’est pas installée : lance une fois « npm run setup:ai » dans le dossier Twilight.',
};

const LEVEL = 'B2';

let statusCache = null;
export async function aiStatus() {
  if (statusCache) return statusCache;
  try { statusCache = await fetch('/api/ai', { cache: 'no-store' }).then(r => r.json()); }
  catch { return { installed: false, offline: true }; }
  return statusCache;
}

const clean = s => s.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').replace(/^\s*(#{1,4}\s*)?corrected( text)?\s*:?\s*\n/i, '').trim();
// Le modèle ajoute parfois du gras Markdown ou des titres de paragraphe malgré la consigne.
const plainText = s => s.replace(/\*\*|__/g, '').replace(/^\s*(introduction|body( paragraph)?\s*\d*|conclusion)\s*:\s*$/gim, '').replace(/\n{3,}/g, '\n\n').trim();

// Sections ### SCORES / ADVICE / MODEL, même incomplètes, en tolérant les variations de format.
function sections(raw) {
  const text = clean(raw);
  const marks = [...text.matchAll(/^[ \t]*(?:#{1,4}[ \t]*|\*\*)?(SCORES|ADVICE|MODEL)\b[^\n]*$/gim)];
  const out = {};
  marks.forEach((m, i) => { out[m[1].toLowerCase()] = text.slice(m.index + m[0].length, marks[i + 1]?.index ?? text.length).trim(); });
  return out;
}

const tokens = s => s.match(/\s+|[^\s]+/g) || [];
const blank = t => /^\s+$/.test(t);

// Différences mot à mot (plus longue sous-suite commune) : liste d'opérations ['=' | '-' | '+', texte].
function diff(before, after) {
  const a = tokens(before), b = tokens(after);
  if (a.length * b.length > 400000) return [['+', after]];
  const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { ops.push(['=', a[i]]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push(['-', a[i++]]);
    else ops.push(['+', b[j++]]);
  }
  while (i < a.length) ops.push(['-', a[i++]]);
  while (j < b.length) ops.push(['+', b[j++]]);
  return ops;
}

function diffHtml(ops) {
  return ops.map(([op, t]) => {
    if (op === '=' || blank(t)) return esc(t);
    return `<span class="${op === '-' ? 'ai-del' : 'ai-ins'}">${esc(t)}</span>`;
  }).join('').replace(/\n/g, '<br>');
}

// Phrase du texte corrigé autour d'une position (avec « Look! » / « Listen! » juste avant, qui servent d'indice de temps).
function sentenceAt(text, pos) {
  let start = pos;
  while (start > 0 && !/[.!?]\s/.test(text.slice(start - 2, start))) start--;
  const look = text.slice(0, start).match(/(look|listen)!\s*$/i);
  if (look) start -= look[0].length;
  const end = text.slice(pos).search(/[.!?](\s|$)/);
  return text.slice(start, end < 0 ? text.length : pos + end + 1);
}

// Regroupe les différences en corrections lisibles, avec un mot de contexte de chaque côté
// et la phrase corrigée qui les contient (pour expliquer les temps).
function changes(ops) {
  const out = [];
  const corrected = ops.filter(([op]) => op !== '-').map(([, t]) => t).join('');
  const posAt = [];   // position dans le texte corrigé au début de chaque opération
  let pos = 0;
  for (const [op, t] of ops) { posAt.push(pos); if (op !== '-') pos += t.length; }
  for (let k = 0; k < ops.length; k++) {
    if (ops[k][0] === '=') continue;
    let end = k;
    // Une suite de changements séparés seulement par des espaces forme une seule correction.
    while (end + 1 < ops.length && (ops[end + 1][0] !== '=' || (blank(ops[end + 1][1]) && ops[end + 2] && ops[end + 2][0] !== '='))) end++;
    const run = ops.slice(k, end + 1);
    const side = keep => run.filter(([op]) => op === '=' || op === keep).map(([, t]) => t).join('').replace(/\s+/g, ' ').trim();
    let before = '', after = '';
    for (let p = k - 1; p >= 0; p--) if (!blank(ops[p][1])) { if (ops[p][0] === '=') before = ops[p][1]; break; }
    for (let p = end + 1; p < ops.length; p++) if (!blank(ops[p][1])) { if (ops[p][0] === '=') after = ops[p][1]; break; }
    const from = side('-'), to = side('+');
    if (from !== to) out.push({ before, from, to, after, sentence: sentenceAt(corrected, posAt[k]) });
    k = end;
  }
  return out;
}

// Note de grammaire calculée (pas par l'IA) : nombre de corrections pour 100 mots.
function grammarScore(nChanges, nWords) {
  const per100 = nWords ? nChanges / nWords * 100 : 0;
  return per100 < 1 ? 5 : per100 < 3 ? 4 : per100 < 6 ? 3 : per100 < 10 ? 2 : 1;
}

const LINKERS = /\b(however|moreover|furthermore|in addition|for example|for instance|as a result|therefore|consequently|on the other hand|in conclusion|to sum up|overall|firstly|secondly|finally|although|whereas|nevertheless|in my opinion|to begin with|on the one hand)\b/gi;

// Note sur 5 : points + nombre, avec un texte lisible par les lecteurs d'écran.
function scoreRow(label, n, note) {
  return h('div', { class: 'ai-score' }, h('span', { class: 'ai-score-label' }, label),
    h('span', { class: 'ai-dots', role: 'img', 'aria-label': n ? `${n} sur 5` : 'en attente' }, ...[1, 2, 3, 4, 5].map(i => h('i', { class: i <= n ? 'on' : '' }))),
    h('strong', { class: 'ai-score-n', 'aria-hidden': 'true' }, n ? `${n}/5` : '…'), note ? h('small', { class: 'muted' }, note) : null);
}

const STEPS = ['Correction', 'Bilan', 'Essay modèle'];
const fmt = sec => sec < 60 ? `${sec} s` : `${Math.floor(sec / 60)} min ${String(sec % 60).padStart(2, '0')} s`;
const MAX_FIXES = 8;   // au-delà, les corrections suivantes sont repliées

// Panneau à placer sous la zone d'écriture. getText() renvoie l'essay, getTopic() le sujet.
// Pas de bouton ici : l'appelant a son bouton « Corriger mon essay », qui appelle panel.run()
// (et l'arrête si une correction est en cours) ; onBusy(true|false) l'avertit du début et de la fin.
export function coachPanel(getText, getTopic, { onBusy } = {}) {
  const status = h('div', { class: 'ai-status' });
  const out = h('div', { class: 'ai-out' });
  const live = h('p', { class: 'ai-sr', 'aria-live': 'polite' });   // annonces aux changements d'étape seulement
  const panel = h('div', { class: 'ai-coach', hidden: true }, status, out, live);
  let ctrl = null, starting = false, nav = null;
  const announce = msg => { live.textContent = msg; };
  const setBusy = b => { try { onBusy?.(b); } catch {} };

  // Une étape : renvoie le texte complet, en appelant onText à chaque morceau reçu.
  const stream = async (body, onText) => {
    const r = await fetch('/api/ai/coach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
    if (!r.ok) throw new Error(await r.text());
    const reader = r.body.getReader(), dec = new TextDecoder();
    let raw = '', frame = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      raw += dec.decode(value, { stream: true });
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; onText(raw); });
    }
    cancelAnimationFrame(frame);
    onText(raw);
    return raw;
  };

  const waiting = text => h('p', { class: 'muted small ai-wait' }, text);
  const retryBtn = () => h('button', { class: 'btn ghost ai-retry', type: 'button', onclick: () => panel.run() }, 'Réessayer');
  const note = () => h('p', { class: 'ai-note' }, 'Qwen3 tourne sur ton PC, hors ligne. Elle peut se tromper : garde un œil critique.');
  const heading = (ic, text) => h('h3', { tabindex: '-1' }, icon(ic, 18), text);

  panel.run = async () => {
    if (ctrl) { ctrl.abort(); return; }
    if (starting) return;   // évite un double lancement pendant la vérification du moteur
    const text = getText().trim();
    const nWords = text.split(/\s+/).filter(Boolean).length;
    if (nWords < 3) return toast('Écris au moins une phrase complète.');
    starting = true;
    let st;
    try { st = await aiStatus(); } finally { starting = false; }
    panel.hidden = false;
    nav?._disconnect?.(); nav = null;
    if (st.offline || !st.installed) {
      out.replaceChildren();
      status.replaceChildren(h('div', { class: 'ai-msg', role: 'alert' }, st.offline
        ? [h('p', {}, 'L’IA locale passe par le serveur Twilight : lance « Lancer Twilight.bat », puis réessaie.'), retryBtn()]
        : h('p', {}, 'L’IA locale n’est pas encore installée. Dans le dossier Twilight, lance une fois : ', h('code', {}, 'npm run setup:ai'), ' (environ 1,1 Go).')));
      return;
    }
    ctrl = new AbortController();
    setBusy(true);

    // Suivi des 3 étapes : en attente / en cours (secondes écoulées) / terminée.
    const steps = STEPS.map((label, i) => {
      const dot = h('span', { class: 'ai-step-dot', 'aria-hidden': 'true' }, String(i + 1));
      const state = h('small', { class: 'ai-step-state' }, 'en attente');
      return { li: h('li', { class: 'ai-step', 'data-state': 'wait' }, dot, h('span', { class: 'ai-step-txt' }, h('strong', {}, label), state)), dot, state, t0: 0, t1: 0 };
    });
    const paint = s => {
      const sec = Math.round(((s.t1 || Date.now()) - s.t0) / 1000);
      s.state.textContent = { wait: 'en attente', run: `en cours · ${fmt(sec)}`, done: `terminé · ${fmt(sec)}`, stop: 'arrêtée', error: 'échec' }[s.li.dataset.state];
    };
    const setStep = (i, state) => {
      const s = steps[i];
      if (!s.t0) s.t0 = Date.now();
      if (state === 'done') s.t1 = Date.now();
      s.li.dataset.state = state;
      if (state === 'run') s.li.setAttribute('aria-current', 'step'); else s.li.removeAttribute('aria-current');
      s.dot.replaceChildren(state === 'done' ? icon('check', 14) : state === 'stop' || state === 'error' ? icon('x', 14) : String(i + 1));
      paint(s);
    };
    // Termine les étapes avant i et lance l'étape i.
    const advance = i => {
      steps.forEach((s, k) => { if (k < i && s.li.dataset.state !== 'done') setStep(k, 'done'); });
      if (steps[i]?.li.dataset.state === 'wait') setStep(i, 'run');
    };

    const t0 = Date.now();
    const title = h('strong', { class: 'ai-status-title', tabindex: '-1' }, 'L’IA corrige ton essay…');
    const stopBtn = h('button', { class: 'btn ghost ai-stop', type: 'button', onclick: () => ctrl?.abort() }, icon('x', 16), 'Arrêter');
    const est = h('p', { class: 'small muted ai-est' }, 'Environ 2 minutes au total ; la correction arrive en premier.',
      st.running ? null : ' Premier lancement : le moteur démarre, compte jusqu’à 1 minute de plus.');
    status.replaceChildren(h('div', { class: 'ai-status-head' }, title, stopBtn),
      h('ol', { class: 'ai-steps', 'aria-label': 'Étapes de la correction' }, steps.map(s => s.li)), est, note());
    const tick = setInterval(() => steps.forEach(s => { if (s.li.dataset.state === 'run') paint(s); }), 1000);
    advance(0);
    announce('Étape 1 sur 3 : correction en cours.');

    // Les 4 blocs de résultat, chacun avec un titre focalisable.
    const corrH = heading('check', 'Texte corrigé');
    const corrBody = h('div', { class: 'ai-text' });
    const corrSec = h('section', { class: 'ai-sec' }, corrH, corrBody);
    const listSec = h('section', { class: 'ai-sec' });
    const evalBody = h('div', {});
    const evalSec = h('section', { class: 'ai-sec' }, heading('target', 'Bilan'), evalBody);
    const modelBody = h('div', {});
    const modelSec = h('section', { class: 'ai-sec ai-better' }, heading('star', `Essay modèle (${LEVEL})`), modelBody);
    out.replaceChildren(corrSec);
    corrBody.replaceChildren(waiting(st.running ? 'Correction en cours…' : 'L’IA se réveille, puis corrige ton texte…'));

    try {
      // Étape 1 : correction stricte.
      // Puis les corrections sûres des calques du français que le petit modèle laisse passer.
      // Puis on garde l'orthographe britannique ou américaine de l'élève (les deux sont justes).
      const corrected = keepSpelling(text, autoFix(clean(await stream({ stage: 'correct', text }, raw => { const c = clean(raw); if (c) corrBody.textContent = c; }))));
      const ops = diff(text, corrected);
      corrBody.innerHTML = diffHtml(ops);
      const list = changes(ops);
      if (list.length) corrSec.append(h('p', { class: 'ai-legend' }, h('del', { class: 'ai-del' }, 'barré'), ' = à enlever · ', h('ins', { class: 'ai-ins' }, 'souligné'), ' = ajouté'));

      // Une correction par ligne : « avant [faute] → [correction] après », l'explication dessous.
      const items = list.map(c => {
        const why = explain(c);
        return h('li', { tabindex: '-1' },
          h('div', { class: 'ai-fix-line' }, c.before ? c.before + ' ' : '',
            c.from ? h('del', { class: 'ai-del' }, c.from) : h('span', { class: 'ai-none', title: 'rien' }, '∅'),
            h('span', { class: 'ai-arrow', 'aria-hidden': 'true' }, '→'), h('span', { class: 'ai-sr' }, ' devient '),
            c.to ? h('ins', { class: 'ai-ins' }, c.to) : h('span', { class: 'ai-none', title: 'rien' }, '∅'),
            c.after ? ' ' + c.after : ''),
          why ? h('div', { class: 'ai-why' }, why) : null);
      });
      items.slice(MAX_FIXES).forEach(li => { li.hidden = true; });
      const rest = items.length - MAX_FIXES;
      const more = rest > 0 ? h('button', { class: 'btn ghost ai-more', type: 'button', onclick: () => {
        items.forEach(li => { li.hidden = false; });
        more.remove();
        items[MAX_FIXES].focus();
      } }, `Voir les ${rest} autre${rest > 1 ? 's' : ''}`) : null;
      listSec.replaceChildren(heading('pencil', `Tes corrections (${list.length})`),
        list.length ? h('ol', { class: 'ai-fixes' }, items) : h('p', { class: 'small' }, 'No mistake found. Well done!'), more);
      const gScore = grammarScore(list.length, nWords);

      // Étape 2 : retour de professeur et essay modèle.
      evalBody.replaceChildren(waiting('Le professeur lit ton essay…'));
      out.replaceChildren(corrSec, listSec, evalSec);
      advance(1);
      announce(`Correction terminée : ${list.length} correction${list.length > 1 ? 's' : ''}. Étape 2 sur 3 : bilan en cours.`);
      const render = (raw, done) => {
        const s = sections(plainText(raw));
        const score = re => Number((s.scores || '').match(re)?.[1]) || 0;
        const level = (s.scores || '').match(/level\s*:\s*\**\s*(A1|A2|B1|B2|C1|C2)/i)?.[1];
        const tips = (s.advice || '').split('\n').map(l => l.trim()).filter(l => /^([-–—*•]|\d+[.)])/.test(l)).map(l => l.replace(/^([-–—*•\s]+|\d+[.)]\s*)/, '')).filter(Boolean).slice(0, 3);
        if (s.scores != null) {
          const short = nWords < 120 && !/\b(email|e-mail|letter|message)\b/i.test(getTopic());
          evalBody.replaceChildren(
            h('div', { class: 'ai-scores' },
              scoreRow('Task (réponse au sujet)', score(/task\s*:\s*\**\s*(\d)/i)),
              scoreRow('Organisation', score(/organi[sz]ation\s*:\s*\**\s*(\d)/i)),
              scoreRow('Vocabulary', score(/vocabulary\s*:\s*\**\s*(\d)/i)),
              scoreRow('Grammar', gScore, `${list.length} correction${list.length > 1 ? 's' : ''} pour ${nWords} mots`)),
            level ? h('p', { class: 'ai-level' }, 'Niveau estimé', h('span', { class: 'ai-badge' }, level), h('span', { class: 'muted' }, '(estimation de l’IA)')) : null,
            short || tips.length ? h('ul', { class: 'ai-tips', 'aria-label': 'Conseils' },
              short ? h('li', {}, icon('pencil', 16), h('span', {}, `Ton texte fait ${nWords} mots : un essay en demande en général 150 à 250.`)) : null,
              tips.map(t => h('li', { lang: 'en' }, icon('bulb', 16), h('span', {}, t)))) : null);
        }
        if (s.model != null) {
          // Le modèle oublie souvent les paragraphes : on coupe avant les mots qui ouvrent une nouvelle partie.
          let model = done ? keepSpelling(text, autoFix(s.model.trim())) : s.model.trim();
          if (done && !/\n\s*\n/.test(model)) model = model.replace(/ (?=(However|On the other hand|In conclusion|To sum up|Overall|In the future|Nevertheless),)/g, '\n\n');
          modelBody.replaceChildren(
            done && model ? h('div', { class: 'ai-toolbar', role: 'group', 'aria-label': 'Actions sur l’essay modèle' },
              speakBtn(model, 'Écouter l’essay modèle'),
              h('button', { class: 'btn ghost ai-tool', type: 'button', onclick: () => navigator.clipboard?.writeText(model).then(() => toast('Essay modèle copié.')) }, 'Copier le texte')) : null,
            h('p', { class: 'ai-hint' }, 'Tes idées, mieux organisées. En gras : les mots de liaison à réutiliser.'),
            h('div', { class: 'ai-model', lang: 'en', html: esc(model).replace(LINKERS, '<strong>$1</strong>').replace(/\n{2,}/g, '</p><p>').replace(/^/, '<p>').replace(/$/, '</p>').replace(/\n/g, '<br>') }));
          if (!modelSec.isConnected) {
            out.append(modelSec);
            advance(2);
            announce('Bilan prêt. Étape 3 sur 3 : essay modèle en cours.');
          }
        }
      };
      await stream({ stage: 'coach', text, corrected, topic: getTopic(), level: LEVEL }, raw => render(raw, false)).then(raw => render(raw, true));
      statusCache = { ...st, running: true };

      // Fin : toutes les étapes cochées, raccourcis vers les blocs, focus sur le texte corrigé.
      advance(STEPS.length);
      evalBody.querySelector('.ai-wait')?.replaceWith(h('p', { class: 'small muted' }, 'Le bilan n’a pas pu être lu.'));
      const stopFocused = document.activeElement === stopBtn;
      title.textContent = `Terminé en ${fmt(Math.round((Date.now() - t0) / 1000))}`;
      est.remove(); stopBtn.remove();
      announce('Correction terminée. Les résultats sont prêts.');
      nav = anchorNav([['Texte corrigé', corrSec], ['Corrections', listSec], ['Bilan', evalSec], ['Essay modèle', modelSec.isConnected ? modelSec : null]], { label: 'Résultat' });
      if (nav) out.prepend(nav);
      // On ne vole pas le focus à quelqu'un qui tape dans un champ.
      if (stopFocused || !document.activeElement?.matches?.('input, textarea, [contenteditable]')) {
        corrH.focus({ preventScroll: true });
        corrH.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (e) {
      const aborted = e.name === 'AbortError';
      const i = steps.findIndex(s => s.li.dataset.state === 'run');
      if (i >= 0) setStep(i, aborted ? 'stop' : 'error');
      out.querySelectorAll('.ai-wait').forEach(w => w.replaceWith(h('p', { class: 'small muted' }, aborted ? 'Rien reçu pour cette partie.' : 'Pas de réponse pour cette partie.')));
      const stopFocused = document.activeElement === stopBtn;
      title.textContent = aborted ? 'Correction arrêtée' : 'La correction a échoué';
      est.remove(); stopBtn.remove();
      if (aborted) {
        status.append(h('div', { class: 'ai-msg info' }, h('p', {}, 'Ce qui est déjà arrivé reste affiché ci-dessous.'), retryBtn()));
        announce('Correction arrêtée.');
      } else {
        status.append(h('div', { class: 'ai-msg', role: 'alert' }, h('p', {}, ERRORS[e.message] || `L’IA locale n’a pas pu répondre (${e.message || 'erreur'}).`), retryBtn()));
      }
      if (stopFocused) title.focus();   // le bouton « Arrêter » a disparu : on garde le focus dans le panneau
    } finally {
      clearInterval(tick);
      ctrl = null;
      setBusy(false);
    }
  };
  Object.defineProperty(panel, 'busy', { get: () => !!ctrl });
  return panel;
}
