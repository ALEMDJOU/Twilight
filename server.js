// Twilight — serveur local sans dépendance.
// Sert l'application (dossier public/) et enregistre la progression dans la base SQLite data/twilight.db.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const db = require('./db');
const ai = require('./ai');

const PORT = Number(process.env.PORT) || 4317;
const ROOT = path.join(__dirname, 'public');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.wasm': 'application/wasm',
  '.onnx': 'application/octet-stream',
  '.data': 'application/octet-stream',
};


// ---- Rappel quotidien : tâche du Planificateur de tâches Windows (fonctionne hors ligne) ----
const { execFile } = require('child_process');
const TASK = 'Twilight - Rappel quotidien';
const run = (cmd, args) => new Promise(res => execFile(cmd, args, { windowsHide: true }, (err, out) => res({ ok: !err, out: String(out || '') })));

async function reminderStatus() {
  if (process.platform !== 'win32') return { supported: false };
  // Le format XML ne dépend pas de la langue de Windows.
  const r = await run('schtasks', ['/Query', '/TN', TASK, '/XML']);
  if (!r.ok) return { supported: true, enabled: false };
  const time = (r.out.match(/<StartBoundary>[^T]*T(\d{2}:\d{2})/) || [])[1] || null;
  return { supported: true, enabled: true, time };
}

async function setReminder(enabled, time) {
  if (process.platform !== 'win32') return { supported: false };
  if (!enabled) { await run('schtasks', ['/Delete', '/TN', TASK, '/F']); return reminderStatus(); }
  if (!/^\d{2}:\d{2}$/.test(time)) throw new Error('heure invalide');
  const vbs = path.join(__dirname, 'tools', 'remind.vbs');
  const tr = `wscript.exe "${vbs}" "${process.execPath}"`;
  const r = await run('schtasks', ['/Create', '/F', '/SC', 'DAILY', '/TN', TASK, '/ST', time, '/TR', tr]);
  if (!r.ok) throw new Error('création de la tâche impossible');
  return reminderStatus();
}

// Lit le corps d'une requête en octets (un caractère UTF-8 peut être coupé entre deux paquets).
// Trop gros : on répond 413 au lieu de couper la connexion sans explication.
class TooLarge extends Error {}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > limit) { req.pause(); reject(new TooLarge()); return; }
      chunks.push(c);
    });
    req.on('end', () => { if (size <= limit) resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', reject);
  });
}
const readJson = (req, limit = 1e5) => readBody(req, limit).then(b => JSON.parse(b || '{}'));
const badBody = (res, e) => e instanceof TooLarge ? send(res, 413, 'Payload too large') : send(res, 400, JSON.stringify({ error: e.message }), TYPES['.json']);

// Seule l'application elle-même peut appeler l'API : un autre site ouvert dans le navigateur
// (Origin différente) ou un nom d'hôte détourné (Host différent) est refusé.
const LOCAL_HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`, `[::1]:${PORT}`]);
function trusted(req) {
  if (!LOCAL_HOSTS.has(String(req.headers.host || '').toLowerCase())) return false;
  const origin = req.headers.origin;
  if (origin && origin !== 'null') {
    try { if (!LOCAL_HOSTS.has(new URL(origin).host)) return false; } catch { return false; }
  }
  return true;
}

function send(res, code, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

// Une requête mal formée ne doit jamais arrêter le serveur : on répond 400.
const server = http.createServer((req, res) => {
  try {
    route(req, res);
  } catch (e) {
    console.error('Requête refusée :', req.url, e.message);
    if (!res.headersSent) send(res, 400, 'Bad request');
    else res.destroy();
  }
});

function route(req, res) {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/') && !trusted(req)) return send(res, 403, 'Forbidden');

  if (url.pathname === '/api/reminder') {
    if (req.method === 'GET') { reminderStatus().then(st => send(res, 200, JSON.stringify(st), TYPES['.json'])); return; }
    if (req.method === 'PUT') {
      readJson(req).then(b => setReminder(!!b.enabled, b.time)).then(st => send(res, 200, JSON.stringify(st), TYPES['.json']))
        .catch(e => badBody(res, e));
      return;
    }
    return send(res, 405, 'Method not allowed');
  }
  if (url.pathname === '/api/reminder/test' && req.method === 'POST') {
    execFile(process.execPath, [path.join(__dirname, 'tools', 'remind.js'), '--force'], { windowsHide: true }, err => send(res, err ? 500 : 200, JSON.stringify({ ok: !err }), TYPES['.json']));
    return;
  }

  // Correcteur IA local (llama.cpp + Qwen3), démarré à la demande.
  if (url.pathname === '/api/ai' && req.method === 'GET') return send(res, 200, JSON.stringify(ai.status()), TYPES['.json']);
  if (url.pathname === '/api/ai/coach' && req.method === 'POST') {
    readJson(req).then(b => ai.coach(req, res, b)).catch(e => { if (!res.headersSent) badBody(res, e); });
    return;
  }

  if (url.pathname === '/api/progress') {
    if (req.method === 'GET') {
      return send(res, 200, JSON.stringify(db.readState()), TYPES['.json']);
    }
    if (req.method === 'PUT') {
      readBody(req, 50e6).then(body => {
        try {
          const state = JSON.parse(body);
          if (!state || state.version !== 1) throw new Error('format');
          // Concurrence optimiste : le client indique la sauvegarde sur laquelle il s'appuie ;
          // si la base a été enregistrée depuis par un autre onglet, on refuse (409) au lieu d'écraser.
          const base = req.headers['x-twilight-base'];
          const stored = db.savedAt();
          if (base !== undefined && stored > (Number(base) || 0)) {
            return send(res, 409, JSON.stringify({ ok: false, savedAt: stored }), TYPES['.json']);
          }
          db.dailyBackup();
          db.writeState(state);
          send(res, 200, '{"ok":true}', TYPES['.json']);
        } catch (e) {
          console.error('Sauvegarde refusée :', e.message);
          send(res, 400, '{"ok":false}', TYPES['.json']);
        }
      }, e => badBody(res, e));
      return;
    }
    return send(res, 405, 'Method not allowed');
  }

  let file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return send(res, 403, 'Forbidden');
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Not found');
    send(res, 200, data, TYPES[path.extname(file)] || 'application/octet-stream');
  });
}

// Filet de sécurité : une erreur imprévue est notée dans la console, le serveur continue.
process.on('uncaughtException', e => console.error('Erreur inattendue :', e));
process.on('unhandledRejection', e => console.error('Promesse rejetée :', e));

server.listen(PORT, '127.0.0.1', () => {
  const link = `http://localhost:${PORT}`;
  console.log(`\n  Twilight est lancé : ${link}`);
  console.log('  Garde cette fenêtre ouverte pendant que tu apprends. Ferme-la pour arrêter.\n');
  if (!process.argv.includes('--no-open')) {
    const cmd = process.platform === 'win32' ? `start "" "${link}"` : process.platform === 'darwin' ? `open ${link}` : `xdg-open ${link}`;
    exec(cmd);
  }
});

server.on('error', e => {
  if (e.code === 'EADDRINUSE') {
    console.log(`Twilight tourne déjà : http://localhost:${PORT}`);
    if (process.platform === 'win32') exec(`start "" "http://localhost:${PORT}"`);
  } else throw e;
});
