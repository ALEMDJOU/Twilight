// Voix Piper (américaine « lessac ») entièrement locale : phonétiseur eSpeak-ng + réseau VITS via ONNX Runtime Web.
// Tous les fichiers sont dans public/vendor/piper : aucune connexion n'est nécessaire.
const BASE = 'vendor/piper/';
const MODEL = 'en_US-lessac-medium.onnx';

let ready = null;          // promesse de chargement
let ort = null, session = null, config = null, wasmBinary = null, espeakData = null;
let ctx = null, current = null;
const cache = new Map();   // texte → AudioBuffer (les phrases réécoutées sont instantanées)

function loadScript(src) {
  return new Promise((res, rej) => {
    if (window.ort) return res();
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('script ' + src));
    document.head.append(s);
  });
}

async function fetchBuf(name) {
  const r = await fetch(BASE + name);
  if (!r.ok) throw new Error(name + ' ' + r.status);
  return r.arrayBuffer();
}

export function piperLoad() {
  if (ready) return ready;
  ready = (async () => {
    await loadScript(BASE + 'ort.wasm.min.js');
    ort = window.ort;
    ort.env.wasm.wasmPaths = BASE;
    ort.env.wasm.numThreads = 1;        // pas besoin d'isolation cross-origin
    const [cfg, model, wasm, data] = await Promise.all([
      fetch(BASE + MODEL + '.json').then(r => r.json()),
      fetchBuf(MODEL), fetchBuf('piper_phonemize.wasm'), fetchBuf('piper_phonemize.data'),
    ]);
    config = cfg; wasmBinary = wasm; espeakData = data;
    session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'] });
    return true;
  })();
  ready.catch(() => { ready = null; });
  return ready;
}

// Disponible si les fichiers sont présents (sans forcer le chargement complet).
// Le cache du Service Worker d'abord (hors ligne, il ignore les requêtes HEAD), puis le serveur.
let probe = null;
export function piperAvailable() {
  if (!probe) probe = (async () => {
    const url = BASE + MODEL + '.json';
    try { if ('caches' in window && await caches.match(url)) return true; } catch { /* cache indisponible */ }
    return fetch(url, { method: 'HEAD' }).then(r => r.ok).catch(() => false);
  })();
  return probe;
}

// Texte → identifiants de phonèmes (le module eSpeak est recréé à chaque appel, à partir des octets déjà en mémoire).
async function phonemeIds(text) {
  // /…/ : phonèmes IPA donnés tels quels, pour imposer l'accent quand le phonétiseur se trompe.
  if (/^\/.*\/$/.test(text)) {
    const m = config.phoneme_id_map, ids = [...m['^'], ...m['_']];
    for (const c of text.slice(1, -1)) if (m[c]) ids.push(...m[c], ...m['_']);
    return [...ids, ...m['$']];
  }
  const { createPiperPhonemize } = await import('../vendor/piper/piper_phonemize.js');
  return new Promise((resolve, reject) => {
    let done = false;
    createPiperPhonemize({
      wasmBinary,
      getPreloadedPackage: () => espeakData,
      locateFile: f => BASE + f,
      print: line => { if (!done) { done = true; resolve(JSON.parse(line).phoneme_ids); } },
      printErr: e => { if (!done) { done = true; reject(new Error(e)); } },
    }).then(m => m.callMain(['-l', config.espeak.voice, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data']))
      .catch(e => { if (!done) { done = true; reject(e); } });
  });
}

async function synthSentence(text, lengthScale, noiseScale) {
  const ids = await phonemeIds(text);
  const inf = config.inference;
  const feeds = {
    input: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
    input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor('float32', Float32Array.from([noiseScale ?? inf.noise_scale, lengthScale, inf.noise_w]), [3]),
  };
  const out = await session.run(feeds);
  return out.output.data;
}

// Découpe en phrases : le modèle est plus naturel et plus rapide sur des morceaux courts.
const split = t => t.match(/[^.!?…]+[.!?…]*["”’)]*\s*/g)?.map(s => s.trim()).filter(Boolean) || [t];

// expressive : intonation plus variée (sert aux compliments).
async function synth(text, rate, expressive = false) {
  const key = rate + '|' + expressive + '|' + text;
  if (cache.has(key)) return cache.get(key);
  const lengthScale = (config.inference.length_scale || 1) / (rate || 1);
  const parts = [];
  for (const s of split(text)) parts.push(await synthSentence(s, lengthScale, expressive ? config.inference.noise_scale * 1.3 : undefined));
  const sr = config.audio.sample_rate, gap = Math.round(sr * 0.18);
  const len = parts.reduce((n, p) => n + p.length + gap, 0);
  ctx = ctx || new AudioContext();
  const buf = ctx.createBuffer(1, len, sr), ch = buf.getChannelData(0);
  let o = 0;
  for (const p of parts) { ch.set(p, o); o += p.length + gap; }
  cache.set(key, buf);
  if (cache.size > 80) cache.delete(cache.keys().next().value);
  return buf;
}

export function piperStop() {
  if (current) { try { current.onended = null; current.stop(); } catch { /* déjà fini */ } current = null; }
}

let token = 0;
// opts.pitch > 1 : voix un peu plus aiguë et enjouée (le débit est compensé) ; opts.expressive : intonation plus vivante.
export async function piperSpeak(text, rate, onEnd, opts = {}) {
  piperStop();
  const my = ++token;
  await piperLoad();
  const pitch = opts.pitch || 1;
  const buf = await synth(text, rate / pitch, opts.expressive);
  if (my !== token) return;            // une autre lecture a été demandée entre-temps
  ctx = ctx || new AudioContext();
  // Sans clic préalable, Chrome garde l'audio suspendu : on ne bloque pas en l'attendant.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const src = ctx.createBufferSource();
  src.buffer = buf; src.playbackRate.value = pitch; src.connect(ctx.destination);
  src.onended = () => { if (current === src) current = null; onEnd?.(); };
  current = src;
  src.start();
}

// Synthèse sans lecture (sert aussi à tester la reconnaissance vocale).
export async function piperSynth(text, rate = 1) {
  await piperLoad();
  return synth(text, rate);
}
