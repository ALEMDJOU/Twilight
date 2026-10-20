// Twilight — serveur local sans dépendance.
// Sert l'application (dossier public/) et enregistre la progression dans la base SQLite data/twilight.db.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const db = require('./db');

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

function send(res, code, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/progress') {
    if (req.method === 'GET') {
      return send(res, 200, JSON.stringify(db.readState()), TYPES['.json']);
    }
    if (req.method === 'PUT') {
      let body = '';
      req.on('data', c => { body += c; if (body.length > 50e6) req.destroy(); });
      req.on('end', () => {
        try {
          const state = JSON.parse(body);
          if (!state || state.version !== 1) throw new Error('format');
          db.dailyBackup();
          db.writeState(state);
          send(res, 200, '{"ok":true}', TYPES['.json']);
        } catch (e) {
          console.error('Sauvegarde refusée :', e.message);
          send(res, 400, '{"ok":false}', TYPES['.json']);
        }
      });
      return;
    }
    return send(res, 405, 'Method not allowed');
  }

  let file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
  if (!file.startsWith(ROOT)) return send(res, 403, 'Forbidden');
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Not found');
    send(res, 200, data, TYPES[path.extname(file)] || 'application/octet-stream');
  });
});

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
