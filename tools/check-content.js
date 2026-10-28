// Vérifie les fichiers d'unités (public/content/units/*.json) et régénère public/content/index.json.
// Usage : npm run check
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'public', 'content');
const UNITS = path.join(DIR, 'units');
const catalog = JSON.parse(fs.readFileSync(path.join(DIR, 'catalog.json'), 'utf8'));
const CODES = { g: 'grammar', vi: 'vocab_int', va: 'vocab_adv', co: 'collocations', id: 'idioms', ip: 'idioms_pv' };
const TYPES = new Set(['mcq', 'gap', 'write', 'fix', 'order', 'match']);

let errors = 0;
const err = (f, m) => { errors++; console.error(`  ✗ ${f}: ${m}`); };
const ok = [];
let cards = 0, exercises = 0;

for (const f of fs.readdirSync(UNITS).filter(f => f.endsWith('.json')).sort()) {
  const id = f.replace('.json', '');
  const m = id.match(/^(g|vi|va|co|id|ip)(\d+)$/);
  if (!m) { err(f, 'nom de fichier invalide'); continue; }
  let u;
  try { u = JSON.parse(fs.readFileSync(path.join(UNITS, f), 'utf8')); } catch (e) { err(f, 'JSON invalide : ' + e.message); continue; }
  const before = errors;
  if (u.book !== CODES[m[1]]) err(f, `book doit valoir "${CODES[m[1]]}"`);
  if (u.n !== Number(m[2])) err(f, 'n ne correspond pas au nom du fichier');
  if (!catalog[CODES[m[1]]].some(x => x.n === u.n)) err(f, 'unité absente du catalogue');
  if (!u.sections?.length) err(f, 'aucune section de leçon');
  (u.sections || []).forEach((s, i) => { if (!s.en && !s.examples?.length && !s.table) err(f, `section ${i} vide`); });
  if (!u.exercises?.length) err(f, 'aucun exercice');
  if (!u.cards?.length) err(f, 'aucune carte');
  (u.exercises || []).forEach((x, i) => {
    const w = `exercice ${i}`;
    if (!TYPES.has(x.t)) return err(f, `${w}: type inconnu ${x.t}`);
    if (x.t === 'mcq') {
      if (!Array.isArray(x.o) || x.o.length < 2) err(f, `${w}: options manquantes`);
      if (!(Number.isInteger(x.a) && x.a >= 0 && x.a < x.o.length)) err(f, `${w}: index de réponse invalide`);
    } else if (x.t === 'gap') {
      const blanks = (x.q.match(/_{3,}/g) || []).length;
      const a = Array.isArray(x.a?.[0]) ? x.a : [x.a];
      if (!blanks) err(f, `${w}: aucun trou ___`);
      if (a.length !== blanks) err(f, `${w}: ${blanks} trou(s) mais ${a.length} liste(s) de réponses`);
      if (a.some(l => !Array.isArray(l) || !l.length || l.some(s => typeof s !== 'string' || !s.trim()))) err(f, `${w}: réponses invalides`);
    } else if (x.t === 'match') {
      if (!Array.isArray(x.pairs) || x.pairs.length < 2) err(f, `${w}: paires manquantes`);
      else if (new Set(x.pairs.map(p => p[1])).size !== x.pairs.length) err(f, `${w}: réponses en double`);
    } else {
      const a = Array.isArray(x.a) ? x.a : [x.a];
      if (!a.length || a.some(s => typeof s !== 'string' || !s.trim())) err(f, `${w}: réponses invalides`);
      if (x.t === 'order' && x.words && x.words.join(' ').toLowerCase() === a[0].replace(/[.?!]$/, '').toLowerCase()) err(f, `${w}: mots déjà dans l'ordre`);
    }
  });
  (u.cards || []).forEach((c, i) => { if (!c.en) err(f, `carte ${i}: champ en manquant`); if (!c.fr && !c.q) err(f, `carte ${i}: fr ou q manquant`); });
  if (errors === before) { ok.push(id); cards += u.cards.length; exercises += u.exercises.length; }
}

const order = id => { const m = id.match(/^(g|vi|va|co|id|ip)(\d+)$/); return ['g', 'vi', 'va', 'co', 'id', 'ip'].indexOf(m[1]) * 1000 + Number(m[2]); };
ok.sort((a, b) => order(a) - order(b));
fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify({ units: ok, updated: new Date().toISOString() }, null, 1));
console.log(`${ok.length} unités valides (${exercises} exercices, ${cards} cartes) → index.json`);
console.log(`  grammaire : ${ok.filter(x => x.startsWith('g')).length}, vocabulaire : ${ok.filter(x => x.startsWith('vi')).length}, avancé : ${ok.filter(x => x.startsWith('va')).length}, collocations : ${ok.filter(x => x.startsWith('co')).length}, idiomes : ${ok.filter(x => x.startsWith('id')).length}, idiomes & phrasal verbs : ${ok.filter(x => x.startsWith('ip')).length}`);
if (errors) { console.error(`${errors} erreur(s).`); process.exit(1); }
