// Point d'entrée de Twilight : chargement, navigation par #/route.
import { store, streak } from './store.js';
import { initContent } from './content.js';
import { h, icon, setMode, getMode, applyTheme, toggleTheme, toast, initBackToTop, route as renderGen } from './ui.js';
import { stagger } from './fx.js';
import { dashboardView } from './views/dashboard.js';
import { todayView } from './views/today.js';
import { libraryView, unitView } from './views/library.js';
import { reviewView } from './views/review.js';
import { settingsView } from './views/settings.js';
import { stressView } from './views/stress.js';

const ROUTES = {
  '': dashboardView,
  today: todayView,
  library: libraryView,
  unit: unitView,
  review: reviewView,
  stress: stressView,
  settings: settingsView,
};

const NAV = [
  ['', 'home', 'Accueil'],
  ['today', 'play', 'Séance'],
  ['library', 'book', 'Livres'],
  ['review', 'cards', 'Révisions'],
  ['stress', 'sound', 'Accent'],
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
  let label = 'Accueil';
  document.querySelectorAll('#nav a').forEach(a => {
    const on = a.dataset.route === route || (route === 'unit' && a.dataset.route === 'library');
    a.classList.toggle('active', on);
    if (on) { a.setAttribute('aria-current', 'page'); label = a.textContent.trim(); } else a.removeAttribute('aria-current');
  });
  document.title = `${label} · Twilight`;
  const s = streak();
  const badge = document.getElementById('streak');
  const txt = `${s} jour${s > 1 ? 's' : ''} de suite (au moins 15 min par jour)`;
  // Série : texte visible court, phrase complète pour les lecteurs d'écran et en info-bulle.
  badge.replaceChildren(icon('flame', 16), h('span', { 'aria-hidden': 'true' }, `${s} jour${s > 1 ? 's' : ''}`), h('span', { class: 'sr-only' }, `Série : ${txt}`));
  badge.title = `Série : ${txt}`;
  badge.removeAttribute('aria-label');
  requestAnimationFrame(movePill);
}

async function render() {
  const gen = ++renderGen.gen;
  main._cleanup?.();
  main._cleanup = null;
  main.querySelectorAll('.anchor-nav').forEach(n => n._disconnect?.());
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
    if (gen !== renderGen.gen) return; // une autre page a été demandée pendant le chargement
    stagger(main);
  } catch (e) {
    if (gen !== renderGen.gen) return;
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
  // Progression mise à jour par un autre onglet : on réaffiche la page, sauf en pleine leçon ou exercice.
  addEventListener('twilight-sync', () => { applyTheme(); if (!getMode()) render(); });
  addEventListener('beforeunload', () => store.save(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) store.save(true); });
  document.getElementById('loading')?.remove();
  render();
}

start().catch(e => {
  console.error(e);
  main.replaceChildren(h('div', { class: 'card' }, h('h2', {}, 'Impossible de charger Twilight.'), h('p', {}, 'Lance l’application avec « Lancer Twilight.bat ».'), h('pre', { class: 'muted small' }, String(e))));
});
