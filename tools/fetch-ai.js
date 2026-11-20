// Télécharge le correcteur IA local dans models/ (une seule fois, empreintes vérifiées) :
//   - llama.cpp (serveur d'inférence sur processeur, ~25 Mo) ;
//   - modèle Qwen3-1.7B quantifié Q4_K_M (~1,1 Go, licence Apache-2.0).
// Le téléchargement reprend là où il s'est arrêté si la connexion coupe.
// Usage : npm run setup:ai
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const MODELS = path.join(__dirname, '..', 'models');
const LLAMA = 'https://github.com/ggml-org/llama.cpp/releases/download/b12363/';
const QWEN = 'https://huggingface.co/unsloth/Qwen3-1.7B-GGUF/resolve/main/';

// [fichier local (dans models/), URL, empreinte SHA-256, taille en octets]
const FILES = [
  ['llama-b12363-bin-win-cpu-x64.zip', LLAMA + 'llama-b12363-bin-win-cpu-x64.zip', '70bc749372c09c52e7f882c206e6d5d2aabc7f1e8e8e3ae17eb27d7a868a4d37', 25100645],
  ['Qwen3-1.7B-Q4_K_M.gguf', QWEN + 'Qwen3-1.7B-Q4_K_M.gguf', 'b139949c5bd74937ad8ed8c8cf3d9ffb1e99c866c823204dc42c0d91fa181897', 1107409472],
];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const sha256 = file => new Promise((resolve, reject) => {
  const h = crypto.createHash('sha256');
  fs.createReadStream(file).on('data', d => h.update(d)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
});
const mb = n => (n / 1048576).toFixed(0);

// Téléchargement en flux, reprise avec l'en-tête Range après chaque coupure.
async function download(url, dest, size) {
  const part = dest + '.part';
  let lastLog = 0;
  for (let attempt = 1; attempt <= 300; attempt++) {
    const have = fs.existsSync(part) ? fs.statSync(part).size : 0;
    if (have >= size) break;
    try {
      const r = await fetch(url, { redirect: 'follow', headers: have ? { Range: `bytes=${have}-` } : {} });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // Le serveur ignore la reprise (200 au lieu de 206) : il renvoie tout le fichier, on repart de zéro.
      const resume = have > 0 && r.status === 206;
      const out = fs.createWriteStream(part, { flags: resume ? 'a' : 'w' });
      let got = resume ? have : 0;
      for await (const chunk of r.body) {
        if (!out.write(chunk)) await new Promise(res => out.once('drain', res));
        got += chunk.length;
        if (Date.now() - lastLog > 15000) { lastLog = Date.now(); console.log(`  ${mb(got)} / ${mb(size)} Mo`); }
      }
      await new Promise(res => out.end(res));
    } catch (e) {
      console.log(`  coupure, reprise dans un instant (${attempt}) : ${e.cause?.code || e.message}`);
      await sleep(Math.min(30000, 2000 * attempt));
    }
  }
  if (fs.statSync(part).size !== size) throw new Error('échec du téléchargement : ' + url);
  fs.renameSync(part, dest);
}

(async () => {
  fs.mkdirSync(MODELS, { recursive: true });
  const dir = path.join(MODELS, 'llama');
  const extracted = fs.existsSync(path.join(dir, 'llama-server.exe'));
  for (const [name, url, hash, size] of FILES) {
    const dest = path.join(MODELS, name);
    if (name.endsWith('.zip') && extracted) { console.log(`✓ llama.cpp (déjà installé)`); continue; }
    if (fs.existsSync(dest) && await sha256(dest) === hash) { console.log(`✓ ${name} (déjà présent)`); continue; }
    console.log(`↓ ${name} (${mb(size)} Mo)`);
    await download(url, dest, size);
    if (await sha256(dest) !== hash) { fs.unlinkSync(dest); throw new Error(`empreinte incorrecte pour ${name}`); }
    console.log(`✓ ${name}`);
  }
  // Décompresse llama.cpp (tar de Windows sait lire les .zip), puis supprime l'archive.
  if (!extracted) {
    fs.mkdirSync(dir, { recursive: true });
    execFileSync('tar', ['-xf', path.join(MODELS, FILES[0][0]), '-C', dir]);
    fs.unlinkSync(path.join(MODELS, FILES[0][0]));
  }
  console.log('Correcteur IA local installé : il fonctionne hors ligne.');
})().catch(e => { console.error(e.message); process.exit(1); });
