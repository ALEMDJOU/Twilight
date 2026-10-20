// Télécharge la voix américaine Piper (moteur + modèle, ~100 Mo) dans public/vendor/piper.
// Une seule fois : ensuite la prononciation fonctionne entièrement hors ligne.
// Usage : npm run setup:voice
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = path.join(__dirname, '..', 'public', 'vendor', 'piper');
const ORT = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/';
const PIPER_WASM = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/';
const VITS_WEB = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/dist/';
const VOICE = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/';

// [fichier local, URL, empreinte SHA-256]
const FILES = [
  ['ort.wasm.min.js', ORT + 'ort.wasm.min.js', '90533a3fd7006df7f897c0d63c468996da5c8e430e39964d92ebe586c4996614'],
  ['ort-wasm-simd.wasm', ORT + 'ort-wasm-simd.wasm', 'f533b5f21790563d7556c611c3835ac65848ee326da2689aac54ed7d9cc8c6a4'],
  ['ort-wasm.wasm', ORT + 'ort-wasm.wasm', 'ebe7ec327f83aabc07e3b58487522481ccff10941f24182ab0428d0123652ff2'],
  ['piper_phonemize.js', VITS_WEB + 'piper-DeOu3H9E.js', 'e2701cb8c73580ab395a67ad036ea1a4a9e50500c33c8b8499d159c3638451f3'],
  ['piper_phonemize.wasm', PIPER_WASM + 'piper_phonemize.wasm', 'b777cd107a91d2bcc6a1ea46f2c26a662a7407394fe84589198aeaa83dd7a9d6'],
  ['piper_phonemize.data', PIPER_WASM + 'piper_phonemize.data', '29f1025eb23a5b5c192cd14a6efbce4509402ff265405072ee6f7d1a09b78f8c'],
  ['en_US-lessac-medium.onnx.json', VOICE + 'en_US-lessac-medium.onnx.json', 'efe19c417bed055f2d69908248c6ba650fa135bc868b0e6abb3da181dab690a0'],
  ['en_US-lessac-medium.onnx', VOICE + 'en_US-lessac-medium.onnx', '5efe09e69902187827af646e1a6e9d269dee769f9877d17b16b1b46eeaaf019f'],
];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

async function download(url, dest) {
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      const r = await fetch(url, { redirect: 'follow' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(dest + '.part', buf);
      fs.renameSync(dest + '.part', dest);
      return;
    } catch (e) {
      console.log(`  nouvel essai ${attempt}/8 (${e.message})`);
      await sleep(3000 * attempt);
    }
  }
  throw new Error('échec du téléchargement : ' + url);
}

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  for (const [name, url, hash] of FILES) {
    const dest = path.join(DIR, name);
    if (fs.existsSync(dest) && sha256(dest) === hash) { console.log(`✓ ${name} (déjà présent)`); continue; }
    console.log(`↓ ${name}`);
    await download(url, dest);
    if (sha256(dest) !== hash) { fs.unlinkSync(dest); throw new Error(`empreinte incorrecte pour ${name}`); }
    console.log(`✓ ${name}`);
  }
  console.log('Voix Piper installée : la prononciation fonctionne hors ligne.');
})().catch(e => { console.error(e.message); process.exit(1); });
