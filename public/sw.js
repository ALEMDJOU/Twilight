// Service Worker de Twilight : l'application s'ouvre et fonctionne même sans serveur ni internet.
// Tous les fichiers (code, polices, unités, photos) sont gardés dans le cache du navigateur.
const CACHE = 'twilight-v19';
// Voix Piper (environ 100 Mo) : gardée dans le cache pour parler sans internet.
const VOICE = ['ort.wasm.min.js', 'ort-wasm-simd.wasm', 'ort-wasm.wasm', 'piper_phonemize.js', 'piper_phonemize.wasm', 'piper_phonemize.data', 'en_US-lessac-medium.onnx.json', 'en_US-lessac-medium.onnx'].map(f => 'vendor/piper/' + f)
  .concat(['vendor/vosk/vosk.js', 'vendor/vosk/vosk-model-small-en-us-0.15.tar.gz'])
  .concat(['index.js', 'BinaryModule-S5UABkWQ.js', 'slimBinary.js', 'harper_wasm_slim_bg.wasm'].map(f => 'vendor/harper/' + f));
const SHELL = [
  './', 'index.html', 'favicon.svg', 'css/style.css',
  'js/app.js', 'js/store.js', 'js/srs.js', 'js/content.js', 'js/check.js', 'js/tts.js', 'js/ui.js', 'js/fx.js',
  'js/components.js', 'js/session.js', 'js/piper.js', 'js/speech.js', 'js/listening.js', 'js/grammar.js', 'js/writing.js', 'js/scenes.js',
  'js/views/dashboard.js', 'js/views/today.js', 'js/views/library.js', 'js/views/review.js', 'js/views/settings.js',
  'fonts/fraunces-latin-wght-normal.woff2', 'fonts/fraunces-latin-ext-wght-normal.woff2', 'fonts/fraunces-latin-wght-italic.woff2',
  'fonts/plus-jakarta-sans-latin-wght-normal.woff2', 'fonts/plus-jakarta-sans-latin-ext-wght-normal.woff2', 'fonts/plus-jakarta-sans-latin-wght-italic.woff2',
  'content/catalog.json', 'content/index.json', 'content/proverbs.json', 'content/images.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
    precacheContent();
  })());
});

// Met en cache toutes les unités et photos disponibles (appelé à l'activation et à chaque ouverture).
async function precacheContent() {
  try {
    const cache = await caches.open(CACHE);
    const [idx, imgs] = await Promise.all([
      fetch('content/index.json', { cache: 'no-store' }).then(r => r.json()),
      fetch('content/images.json', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
    ]);
    await cache.put('content/index.json', new Response(JSON.stringify(idx), { headers: { 'Content-Type': 'application/json' } }));
    const urls = [
      ...VOICE,
      ...idx.units.map(u => `content/units/${u}.json`),
      ...Object.values(imgs).filter(Boolean).map(i => i.file),
    ];
    for (const u of urls) {
      if (!(await cache.match(u))) {
        try { const r = await fetch(u); if (r.ok) await cache.put(u, r); } catch { /* hors ligne : on réessaiera */ }
      }
    }
  } catch { /* serveur indisponible */ }
}

self.addEventListener('message', e => { if (e.data === 'sync') e.waitUntil(precacheContent()); });

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return; // la progression passe toujours par le serveur (ou localStorage)

  // Photos : le cache d'abord (elles ne changent jamais).
  if (url.pathname.startsWith('/img/') || url.pathname.startsWith('/fonts/') || url.pathname.startsWith('/vendor/')) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      const copy = r.clone();
      if (r.ok) caches.open(CACHE).then(c => c.put(e.request, copy));
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
