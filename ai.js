// Correcteur IA local : llama.cpp (llama-server) + petit modèle Qwen3, uniquement sur ce PC.
// Le moteur ne démarre qu'à la première demande et s'arrête après 10 minutes sans usage (libère ~1,5 Go de RAM).
// Installation : npm run setup:ai (fichiers dans models/).
const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const { spawn, execFileSync } = require('child_process');

const DIR = path.join(__dirname, 'models');
const MODEL = path.join(DIR, 'Qwen3-1.7B-Q4_K_M.gguf');
const IDLE_MS = 10 * 60 * 1000;
const THREADS = Number(process.env.AI_THREADS) || 4;   // mesuré sur un i5-7200U : 4 threads ≈ 14 jetons/s, 2 threads ≈ 12

// port : choisi libre à chaque démarrage, pour que deux copies de Twilight ne partagent jamais le même moteur.
let child = null, ready = null, idleTimer = null, busy = 0, port = 0;

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer().once('error', reject).listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
}

// llama-server.exe peut se trouver à la racine de l'archive ou dans un sous-dossier.
function findServer(dir = path.join(DIR, 'llama'), depth = 0) {
  if (!fs.existsSync(dir) || depth > 2) return null;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isFile() && /^llama-server(\.exe)?$/.test(e.name)) return p;
    if (e.isDirectory()) { const f = findServer(p, depth + 1); if (f) return f; }
  }
  return null;
}

function status() {
  const exe = findServer();
  return { installed: !!exe && fs.existsSync(MODEL), running: !!child, model: path.basename(MODEL, '.gguf') };
}

function get(p) {
  return new Promise(resolve => {
    const r = http.get({ host: '127.0.0.1', port, path: p, timeout: 2000 }, res => { res.resume(); resolve(res.statusCode); });
    r.on('error', () => resolve(0)); r.on('timeout', () => { r.destroy(); resolve(0); });
  });
}

function stop() {
  clearTimeout(idleTimer);
  if (child) { try { child.kill(); } catch { /* déjà arrêté */ } }
  child = null; ready = null;
}

function touch() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (!busy) stop(); else touch(); }, IDLE_MS);
}

// Si Twilight a été fermé brutalement, son llama-server a pu rester ouvert. On n'arrête que les orphelins :
// notre llama-server.exe (même chemin) dont le processus parent n'existe plus.
function killOrphans(exe) {
  if (process.platform !== 'win32') return;
  const ps = `Get-CimInstance Win32_Process -Filter "Name='llama-server.exe'" | Where-Object { $_.ExecutablePath -eq '${exe.replace(/'/g, "''")}' -and -not (Get-Process -Id $_.ParentProcessId -ErrorAction SilentlyContinue) } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`;
  try { execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], { windowsHide: true, stdio: 'ignore', timeout: 15000 }); } catch { /* rien à arrêter */ }
}

// Démarre llama-server si besoin et attend qu'il ait chargé le modèle.
function ensure() {
  if (ready) return ready;
  const exe = findServer();
  if (!exe || !fs.existsSync(MODEL)) return Promise.reject(new Error('not-installed'));
  ready = (async () => {
    killOrphans(exe);
    port = await freePort();
    const me = child = spawn(exe, ['-m', MODEL, '--host', '127.0.0.1', '--port', String(port), '-c', '4096', '-t', String(THREADS), '-ngl', '0', '--no-webui'],
      { cwd: path.dirname(exe), windowsHide: true, stdio: 'ignore' });
    me.on('exit', () => { if (child === me) { child = null; ready = null; } });
    const t0 = Date.now();
    // Jusqu'à 3 minutes : sur un PC chargé (navigateur, autre programme), le chargement du modèle peut être lent.
    while (Date.now() - t0 < 180000) {
      if (child !== me) throw new Error('engine-exited');
      if (await get('/health') === 200) return true;
      await new Promise(r => setTimeout(r, 500));
    }
    stop();
    throw new Error('engine-timeout');
  })();
  ready.catch(() => { ready = null; });
  return ready;
}

// Deux étapes, deux réglages : une correction stricte (température basse), puis un retour de professeur
// et un essay modèle (température plus haute pour réécrire vraiment). Le modèle (1,7 milliard de paramètres)
// n'écrit pas d'explications de grammaire, souvent fausses : elles viennent d'une liste vérifiée (mistakes.js).
const STAGES = {
  // Mesuré sur 4 essays (32 erreurs connues) : consigne stricte + exemples = 63 %, la meilleure et la plus rapide
  // des stratégies essayées ; le navigateur ajoute ensuite des corrections sûres (mistakes.js, autoFix) → 94 %.
  correct: ({ text }) => ({
    temperature: 0.1,
    max_tokens: Math.min(1200, Math.round(text.length / 2.5) + 120),
    system: `You are a meticulous English proofreader for French learners. Correct EVERY mistake: grammar, verb tenses and agreement, spelling, articles (no "the" before general nouns like life, people, technology, TV), prepositions, word order, uncountable nouns, and French-style expressions (calques). Do not change correct words. British and American spellings are both correct: keep the learner's spelling. Answer with the corrected text only.`,
    examples: [
      ['Yesterday I have went to the cinema with my familly.', 'Yesterday I went to the cinema with my family.'],
      ['My brother he is very sportive, so he make surf every week-end.', 'My brother is very sporty, so he goes surfing every weekend.'],
      ['I live in Paris since three years and I am agree with you.', 'I have lived in Paris for three years and I agree with you.'],
      ['The people is very nice and the life is not expensive.', 'People are very nice and life is not expensive.'],
    ],
    user: text,
  }),
  coach: ({ text, corrected, topic, level }) => ({
    temperature: 0.6,
    max_tokens: 1100,
    system: `You are an experienced English teacher who marks essays written by French learners. Be honest, specific and encouraging. Speak to the learner directly with "you". Write only in English, in simple words.`,
    // Le sujet vient de l'application (topics.js), avec son type d'écrit et ses questions guides.
    user: `Writing task given to the learner:
${topic || '(free topic)'}

Learner's essay:
${text}

Same essay with the grammar corrected:
${corrected}

Write exactly these three sections:

### SCORES
Task: X/5 (does the essay answer this task and its guiding questions, with the right kind of text? Give 1 or 2 if it is about something else.)
Organisation: X/5 (introduction, paragraphs, conclusion, linking words)
Vocabulary: X/5 (range and precision of the words)
Level: A2, B1, B2 or C1

### ADVICE
Exactly three tips, one per line starting with "- ". Each tip must be about THIS essay: how well it answers the task and its guiding questions, its ideas, its structure or its linking words, with a concrete example taken from the essay. Do not give grammar tips.

### MODEL
A model answer to THIS task at ${level} level, of the same kind (essay, email, story or description), that answers the guiding questions and uses the learner's ideas when they fit the task. Do not copy the learner's sentences: rewrite them with richer vocabulary, develop each idea with a reason or an example, and add one new relevant idea. Write it in 3 or 4 paragraphs separated by a blank line. Only if the task asks for an email: start with a greeting and end with a friendly closing; otherwise no greeting, no "Dear", no signature. Do not write paragraph titles. Use linking words (However, Moreover, For example, As a result, In conclusion…). About ${Math.max(120, Math.min(260, Math.round(text.split(/\s+/).length * 1.4)))} words.

Plain text only: no bold, no asterisks, no markdown.`,
  }),
};

// Une étape (correct | coach) : envoie la réponse du modèle au navigateur au fur et à mesure (texte brut).
async function coach(req, res, body) {
  const text = String(body.text || '').slice(0, 4000).trim();
  const stage = STAGES[body.stage] || STAGES.correct;
  if (!text) { res.writeHead(400); return res.end('empty'); }
  const short = (v, n) => String(v || '').slice(0, n);
  const p = stage({ text, corrected: short(body.corrected || text, 4000), topic: short(body.topic, 800), level: /^(A2|B1|B2|C1)$/.test(body.level) ? body.level : 'B2' });
  try { await ensure(); } catch (e) { res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end(e.message); }
  busy++; touch();
  let finished = false;
  const finish = () => { if (finished) return; finished = true; busy--; touch(); if (!res.writableEnded) res.end(); };
  const payload = JSON.stringify({
    messages: [{ role: 'system', content: p.system },
      ...(p.examples || []).flatMap(([q, a]) => [{ role: 'user', content: q }, { role: 'assistant', content: a }]),
      { role: 'user', content: p.user + '\n/no_think' }],
    stream: true, temperature: p.temperature, top_p: 0.9, max_tokens: p.max_tokens,
    chat_template_kwargs: { enable_thinking: false },
  });
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
  const up = http.request({ host: '127.0.0.1', port, path: '/v1/chat/completions', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } }, r => {
    let buf = '';
    r.setEncoding('utf8');
    r.on('data', chunk => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        try { const d = JSON.parse(data).choices?.[0]?.delta?.content; if (d) res.write(d); } catch { /* ligne incomplète */ }
      }
    });
    r.on('end', finish);
  });
  up.on('error', finish);
  up.on('close', finish);
  // L'utilisateur annule : on arrête aussi la génération.
  res.on('close', () => { if (!res.writableEnded) up.destroy(); });
  up.end(payload);
}

process.on('exit', stop);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { stop(); process.exit(0); });

module.exports = { status, coach, ensure, stop };
