// Rappel quotidien (Windows) : lancé chaque jour par le Planificateur de tâches.
// Si la séance du jour n'est pas terminée, affiche une notification Windows et démarre Twilight au besoin.
// Fonctionne sans internet. Usage manuel : node tools/remind.js [--force]
const path = require('path');
const net = require('net');
const fs = require('fs');
const { spawn, execFile } = require('child_process');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.join(__dirname, '..');
const DB_FILE = path.join(ROOT, 'data', 'twilight.db');
const PORT = Number(process.env.PORT) || 4317;
const force = process.argv.includes('--force');

function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Où en est la séance d'aujourd'hui ?
function progress() {
  if (!fs.existsSync(DB_FILE)) return { minutes: 0, goal: 90, left: null, done: false };
  const db = new DatabaseSync(DB_FILE, { readOnly: true });
  const setting = k => { const r = db.prepare('SELECT value FROM settings WHERE key = ?').get(k); return r ? JSON.parse(r.value) : null; };
  const goal = setting('minutesPerDay') || 90;
  const day = db.prepare('SELECT * FROM days WHERE day = ?').get(dayKey());
  db.close();
  const minutes = day ? Math.round(((day.lesson_sec || 0) + (day.exercise_sec || 0) + (day.cards_sec || 0)) / 60) : 0;
  const plan = day?.plan ? JSON.parse(day.plan) : null;
  const left = plan ? plan.steps.filter(s => !s.done).length : null;
  return { minutes, goal, left, done: (plan && left === 0) || minutes >= goal };
}

const portOpen = () => new Promise(res => {
  const s = net.connect(PORT, '127.0.0.1', () => { s.end(); res(true); });
  s.on('error', () => res(false));
  s.setTimeout(800, () => { s.destroy(); res(false); });
});

const MESSAGES = [
  'You are worth it! Time for your English session.',
  'Small steps every day make a big difference.',
  'Your flashcards miss you!',
  'Keep your streak alive — let’s learn!',
  'A little English today, a lot of progress tomorrow.',
];

const xmlEscape = s => String(s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));

function toast(title, body, url) {
  const xml = `<toast activationType="protocol" launch="${xmlEscape(url)}" scenario="reminder">
  <visual><binding template="ToastGeneric"><text>${xmlEscape(title)}</text><text>${xmlEscape(body)}</text></binding></visual>
  <actions><action content="Commencer" activationType="protocol" arguments="${xmlEscape(url)}"/><action content="Plus tard" activationType="system" arguments="dismiss"/></actions>
</toast>`;
  // Notification Windows native, sans module supplémentaire (identifiant d'application de PowerShell).
  const ps = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml(@'
${xml}
'@)
$app = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show([Windows.UI.Notifications.ToastNotification]::new($xml))`;
  return new Promise(res => execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', ps], { windowsHide: true }, () => res()));
}

(async () => {
  if (process.platform !== 'win32') { console.log('Les rappels automatiques sont prévus pour Windows.'); return; }
  const p = progress();
  if (p.done && !force) { console.log('Séance du jour déjà terminée : pas de rappel.'); return; }
  // Démarre le serveur (fenêtre cachée) pour que le clic sur la notification ouvre Twilight directement.
  if (!(await portOpen())) {
    spawn(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(ROOT, 'server.js'), '--no-open'], { cwd: ROOT, detached: true, stdio: 'ignore', windowsHide: true }).unref();
  }
  const rest = Math.max(0, p.goal - p.minutes);
  const body = p.minutes > 0
    ? `${p.minutes} min déjà faites aujourd’hui, encore ${rest} min pour atteindre ton objectif.`
    : `Ta séance de ${p.goal} min t’attend.${p.left ? ` ${p.left} étapes au programme.` : ''}`;
  await toast(`Twilight — ${MESSAGES[new Date().getDate() % MESSAGES.length]}`, body, `http://localhost:${PORT}/#/today`);
  console.log('Rappel affiché.');
})().catch(e => { console.error(e.message); process.exit(1); });
