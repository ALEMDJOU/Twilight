// Point d'entrée de Twilight : chargement, navigation par #/route.
import { store, streak } from './store.js';
import { initContent } from './content.js';
import { h, icon, setMode, applyTheme, toggleTheme, toast, initBackToTop } from './ui.js';
import { stagger } from './fx.js';
import { dashboardView } from './views/dashboard.js';
import { todayView } from './views/today.js';
import { libraryView, unitView } from './views/library.js';
import { reviewView } from './views/review.js';
import { settingsView } from './views/settings.js';

const ROUTES = {
  '': dashboardView,
  today: todayView,
  library: libraryView,
  unit: unitView,
  review: reviewView,
  settings: settingsView,
};

const NAV = [
  ['', 'home', 'Accueil'],
  ['today', 'play', 'Séance'],
  ['library', 'book', 'Livres'],
  ['review', 'cards', 'Révisions'],
  ['settings', 'gear', 'Réglages'],
];

const main = document.getElementById('main');

function buildNav() {
  const nav = document.getElementById('nav');
  nav.replaceChildren(h('span', { class: 'nav-pill', 'aria-hidden': 'true' }), ...NAV.map(([r, ic, label]) => h('a', { href: `#/${r}`, 'data-route': r }, icon(ic, 20), h('span', {}, label))));
  addEventListener('resize', movePill);
}

// La pastille colorée glisse sous l'onglet actif.
function movePill() {
  const pill = document.querySelector('.nav-pill');
  const a = document.querySelector('#nav a.active');
  if (!pill) return;
  if (!a) { pill.style.width = '0'; return; }
  pill.style.width = `${a.offsetWidth}px`;
  pill.style.transform = `translateX(${a.offsetLeft}px)`;
}


function updateChrome(route) {
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.route === route || (route === 'unit' && a.dataset.route === 'library')));
  const s = streak();
  document.getElementById('streak').replaceChildren(icon('flame', 16), h('span', {}, String(s)));
  document.getElementById('streak').title = `${s} jour${s > 1 ? 's' : ''} de suite (au moins 15 min)`;
  requestAnimationFrame(movePill);
}

async function render() {
  main._cleanup?.();
  main._cleanup = null;
  setMode(null);
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const route = parts[0] || '';
  const view = ROUTES[route] || dashboardView;
  updateChrome(route);
  main.classList.remove('view-enter');
  void main.offsetWidth;
  main.classList.add('view-enter');
  try {
    await view(main, parts.slice(1));
    stagger(main);
  } catch (e) {
    console.error(e);
    main.replaceChildren(h('div', { class: 'card' }, h('h2', {}, 'Oups, une erreur est survenue.'), h('pre', { class: 'muted small' }, String(e.stack || e))));
  }
  main.focus({ preventScroll: true });
}

async function start() {
  await store.load();
  applyTheme();
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  await initContent();
  buildNav();
  initBackToTop();
  // Bandeau discret quand le serveur est arrêté : on continue hors ligne, la synchro se fera au retour.
  const banner = h('div', { class: 'offline-banner', hidden: true }, 'Mode hors ligne : ta progression est gardée dans ce navigateur et sera synchronisée dès que Twilight (le serveur) sera relancé.');
  document.body.prepend(banner);
  const syncBanner = () => { banner.hidden = store.online; };
  syncBanner();
  store.on(syncBanner);
  // Aucune voix anglaise locale : on explique comment l'installer pour la prononciation hors ligne.
  document.addEventListener('tts-missing', () => toast('Pas de voix anglaise installée : voir Réglages → Voix pour la prononciation hors ligne.', 'warn'));
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(reg => reg.active?.postMessage('sync')).catch(() => {});
  }
  addEventListener('hashchange', render);
  addEventListener('beforeunload', () => store.save(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) store.save(true); });
  document.getElementById('loading')?.remove();
  render();
}

start().catch(e => {
  console.error(e);
  main.replaceChildren(h('div', { class: 'card' }, h('h2', {}, 'Impossible de charger Twilight.'), h('p', {}, 'Lance l’application avec « Lancer Twilight.bat ».'), h('pre', { class: 'muted small' }, String(e))));
});
