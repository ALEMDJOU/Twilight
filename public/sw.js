// Service Worker de Twilight : l'application s'ouvre et fonctionne même sans serveur ni internet.
// Tous les fichiers (code, polices, unités, photos) sont gardés dans le cache du navigateur.
// Deux caches : CACHE (code et unités, renouvelé à chaque version) et ASSETS (voix, moteurs, photos, polices :
// ~170 Mo qui ne changent pas d'une version à l'autre ; jamais vidé en bloc, seulement des fichiers qui ne sont plus listés).
const CACHE = 'twilight-v41';
const ASSETS = 'twilight-assets';
// Voix Piper (environ 100 Mo) : gardée dans le cache pour parler sans internet.
const VOICE = ['ort.wasm.min.js', 'ort-wasm-simd.wasm', 'ort-wasm.wasm', 'piper_phonemize.js', 'piper_phonemize.wasm', 'piper_phonemize.data', 'en_US-lessac-medium.onnx.json', 'en_US-lessac-medium.onnx'].map(f => 'vendor/piper/' + f)
  .concat(['vendor/vosk/vosk.js', 'vendor/vosk/vosk-model-small-en-us-0.15.tar.gz'])
  .concat(['index.js', 'BinaryModule-S5UABkWQ.js', 'slimBinary.js', 'harper_wasm_slim_bg.wasm'].map(f => 'vendor/harper/' + f));
const SHELL = [
  './', 'index.html', 'favicon.svg', 'css/style.css', 'css/writing.css',
  'js/app.js', 'js/store.js', 'js/srs.js', 'js/content.js', 'js/check.js', 'js/tts.js', 'js/ui.js', 'js/fx.js',
  'js/components.js', 'js/session.js', 'js/piper.js', 'js/speech.js', 'js/listening.js', 'js/grammar.js', 'js/writing.js', 'js/coach.js', 'js/mistakes.js', 'js/topics.js', 'js/scenes.js', 'js/stress-data.js',
  'js/views/dashboard.js', 'js/views/today.js', 'js/views/library.js', 'js/views/review.js', 'js/views/settings.js', 'js/views/stress.js',
  'content/catalog.json', 'content/index.json', 'content/proverbs.json', 'content/images.json',
];
const FONTS = [
  'fonts/great-vibes-latin-400-normal.woff2', 'fonts/fraunces-latin-wght-normal.woff2', 'fonts/fraunces-latin-ext-wght-normal.woff2', 'fonts/fraunces-latin-wght-italic.woff2',
  'fonts/plus-jakarta-sans-latin-wght-normal.woff2', 'fonts/plus-jakarta-sans-latin-ext-wght-normal.woff2', 'fonts/plus-jakarta-sans-latin-wght-italic.woff2',
];
const isAsset = path => /^\/(vendor|img|fonts)\//.test(path);
const abs = u => new URL(u, self.registration.scope).href;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    await (await caches.open(CACHE)).addAll(SHELL);
    // Polices : seulement celles qui manquent (elles restent d'une version à l'autre).
    const assets = await caches.open(ASSETS);
    const missing = [];
    for (const u of FONTS) if (!(await assets.match(u))) missing.push(u);
    if (missing.length) await assets.addAll(missing);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const assets = await caches.open(ASSETS);
    for (const k of await caches.keys()) {
      if (k === CACHE || k === ASSETS) continue;
      // Ancienne version : on récupère d'abord la voix, les moteurs et les photos pour ne pas les retélécharger.
      const old = await caches.open(k);
      for (const req of await old.keys()) {
        if (!isAsset(new URL(req.url).pathname) || await assets.match(req)) continue;
        const hit = await old.match(req);
        if (hit) await assets.put(req, hit).catch(() => {});
      }
      await caches.delete(k);
    }
    await self.clients.claim();
    precacheContent();
  })());
});

// Met en cache toutes les unités et photos disponibles (appelé à l'activation et à chaque ouverture).
// Un seul passage à la fois : l'activation et le message 'sync' de la page partagent le même téléchargement.
let precaching = null;
function precacheContent() {
  if (!precaching) precaching = doPrecache().finally(() => { precaching = null; });
  return precaching;
}

async function doPrecache() {
  try {
    const cache = await caches.open(CACHE), assets = await caches.open(ASSETS);
    const [idx, imgs] = await Promise.all([
      fetch('content/index.json', { cache: 'no-store' }).then(r => r.json()),
      fetch('content/images.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]);
    await cache.put('content/index.json', new Response(JSON.stringify(idx), { headers: { 'Content-Type': 'application/json' } }));
    const photos = imgs ? Object.values(imgs).filter(Boolean).map(i => i.file) : [];
    const list = [
      ...VOICE.map(u => [assets, u]),
      ...idx.units.map(u => [cache, `content/units/${u}.json`]),
      ...photos.map(u => [assets, u]),
    ];
    for (const [c, u] of list) {
      if (!(await c.match(u))) {
        try { const r = await fetch(u); if (r.ok) await c.put(u, r); } catch { /* hors ligne : on réessaiera */ }
      }
    }
    // Ménage dans ASSETS : fichiers qui ne sont plus listés (seulement si la liste des photos a bien été lue).
    if (imgs) {
      const keep = new Set([...VOICE, ...FONTS, ...photos].map(abs));
      for (const req of await assets.keys()) if (!keep.has(req.url)) await assets.delete(req);
    }
  } catch { /* serveur indisponible */ }
}

self.addEventListener('message', e => { if (e.data === 'sync') e.waitUntil(precacheContent()); });

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return; // la progression passe toujours par le serveur (ou localStorage)

  // Photos : le cache d'abord (elles ne changent jamais).
  if (isAsset(url.pathname)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      const copy = r.clone();
      if (r.ok) caches.open(ASSETS).then(c => c.put(e.request, copy));
      return r;
    })));
    return;
  }

  // Le reste (code, unités, index) : le serveur local d'abord pour avoir la dernière version,
  // le cache seulement si le serveur ne répond pas (hors ligne).
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const r = await fetch(e.request, { cache: 'no-store' });
      if (r.ok) cache.put(e.request, r.clone());
      return r;
    } catch {
      return (await cache.match(e.request, { ignoreSearch: true }))
        || (url.pathname === '/' || url.pathname.endsWith('.html') ? cache.match('index.html') : Response.error());
    }
  })());
});
