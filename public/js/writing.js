// Expression écrite libre : tu écris quelques phrases, Harper corrige tout, hors ligne.
import { h, icon, setMode, esc, toast } from './ui.js';
import { store, today } from './store.js';
import { loadUnit, unitMeta } from './content.js';
import { checkText, applyFix, loadGrammar } from './grammar.js';
import { studiedUnits } from './listening.js';
import { pickPraise } from './components.js';
import { confetti } from './fx.js';

// Sujets d'écriture : du quotidien, puis de plus en plus personnels.
const PROMPTS = [
  ['Describe your typical day.', 'Décris une journée typique.'],
  ['What did you do last weekend?', 'Qu’as-tu fait le week-end dernier ?'],
  ['Describe your home and your neighbourhood.', 'Décris ton logement et ton quartier.'],
  ['Talk about your family.', 'Parle de ta famille.'],
  ['What are your plans for next year?', 'Quels sont tes projets pour l’année prochaine ?'],
  ['Describe your best friend.', 'Décris ton meilleur ami ou ta meilleure amie.'],
  ['Tell a memorable story from your childhood.', 'Raconte un souvenir marquant de ton enfance.'],
  ['What do you like about your job or your studies?', 'Qu’aimes-tu dans ton travail ou tes études ?'],
  ['Describe a place you would like to visit and explain why.', 'Décris un endroit que tu aimerais visiter et pourquoi.'],
  ['What would you do if you won a lot of money?', 'Que ferais-tu si tu gagnais beaucoup d’argent ?'],
  ['Write an email to a friend to invite them to a party.', 'Écris un e-mail à un ami pour l’inviter à une fête.'],
  ['What are the advantages and disadvantages of living in a big city?', 'Avantages et inconvénients de vivre dans une grande ville.'],
  ['Describe a film or a book you enjoyed.', 'Décris un film ou un livre que tu as aimé.'],
  ['Why are you learning English?', 'Pourquoi apprends-tu l’anglais ?'],
  ['Describe your favourite meal and how to cook it.', 'Décris ton plat préféré et comment le préparer.'],
  ['How has technology changed our lives?', 'Comment la technologie a-t-elle changé nos vies ?'],
];

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

export async function runWriting(root, { onFinish } = {}) {
  setMode('exercise');
  const [en, fr] = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  const words = await wordsToUse();
  loadGrammar().catch(() => {});   // préchargement pendant que tu écris

  const area = h('textarea', { class: 'write-area', rows: 7, spellcheck: 'false', placeholder: 'Write in English… (5 sentences or more)' });
  const count = h('span', { class: 'muted small' }, '0 mot');
  area.addEventListener('input', () => { const n = area.value.trim().split(/\s+/).filter(Boolean).length; count.textContent = `${n} mot${n > 1 ? 's' : ''}`; });
  const result = h('div', { class: 'feedback', 'aria-live': 'polite' });
  const checkBtn = h('button', { class: 'btn primary', type: 'button' }, icon('check', 18), 'Corriger mon texte');

  const card = h('div', { class: 'card exercise writing' },
    h('div', { class: 'eyebrow' }, 'Sujet'),
    h('h2', { class: 'write-prompt' }, en),
    h('p', { class: 'ex-instr-fr' }, fr),
    words.length ? h('div', { class: 'write-words' }, h('span', { class: 'muted small' }, 'Essaie d’utiliser :'),
      ...words.map(w => h('span', { class: 'chip', title: `${w.fr} · ${unitMeta(w.uid).title}` }, w.en))) : null,
    area,
    h('div', { class: 'ex-actions' }, count, checkBtn,
      h('button', { class: 'btn ghost', type: 'button', onclick: () => runWriting(root, { onFinish }) }, 'Autre sujet')),
    result);
  root.replaceChildren(h('div', { class: 'runner-head' }, h('div', {}, h('div', { class: 'eyebrow' }, 'Correction hors ligne avec Harper'), h('h2', {}, 'Expression écrite'))), h('div', { class: 'stage' }, card));
  area.focus();

  const check = async () => {
    const text = area.value.trim();
    if (text.split(/\s+/).length < 3) { toast('Écris au moins une phrase complète.'); return area.focus(); }
    checkBtn.disabled = true;
    result.replaceChildren(h('p', { class: 'muted' }, 'Analyse de ton texte…'));
    let issues;
    try { issues = await checkText(area.value); } catch {
      checkBtn.disabled = false;
      return result.replaceChildren(h('p', {}, 'Le correcteur n’est pas installé. Lance « npm run setup:voice » une fois.'));
    }
    checkBtn.disabled = false;
    const used = words.filter(w => area.value.toLowerCase().includes(w.en.toLowerCase()));
    const d = today(); issues.length ? d.wrong++ : d.right++; store.save();
    if (!issues.length) confetti(0.8);
    result.replaceChildren(
      h('div', { class: 'fb-title' }, icon(issues.length ? 'pencil' : 'check', 20),
        issues.length ? `${issues.length} point${issues.length > 1 ? 's' : ''} à corriger` : `${pickPraise()} Aucune faute détectée.`),
      words.length ? h('p', { class: 'small muted' }, `Mots réutilisés : ${used.length} / ${words.length}${used.length ? ` (${used.map(w => w.en).join(', ')})` : ''}.`) : null,
      issues.length ? h('div', { class: 'write-marked', html: highlight(area.value, issues) }) : null,
      issues.length ? h('ol', { class: 'gram-list' }, issues.map(it => h('li', {},
        h('span', { class: 'gram-kind' }, it.kindFr),
        h('strong', {}, `« ${it.text} » `), h('span', {}, it.message),
        it.suggestions.length ? h('div', { class: 'gram-sugg' }, h('span', { class: 'muted small' }, 'Remplacer par :'),
          ...it.suggestions.map(sg => h('button', { class: 'chip chip-btn', type: 'button', onclick: () => {
            area.value = applyFix(area.value, it, sg); check();
          } }, sg || '(supprimer)'))) : null))) : null,
      h('p', { class: 'muted small' }, 'Harper repère l’orthographe, les accords, les articles et beaucoup d’erreurs de grammaire, mais pas toutes : relis aussi le sens de tes phrases.'),
      onFinish ? h('button', { class: 'btn primary', type: 'button', onclick: () => onFinish() }, 'Terminer', icon('arrow', 18)) : null);
  };
  checkBtn.onclick = check;
  area.addEventListener('keydown', e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); check(); } });
}
