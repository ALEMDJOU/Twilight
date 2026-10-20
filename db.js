// Base de données SQLite de Twilight (module node:sqlite intégré à Node.js, aucune dépendance).
// Fichier : data/twilight.db
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'twilight.db');
const BACKUPS = path.join(DATA_DIR, 'backups');
fs.mkdirSync(BACKUPS, { recursive: true });

const db = new DatabaseSync(DB_FILE);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS meta     (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,           -- c:/r: carte, x: exercice  (ex. c:g1:3, x:vi5:2, c:p:12)
    ef REAL, interval INTEGER, reps INTEGER, lapses INTEGER,
    due INTEGER, last INTEGER, added INTEGER
  );
  CREATE INDEX IF NOT EXISTS items_due ON items(due);
  CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY,           -- g1, vi5, va12…
    lesson_done INTEGER, ex_done INTEGER, right INTEGER, total INTEGER
  );
  CREATE TABLE IF NOT EXISTS days (
    day TEXT PRIMARY KEY,          -- AAAA-MM-JJ
    lesson_sec INTEGER, exercise_sec INTEGER, cards_sec INTEGER,
    right INTEGER, wrong INTEGER, reviews INTEGER, new_cards INTEGER,
    plan TEXT,
    extra TEXT                     -- autres champs du jour (JSON)
  );
`);

function readState() {
  const meta = Object.fromEntries(db.prepare('SELECT key, value FROM meta').all().map(r => [r.key, JSON.parse(r.value)]));
  if (!meta.version) return null;
  const settings = Object.fromEntries(db.prepare('SELECT key, value FROM settings').all().map(r => [r.key, JSON.parse(r.value)]));
  const items = {};
  for (const r of db.prepare('SELECT * FROM items').all()) {
    items[r.id] = { ef: r.ef, interval: r.interval, reps: r.reps, lapses: r.lapses, due: r.due, last: r.last, added: r.added };
  }
  const units = {};
  for (const r of db.prepare('SELECT * FROM units').all()) {
    units[r.id] = { lessonDone: r.lesson_done, exDone: r.ex_done, right: r.right, total: r.total };
  }
  const days = {};
  for (const r of db.prepare('SELECT * FROM days').all()) {
    days[r.day] = {
      time: { lesson: r.lesson_sec, exercise: r.exercise_sec, cards: r.cards_sec },
      right: r.right, wrong: r.wrong, reviews: r.reviews, newCards: r.new_cards,
      plan: r.plan ? JSON.parse(r.plan) : null,
      ...(r.extra ? JSON.parse(r.extra) : {}),
    };
  }
  return { ...meta, settings, items, units, days };
}

const META_KEYS = ['version', 'createdAt', 'savedAt', 'proverbsIntroduced'];
const n = v => (v == null ? null : Number(v));

function writeState(s) {
  const insMeta = db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)');
  const insSet = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  const insItem = db.prepare('INSERT INTO items VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const insUnit = db.prepare('INSERT INTO units VALUES (?, ?, ?, ?, ?)');
  const insDay = db.prepare('INSERT INTO days VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM meta; DELETE FROM settings; DELETE FROM items; DELETE FROM units; DELETE FROM days;');
    for (const k of META_KEYS) if (s[k] !== undefined) insMeta.run(k, JSON.stringify(s[k]));
    for (const [k, v] of Object.entries(s.settings || {})) insSet.run(k, JSON.stringify(v));
    for (const [id, it] of Object.entries(s.items || {})) insItem.run(id, n(it.ef), n(it.interval), n(it.reps), n(it.lapses), n(it.due), n(it.last), n(it.added));
    for (const [id, u] of Object.entries(s.units || {})) insUnit.run(id, n(u.lessonDone), n(u.exDone), n(u.right), n(u.total));
    for (const [day, d] of Object.entries(s.days || {})) {
      const { time: t = {}, right, wrong, reviews, newCards, plan, ...extra } = d;
      insDay.run(day, n(t.lesson) || 0, n(t.exercise) || 0, n(t.cards) || 0, n(right) || 0, n(wrong) || 0, n(reviews) || 0, n(newCards) || 0,
        plan ? JSON.stringify(plan) : null, Object.keys(extra).length ? JSON.stringify(extra) : null);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// Une copie de la base par jour (data/backups), on garde les 30 dernières.
function dailyBackup() {
  const day = new Date().toISOString().slice(0, 10);
  const target = path.join(BACKUPS, `twilight-${day}.db`);
  if (fs.existsSync(target) || !readState()) return;
  db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  const files = fs.readdirSync(BACKUPS).filter(f => f.startsWith('twilight-')).sort();
  while (files.length > 30) fs.unlinkSync(path.join(BACKUPS, files.shift()));
}

module.exports = { readState, writeState, dailyBackup, DB_FILE };
