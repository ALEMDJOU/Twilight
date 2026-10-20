// Tableau de bord : objectif du jour, répartition des méthodes, série, progression par livre.
import { h, icon, fmtMin, speakBtn } from '../ui.js';
import { store, today, streak, dayKey } from '../store.js';
import { BOOKS, unitList, availableCount, getProverbs } from '../content.js';
import { getPlan, stepInfo, SPLIT, dueSummary, pendingDays } from '../session.js';
import { MASTERED_DAYS } from '../srs.js';
import { countUp } from '../fx.js';

// Rappel des séances des jours précédents restées inachevées.
function pendingCta() {
  const p = pendingDays();
  if (!p.length) return null;
  const left = p.reduce((n, d) => n + d.left, 0);
  return h('p', { class: 'hero-pending' }, icon('clock', 14),
    ` ${p.length} séance${p.length > 1 ? 's' : ''} précédente${p.length > 1 ? 's' : ''} à terminer (${left} étape${left > 1 ? 's' : ''}) — `,
    h('a', { href: `#/today/${p[0].key}` }, 'reprendre'));
}

export function dashboardView(root) {
  const s = store.state;
  const d = today();
  const goal = s.settings.minutesPerDay * 60;
  const spent = d.time.lesson + d.time.exercise + d.time.cards;
  const pct = Math.min(100, Math.round((spent / goal) * 100));
  const plan = getPlan();
  const doneSteps = plan.steps.filter(x => x.done).length;
  const due = dueSummary();
  const st = streak();

  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Anneau de progression.
  const R = 52, C = 2 * Math.PI * R;
  const ring = h('div', { class: 'ring', html: `
    <svg viewBox="0 0 120 120" width="148" height="148" aria-hidden="true">
      <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE3A3"/><stop offset="1" stop-color="#F08A5D"/></linearGradient></defs>
      <circle cx="60" cy="60" r="${R}" class="ring-bg"/>
      <circle cx="60" cy="60" r="${R}" class="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-target="${C * (1 - pct / 100)}"/>
    </svg>` },
    h('div', { class: 'ring-label' }, h('strong', {}, `${pct} %`), h('span', {}, `${fmtMin(spent)} / ${fmtMin(goal)}`)));

  const next = plan.steps.find(x => !x.done);
  const sky = h('div', { class: 'sky', 'aria-hidden': 'true' },
    h('div', { class: 'sun' }), h('div', { class: 'hill' }), h('div', { class: 'hill h2' }),
    Array.from({ length: 22 }, (_, i) => h('span', { class: 'star', style: { left: `${(i * 37) % 100}%`, top: `${(i * 53) % 55}%`, '--t': `${(i % 7) * 0.45}s` } })));
  const hero = h('section', { class: 'hero card reveal' }, sky,
    h('div', { class: 'hero-text' },
      h('div', { class: 'eyebrow light' }, new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })),
      h('h1', {}, hello + ' !'),
      h('p', {}, next ? `Prochaine étape : ${stepInfo(next).title}` : 'Séance du jour terminée. Bravo ! Tu peux continuer avec des révisions libres.'),
      h('div', { class: 'hero-actions' },
        h('a', { class: 'btn amber big', href: '#/today' }, icon('play', 18), doneSteps ? 'Continuer la séance' : 'Commencer la séance du jour'),
        h('span', { class: 'hero-sub' }, `${doneSteps} / ${plan.steps.length} étapes`)),
      pendingCta()),
    ring);

  // Répartition réelle vs cible.
  const methods = [
    ['cards', 'Flashcards', 'cards'],
    ['exercise', 'Exercices', 'pencil'],
    ['lesson', 'Leçons', 'book'],
  ];
  const split = h('section', { class: 'card reveal' },
    h('h2', {}, icon('target', 18), 'Répartition du jour'),
    h('p', { class: 'muted small' }, 'Cible fondée sur la recherche : 40 % répétition espacée, 40 % exercices, 20 % leçons.'),
    methods.map(([k, label, ic]) => {
      const target = goal * SPLIT[k];
      const v = d.time[k];
      return h('div', { class: 'meter' },
        h('div', { class: 'meter-top' }, h('span', {}, icon(ic, 16), label), h('span', { class: 'muted' }, `${fmtMin(v)} / ${fmtMin(target)}`)),
        h('div', { class: `progress ${k === 'cards' ? 'amber' : k === 'lesson' ? 'navy' : ''}` }, h('span', { style: { width: `${Math.min(100, (v / target) * 100)}%` } })));
    }));

  // Indicateurs.
  const items = Object.entries(s.items);
  const cards = items.filter(([id]) => !id.startsWith('x:'));
  const mastered = cards.filter(([, it]) => it.interval >= MASTERED_DAYS).length;
  const week = last7();
  const acc = week.right + week.wrong ? Math.round((week.right / (week.right + week.wrong)) * 100) : null;
  const kpis = h('section', { class: 'kpis' },
    kpi('flame', st, st > 1 ? 'jours de suite' : 'jour de suite', 'amber'),
    kpi('cards', due.cards, 'cartes à revoir'),
    kpi('star', mastered, 'cartes maîtrisées', 'amber'),
    kpi('check', acc, 'réussite sur 7 jours', '', ' %'));

  // Progression par livre.
  const books = h('section', { class: 'card reveal' }, h('h2', {}, icon('book', 18), 'Progression dans les livres'),
    BOOKS.map(b => {
      let done, total, avail;
      if (b.key === 'proverbs') { total = getProverbs().length; done = s.proverbsIntroduced; avail = total; }
      else { const l = unitList(b.key); total = l.length; done = l.filter(u => s.units[u.id]?.lessonDone).length; avail = availableCount(b.key); }
      return h('a', { class: 'book-row', href: `#/library/${b.key}` },
        h('span', { class: `book-dot ${b.color}` }),
        h('div', { class: 'book-row-main' },
          h('div', { class: 'meter-top' }, h('strong', {}, b.short), h('span', { class: 'muted small' }, `${done} / ${total}`)),
          h('div', { class: 'progress thin' }, h('span', { style: { width: `${(done / total) * 100}%` } })),
          avail < total ? h('div', { class: 'muted tiny' }, `${avail} unités prêtes dans Twilight`) : null));
    }));

  // 14 derniers jours.
  const hist = h('section', { class: 'card reveal' }, h('h2', {}, icon('chart', 18), '14 derniers jours'), history(goal));

  // Proverbe du jour.
  const prov = getProverbs();
  const p = prov[(Math.floor(Date.now() / 86400000)) % prov.length];
  const quote = h('section', { class: 'card quote reveal' },
    h('div', { class: 'eyebrow' }, 'Proverbe du jour'),
    h('blockquote', {}, speakBtn(p.en), h('span', {}, p.en)),
    h('p', { class: 'flash-fr' }, p.fr),
    h('p', { class: 'muted small' }, p.meaning));

  root.replaceChildren(h('div', { class: 'dash' }, hero, kpis, h('div', { class: 'grid-2' }, split, books), h('div', { class: 'grid-2' }, hist, quote)));
  requestAnimationFrame(() => setTimeout(() => {
    const fg = root.querySelector('.ring-fg');
    if (fg) fg.style.strokeDashoffset = fg.dataset.target;
  }, 120));
}

function kpi(ic, value, label, tone = '', suffix = '') {
  const num = h('strong', {}, value == null ? '—' : '0');
  if (value != null) countUp(num, value, { suffix });
  return h('div', { class: `kpi card reveal ${tone}` }, h('div', { class: 'kpi-ic' }, icon(ic, 20)), num, h('span', {}, label));
}

function last7() {
  const r = { right: 0, wrong: 0 };
  const d = new Date();
  for (let i = 0; i < 7; i++) { const x = store.state.days[dayKey(d)]; if (x) { r.right += x.right; r.wrong += x.wrong; } d.setDate(d.getDate() - 1); }
  return r;
}

function history(goal) {
  const wrap = h('div', { class: 'bars' });
  const d = new Date(); d.setDate(d.getDate() - 13);
  for (let i = 0; i < 14; i++) {
    const k = dayKey(d), x = store.state.days[k];
    const t = x ? x.time.lesson + x.time.exercise + x.time.cards : 0;
    const hgt = Math.min(100, (t / goal) * 100);
    wrap.append(h('div', { class: 'bar-col', title: `${d.toLocaleDateString('fr-FR')} : ${fmtMin(t)}` },
      h('div', { class: 'bar-track' }, h('div', { class: 'bar' + (t >= goal ? ' full' : ''), style: { height: `${hgt}%`, '--d': `${i * 40}ms` } })),
      h('span', {}, d.toLocaleDateString('fr-FR', { weekday: 'narrow' }))));
    d.setDate(d.getDate() + 1);
  }
  return h('div', {}, wrap, h('p', { class: 'muted tiny' }, 'Une barre pleine = objectif du jour atteint.'));
}
