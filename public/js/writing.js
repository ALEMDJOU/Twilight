// Expression écrite : l'application propose un sujet (topics.js), Harper corrige hors ligne,
// et l'IA locale corrige et évalue l'essay par rapport à ce sujet.
import { h, icon, setMode, esc, toast } from './ui.js';
import { store, today } from './store.js';
import { loadUnit, unitMeta } from './content.js';
import { checkText, applyFix, loadGrammar } from './grammar.js';
import { studiedUnits } from './listening.js';
import { pickPraise } from './components.js';
import { cheer } from './tts.js';
import { confetti } from './fx.js';
import { coachPanel, aiStatus, MAX_CHARS } from './coach.js';
import { TOPICS, KIND_LABELS } from './topics.js';

// Tire un sujet du type demandé, en évitant les 30 derniers (gardés dans la progression).
function pickTopic(kind) {
  const w = store.state.writing || (store.state.writing = { recent: [] });
  const pool = TOPICS.filter(t => !kind || t.kind === kind);
  const fresh = pool.filter(t => !w.recent.includes(t.id));
  const t = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length || pool.length))];
  w.recent = [t.id, ...w.recent.filter(id => id !== t.id)].slice(0, 30);
  store.save();
  return t;
}

// Mots à réutiliser : quelques cartes des unités récemment étudiées.
async function wordsToUse() {
  const uids = studiedUnits().slice(0, 4);
  const pool = [];
  for (const uid of uids) {
    try {
      const u = await loadUnit(uid);
      for (const c of u.cards || []) if (!c.q && c.en && c.en.split(' ').length <= 4 && !/[\/()]/.test(c.en)) pool.push({ en: c.en.replace(/^to /, ''), fr: c.fr, uid });
    } catch { /* unité indisponible */ }
  }
  return pool.sort(() => Math.random() - 0.5).slice(0, 4);
}

function highlight(text, issues) {
  // Texte avec les passages fautifs soulignés (numérotés).
  const out = [];
  let pos = 0;
  issues.forEach((it, n) => {
    if (it.start < pos) return;
    out.push(esc(text.slice(pos, it.start)));
    out.push(`<mark class="gram-err" data-n="${n + 1}">${esc(text.slice(it.start, it.end)) || '&nbsp;'}</mark>`);
    pos = it.end;
  });
  out.push(esc(text.slice(pos)));
  return out.join('').replace(/\n/g, '<br>');
}

// Message de Harper (en anglais) : première phrase seulement, `mot` affiché en code au lieu des accents graves.
function harperMsg(msg) {
  let m = String(msg || '').trim();
  const cut = m.search(/[.!?](\s|$)/);
  if (cut > 0 && cut < m.length - 1) m = m.slice(0, cut + 1);
  if (m.length > 160) m = m.slice(0, 157).trimEnd() + '…';
  return esc(m).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/`/g, '');
}

// Brouillon gardé dans ce navigateur : un rechargement ou un changement de page ne fait pas perdre le texte.
const DRAFT = 'twilight-writing-draft';
const loadDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT)) || null; } catch { return null; } };
const saveDraft = d => { try { localStorage.setItem(DRAFT, JSON.stringify(d)); } catch { /* stockage indisponible */ } };
const countWords = s => s.trim().split(/\s+/).filter(Boolean).length;

// Mise en page : le sujet reste visible à côté de la zone d'écriture (on reconnaît au lieu de se souvenir),
// une action principale « Corriger mon texte » (IA), la vérification rapide à côté, les résultats en dessous.
export async function runWriting(root, { onFinish } = {}) {
  setMode('exercise');
  const words = await wordsToUse();
  loadGrammar().catch(() => {});   // préchargement pendant que tu écris

  // ---- Sujet (colonne de droite) ----
  let topic = null;
  const kindEl = h('span', { class: 'badge' });
  const levelEl = h('span', { class: 'badge soft' });
  const promptEl = h('h3', { class: 'write-prompt' });
  const frEl = h('p', { class: 'ex-instr-fr' });
  const pointsEl = h('ul', { class: 'write-points' });
  const usefulEl = h('div', { class: 'write-chips' });
  const kindSel = h('select', { class: 'write-kind', 'aria-label': 'Type d’écrit' },
    h('option', { value: '' }, 'Tous les types'), ...Object.entries(KIND_LABELS).map(([k, label]) => h('option', { value: k }, label)));
  const showTopic = t => {
    topic = t;
    kindEl.textContent = KIND_LABELS[t.kind];
    levelEl.textContent = `Niveau ${t.level}`;
    promptEl.textContent = t.en;
    frEl.textContent = t.fr;
    pointsEl.replaceChildren(...t.points.map(p => h('li', {}, p)));
    usefulEl.replaceChildren(...t.useful.map(([en, fr]) => insertChip(en, fr, fr)));
    updateCount();
  };
  // Expression cliquable : insérée dans le texte à l'endroit du curseur (bouton, donc utilisable au clavier).
  const insertChip = (en, fr, title) => h('button', { class: 'chip write-insert', type: 'button', title: `${title} — cliquer pour l’insérer dans ton texte`,
    'aria-label': `Insérer « ${en} » dans ton texte (${fr})`, onclick: () => insertAtCursor(en) }, en, h('small', {}, fr));
  const insertAtCursor = phrase => {
    const v = area.value, start = area.selectionStart ?? v.length, end = area.selectionEnd ?? start;
    // Espaces autour seulement si besoin (pas d'espace avant une ponctuation ni en début de ligne).
    const pre = start > 0 && !/\s$/.test(v.slice(0, start)) ? ' ' : '';
    const post = end < v.length && !/^[\s.,;:!?]/.test(v.slice(end)) ? ' ' : (end >= v.length ? ' ' : '');
    area.focus();
    area.setRangeText(pre + phrase + post, start, end, 'end');
    area.dispatchEvent(new Event('input', { bubbles: true }));   // compteur et brouillon
  };
  // L'IA reçoit le sujet complet : type d'écrit, consigne, questions guides et longueur attendue.
  const topicText = () => topic ? [`(${KIND_LABELS[topic.kind]}, about ${topic.words} words) ${topic.en}`, ...topic.points.map(p => `- ${p}`)].join('\n') : '';

  // ---- Zone d'écriture (colonne principale) ----
  const area = h('textarea', { class: 'write-area', rows: 12, spellcheck: 'false', placeholder: 'Write in English…', 'aria-label': 'Ton texte en anglais' });
  const meterFill = h('span');
  const meter = h('div', { class: 'write-meter', role: 'progressbar', 'aria-valuemin': '0' }, meterFill);
  const count = h('span', { class: 'write-count small' });
  // Au-delà de MAX_CHARS, l'IA ne lirait pas la fin du texte : le compteur l'annonce avant la correction.
  const chars = h('span', { class: 'write-chars small', 'aria-live': 'polite' });
  const updateCount = () => {
    const n = countWords(area.value), goal = topic?.words || 150;
    const ratio = n / goal;
    meterFill.style.width = `${Math.min(100, ratio * 100)}%`;
    meter.classList.toggle('ok', ratio >= 0.8 && ratio <= 1.4);
    meter.classList.toggle('long', ratio > 1.4);
    meter.setAttribute('aria-valuemax', String(goal)); meter.setAttribute('aria-valuenow', String(n));
    count.textContent = `${n} / ${goal} mots${ratio > 1.4 ? ' · un peu long' : ratio >= 0.8 ? ' · bonne longueur' : ''}`;
    const c = area.value.trim().length;
    chars.hidden = c < MAX_CHARS * 0.85;
    chars.classList.toggle('over', c > MAX_CHARS);
    chars.textContent = c > MAX_CHARS ? `${c} / ${MAX_CHARS} caractères : trop long pour l’IA, raccourcis ton texte` : `${c} / ${MAX_CHARS} caractères`;
  };
  area.addEventListener('input', () => { updateCount(); saveDraft({ id: topic?.id, text: area.value }); });

  const result = h('div', { class: 'feedback', 'aria-live': 'polite' });
  const coach = coachPanel(() => area.value, topicText, { onBusy: busy => {
    mainBtn.replaceChildren(icon(busy ? 'x' : 'check', 18), busy ? 'Arrêter la correction' : 'Corriger mon texte');
    quickBtn.disabled = busy;
  } });
  const mainBtn = h('button', { class: 'btn primary', type: 'button', 'aria-describedby': 'write-main-note' }, icon('check', 18), 'Corriger mon texte');
  const quickBtn = h('button', { class: 'btn ghost write-quick', type: 'button', 'aria-describedby': 'write-quick-note' }, icon('pencil', 18), 'Vérification rapide');
  // Chaque action avec sa durée, pour choisir en connaissance de cause.
  const action = (btn, id, note) => h('div', { class: 'write-action' }, btn, h('small', { class: 'muted', id }, note));

  // Changer de sujet avec un texte déjà écrit : on demande une confirmation sur le bouton lui-même (pas de fenêtre).
  let confirmTimer = 0;
  const topicBtn = h('button', { class: 'btn ghost small-btn', type: 'button' }, 'Autre sujet');
  const changeTopic = () => {
    if (countWords(area.value) >= 10 && !confirmTimer) {
      topicBtn.textContent = 'Effacer ton texte ? Clique encore';
      topicBtn.classList.add('warn');
      confirmTimer = setTimeout(() => { confirmTimer = 0; topicBtn.textContent = 'Autre sujet'; topicBtn.classList.remove('warn'); }, 4000);
      return;
    }
    clearTimeout(confirmTimer); confirmTimer = 0; topicBtn.textContent = 'Autre sujet'; topicBtn.classList.remove('warn');
    area.value = ''; result.replaceChildren();
    showTopic(pickTopic(kindSel.value));
    saveDraft({ id: topic.id, text: '' });
    area.focus();
  };
  topicBtn.onclick = changeTopic;
  kindSel.addEventListener('change', () => { if (!countWords(area.value)) changeTopic(); });

  // Aides repliables : ouvertes sur grand écran, fermées sur petit écran pour atteindre vite la zone d'écriture.
  const wide = matchMedia('(min-width: 981px)').matches;
  const helpBlock = (ic, title, body) => {
    const d = h('details', { class: 'write-block' }, h('summary', {}, icon(ic, 15), title), body);
    d.open = wide;
    return d;
  };
  const brief = h('aside', { class: 'card write-brief', 'aria-label': 'Sujet' },
    h('div', { class: 'write-tools' }, kindSel, topicBtn),
    h('div', { class: 'write-badges' }, kindEl, levelEl),
    promptEl,
    h('details', { class: 'write-fr' }, h('summary', {}, 'Voir la traduction'), frEl),
    h('div', { class: 'write-block' }, h('h4', {}, icon('bulb', 15), 'Pour t’aider'), pointsEl),
    helpBlock('book', 'Expressions utiles', usefulEl),
    words.length ? helpBlock('cards', 'Mots de tes leçons',
      h('div', { class: 'write-chips' }, ...words.map(w => insertChip(w.en, w.fr, `${w.fr} · ${unitMeta(w.uid)?.title || ''}`)))) : null);

  const editor = h('section', { class: 'card write-editor' },
    area,
    h('div', { class: 'write-meter-row' }, meter, count),
    chars,
    h('div', { class: 'write-actions' },
      action(mainBtn, 'write-main-note', 'IA locale · environ 1 à 2 min'),
      action(quickBtn, 'write-quick-note', 'Orthographe et grammaire · quelques secondes'),
      h('span', { class: 'muted small write-hint' }, 'Ctrl + Entrée pour corriger')));

  root.replaceChildren(
    h('div', { class: 'runner-head' }, h('div', {},
      h('h2', {}, 'Expression écrite'),
      h('p', { class: 'muted small' }, 'Lis le sujet, écris ton texte, puis fais-le corriger.')),
      onFinish ? h('button', { class: 'btn ghost', type: 'button', onclick: () => onFinish() }, 'Terminer', icon('arrow', 18)) : null),
    h('div', { class: 'write-layout' }, editor, brief),
    h('div', { class: 'write-results' }, result, coach));

  // Reprend le brouillon s'il correspond à un sujet de la banque, sinon tire un nouveau sujet.
  const draft = loadDraft();
  const saved = draft && TOPICS.find(t => t.id === draft.id);
  showTopic(saved || pickTopic(''));
  if (saved && draft.text) { area.value = draft.text; updateCount(); }
  area.focus();

  // Action principale : la correction complète par l'IA si elle est disponible, sinon Harper.
  const correct = async () => {
    if (coach.busy) return coach.run();   // « Arrêter la correction »
    const st = await aiStatus();
    if (st.installed && !st.offline) { result.replaceChildren(); coach.run(); }
    else check();
  };
  mainBtn.onclick = correct;
  quickBtn.onclick = () => check();

  const check = async () => {
    const text = area.value.trim();
    if (text.split(/\s+/).length < 3) { toast('Écris au moins une phrase complète.'); return area.focus(); }
    quickBtn.disabled = true;
    result.replaceChildren(h('p', { class: 'muted' }, 'Analyse de ton texte…'));
    let issues;
    try { issues = await checkText(area.value); } catch {
      quickBtn.disabled = false;
      return result.replaceChildren(h('p', {}, 'Le correcteur n’est pas installé. Lance « npm run setup:voice » une fois.'));
    }
    quickBtn.disabled = false;
    const used = words.filter(w => area.value.toLowerCase().includes(w.en.toLowerCase()));
    const d = today(); issues.length ? d.wrong++ : d.right++; store.save();
    if (!issues.length) confetti(0.8);
    const praise = issues.length ? null : pickPraise();
    cheer(praise || 'Good try! Let’s fix a few things.', { soft: !praise });
    result.replaceChildren(
      h('p', { class: 'eyebrow' }, 'Vérification rapide (Harper)'),
      h('div', { class: 'fb-title' }, icon(issues.length ? 'pencil' : 'check', 20),
        issues.length ? `${issues.length} point${issues.length > 1 ? 's' : ''} à corriger` : `${praise} Aucune faute détectée.`),
      words.length ? h('p', { class: 'small muted' }, `Mots réutilisés : ${used.length} / ${words.length}${used.length ? ` (${used.map(w => w.en).join(', ')})` : ''}.`) : null,
      issues.length ? h('div', { class: 'write-marked', html: highlight(area.value, issues) }) : null,
      issues.length ? h('ol', { class: 'gram-list' }, issues.map(it => h('li', {},
        h('span', { class: 'gram-kind' }, it.kindFr),
        h('strong', {}, `« ${it.text} » `), h('span', { lang: 'en', html: harperMsg(it.message) }),
        it.suggestions.length ? h('div', { class: 'gram-sugg' }, h('span', { class: 'muted small' }, 'Remplacer par :'),
          ...it.suggestions.map(sg => h('button', { class: 'chip chip-btn', type: 'button', onclick: () => {
            area.value = applyFix(area.value, it, sg); check();
          } }, sg || '(supprimer)'))) : null))) : null,
      h('p', { class: 'muted small' }, 'Harper repère l’orthographe, les accords, les articles et beaucoup d’erreurs de grammaire, mais pas toutes. Pour une correction complète, utilise « Corriger mon texte ».'));
  };
  area.addEventListener('keydown', e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); correct(); } });
}
