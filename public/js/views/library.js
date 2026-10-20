// Bibliothèque : accès libre aux 4 livres, à chaque unité, à ses exercices et à ses cartes.
import { h, icon, rich, speakBtn, setMode } from '../ui.js';
import { store } from '../store.js';
import { BOOKS, bookByKey, unitList, availableCount, loadUnit, unitMeta, getProverbs, cardIds, exerciseIds, cardData } from '../content.js';
import { renderLesson, runExercises, runCards } from '../components.js';
import { markLessonDone, markUnitExercises } from '../session.js';
import { MASTERED_DAYS } from '../srs.js';

export function libraryView(root, params) {
  setMode(null);
  if (params[0]) return bookView(root, params[0]);
  root.replaceChildren(h('h1', { class: 'page-title' }, 'Bibliothèque'),
    h('p', { class: 'muted' }, 'Accès libre à tout le contenu. La séance du jour suit l’ordre des livres, mais tu peux étudier n’importe quelle unité ici.'),
    h('div', { class: 'books' }, BOOKS.map(b => {
      const total = b.key === 'proverbs' ? getProverbs().length : unitList(b.key).length;
      const done = b.key === 'proverbs' ? store.state.proverbsIntroduced : unitList(b.key).filter(u => store.state.units[u.id]?.lessonDone).length;
      const avail = b.key === 'proverbs' ? total : availableCount(b.key);
      const letter = { grammar: 'G', vocab_int: 'V', vocab_adv: 'V+', collocations: 'C', proverbs: '“' }[b.key];
      return h('a', { class: `book card reveal ${b.color}`, href: `#/library/${b.key}` },
        h('div', { class: 'book-cover' }, h('span', {}, letter)),
        h('div', { class: 'book-body' },
          h('div', { class: 'eyebrow' }, b.short),
          h('h2', {}, b.title),
          h('p', { class: 'muted small' }, b.subtitle),
          h('div', { class: 'progress thin' }, h('span', { style: { width: `${(done / total) * 100}%` } })),
          h('p', { class: 'small' }, `${done} / ${total} étudiées`, avail < total ? h('span', { class: 'muted' }, ` · ${avail} prêtes`) : null)));
    })));
}

function bookView(root, key) {
  const b = bookByKey[key];
  if (!b) return libraryView(root, []);
  if (key === 'proverbs') return proverbsView(root);
  const units = unitList(key);
  const groups = [];
  for (const u of units) {
    if (!groups.length || groups.at(-1).section !== u.section) groups.push({ section: u.section, units: [] });
    groups.at(-1).units.push(u);
  }
  root.replaceChildren(
    h('a', { class: 'back', href: '#/library' }, icon('back', 16), 'Bibliothèque'),
    h('h1', { class: 'page-title' }, b.title), h('p', { class: 'muted' }, b.subtitle),
    ...groups.map(g => h('section', { class: 'unit-group' },
      h('h2', {}, g.section || ''),
      h('div', { class: 'unit-list' }, g.units.map(u => {
        const st = store.state.units[u.id];
        const status = !u.available ? 'locked' : st?.exDone ? 'done' : st?.lessonDone ? 'started' : 'todo';
        const label = { locked: 'Bientôt', done: st?.total ? `${Math.round((st.right / st.total) * 100)} %` : 'Terminée', started: 'En cours', todo: 'À faire' }[status];
        const inner = [h('span', { class: 'unit-n' }, String(u.n)), h('span', { class: 'unit-t' }, u.title), h('span', { class: `pill ${status}` }, status === 'locked' ? icon('lock', 12) : null, label)];
        return u.available ? h('a', { class: `unit-item ${status}`, href: `#/unit/${u.id}` }, inner) : h('div', { class: 'unit-item locked', title: 'Contenu en préparation' }, inner);
      })))));
}

function proverbsView(root) {
  const list = getProverbs();
  const search = h('input', { class: 'search', type: 'search', placeholder: 'Rechercher un proverbe (anglais ou français)…' });
  const grid = h('div', { class: 'proverb-list' });
  const draw = () => {
    const q = search.value.trim().toLowerCase();
    grid.replaceChildren(...list.filter(p => !q || (p.en + p.fr + p.meaning).toLowerCase().includes(q)).map(p => {
      const it = store.state.items[`c:p:${p.n}`];
      const st = !it ? '' : it.interval >= MASTERED_DAYS ? 'maîtrisé' : 'en cours';
      return h('details', { class: 'card proverb-item' },
        h('summary', {}, h('span', { class: 'unit-n' }, String(p.n)), h('span', { class: 'unit-t' }, p.en), st ? h('span', { class: 'pill ' + (st === 'maîtrisé' ? 'done' : 'started') }, st) : null),
        h('div', { class: 'proverb-body' },
          h('blockquote', {}, speakBtn(p.en), h('span', {}, p.en)),
          h('p', { class: 'flash-fr' }, p.fr), h('p', {}, p.meaning),
          p.example ? h('p', { class: 'flash-ex' }, speakBtn(p.example), h('span', {}, p.example)) : null));
    }));
  };
  search.addEventListener('input', draw);
  root.replaceChildren(h('a', { class: 'back', href: '#/library' }, icon('back', 16), 'Bibliothèque'),
    h('h1', { class: 'page-title' }, '150 Common English Proverbs'),
    h('p', { class: 'muted' }, `La séance du jour en introduit ${store.state.settings.newProverbsPerDay} par jour (réglable). ${store.state.proverbsIntroduced} déjà découverts.`),
    search, grid);
  draw();
}

export async function unitView(root, params) {
  const [uid, sub] = params;
  const meta = unitMeta(uid);
  if (!meta.available) return libraryView(root, [meta.book.key]);
  const unit = await loadUnit(uid);
  const back = h('a', { class: 'back', href: `#/library/${meta.book.key}` }, icon('back', 16), meta.book.short);

  if (sub === 'ex') {
    const holder = h('div');
    root.replaceChildren(back, holder);
    return runExercises(holder, exerciseIds(uid, unit), { title: `Exercices — ${meta.title}`, subtitle: `${meta.book.short} · Unité ${meta.n}`,
      onFinish: ({ right, total }) => { markUnitExercises(uid, right, total); location.hash = `#/unit/${uid}`; } });
  }
  if (sub === 'cards') {
    const holder = h('div');
    root.replaceChildren(back, holder);
    await markLessonDone(uid);
    return runCards(holder, cardIds(uid, unit), { title: `Cartes — ${meta.title}`, subtitle: 'Révision libre de l’unité', onFinish: () => { location.hash = `#/unit/${uid}`; } });
  }

  setMode('lesson');
  const st = store.state.units[uid];
  const cards = h('section', { class: 'card' }, h('h2', {}, icon('cards', 18), `Cartes de l’unité (${unit.cards?.length || 0})`),
    h('div', { class: 'card-preview' }, cardIds(uid, unit).map(id => {
      const c = cardData(id);
      return h('div', { class: 'mini-card' }, c.back.photo ? h('img', { class: 'mini-photo', src: c.back.photo.src, alt: '', loading: 'lazy' }) : c.back.pic ? h('span', { class: 'mini-pic', 'aria-hidden': 'true' }, c.back.pic) : speakBtn(c.back.en), h('div', {}, h('strong', { html: rich(c.front.q || c.back.en) }), h('div', { class: 'muted small', html: rich(c.front.q ? c.back.en : (c.back.fr || '')) })));
    })));
  root.replaceChildren(back, renderLesson(unit, meta),
    h('div', { class: 'card lesson-end' },
      st?.exDone ? h('p', {}, `Dernier score aux exercices : ${st.right} / ${st.total}.`) : h('p', {}, 'Après la lecture, passe aux exercices : c’est la pratique qui fixe la leçon.'),
      h('div', { class: 'row-actions' },
        h('a', { class: 'btn primary', href: `#/unit/${uid}/ex`, onclick: () => markLessonDone(uid) }, icon('pencil', 18), `Exercices (${unit.exercises?.length || 0})`),
        h('a', { class: 'btn amber', href: `#/unit/${uid}/cards` }, icon('cards', 18), 'Réviser les cartes'))),
    cards);
}
