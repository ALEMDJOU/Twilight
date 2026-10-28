// Reconnaissance vocale entièrement locale avec Vosk (modèle anglais « small », ~40 Mo, dans public/vendor/vosk).
// Sert à l'entraînement à la prononciation : on compare ce que Vosk entend à la phrase attendue.
const BASE = new URL('../vendor/vosk/', import.meta.url).href;
const MODEL = BASE + 'vosk-model-small-en-us-0.15.tar.gz';

let modelPromise = null;
let probe = null;

export function speechAvailable() {
  if (!navigator.mediaDevices?.getUserMedia) return Promise.resolve(false);
  if (!probe) probe = fetch(MODEL, { method: 'HEAD' }).then(r => r.ok).catch(() => false);
  return probe;
}

function loadScript(src) {
  return new Promise((res, rej) => {
    if (window.Vosk) return res();
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('script ' + src));
    document.head.append(s);
  });
}

export function loadSpeech() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await loadScript(BASE + 'vosk.js');
      const model = await window.Vosk.createModel(MODEL);
      model.setLogLevel?.(-1);
      return model;
    })();
    modelPromise.catch(() => { modelPromise = null; });
  }
  return modelPromise;
}

// Mots de la phrase attendue : on limite la grammaire de Vosk à ces mots (+ [unk]),
// ce qui rend la reconnaissance bien plus fiable pour un apprenant.
const words = s => String(s).toLowerCase().replace(/[’']/g, "'").replace(/[^a-z' ]+/g, ' ').split(/\s+/).filter(Boolean);

// Démarre l'écoute du micro avec deux reconnaisseurs alimentés par le même son :
//   - « guidé » : limité aux mots attendus (fiable, mais indulgent) ;
//   - « strict » : écoute libre (il faut vraiment prononcer le mot pour qu'il soit reconnu).
// Renvoie { stop } : stop() résout avec { strict, guided } (textes reconnus).
export async function listen(expected, onPartial) {
  const model = await loadSpeech();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
  // Vosk attend du 16 kHz : Chrome rééchantillonne le micro à cette fréquence.
  const ctx = new AudioContext({ sampleRate: 16000 });
  const grammar = JSON.stringify([...new Set(words(expected))].concat(['[unk]']));
  const make = g => {
    const rec = g ? new model.KaldiRecognizer(ctx.sampleRate, g) : new model.KaldiRecognizer(ctx.sampleRate);
    const st = { rec, parts: [], partial: '', final: false };
    rec.on('result', m => { const t = m.result?.text; if (t) st.parts.push(t); st.partial = ''; st.final = true; });
    rec.on('partialresult', m => { st.partial = m.result?.partial || ''; });
    return st;
  };
  const strict = make(null), guided = make(grammar);
  const text = st => [...st.parts, st.partial].join(' ').replace(/\[unk\]/g, ' ').replace(/\s+/g, ' ').trim();
  const src = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  proc.onaudioprocess = e => {
    try { strict.rec.acceptWaveform(e.inputBuffer); guided.rec.acceptWaveform(e.inputBuffer); } catch { /* tampon ignoré */ }
    onPartial?.(text(strict));
  };
  src.connect(proc); proc.connect(ctx.destination);
  return {
    stop: () => new Promise(resolve => {
      proc.disconnect(); src.disconnect();
      stream.getTracks().forEach(t => t.stop());
      strict.final = guided.final = false;
      try { strict.rec.retrieveFinalResult(); guided.rec.retrieveFinalResult(); } catch { /* déjà terminé */ }
      const t0 = Date.now();
      const wait = () => {
        if ((strict.final && guided.final) || Date.now() - t0 > 1500) {
          ctx.close().catch(() => {});
          try { strict.rec.remove(); guided.rec.remove(); } catch { /* déjà libérés */ }
          resolve({ strict: text(strict), guided: text(guided) });
        } else setTimeout(wait, 60);
      };
      wait();
    }),
  };
}
