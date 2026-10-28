// Chargement du contenu des livres et accès aux cartes / exercices par identifiant.
import { store } from './store.js';
import { sceneFor } from './scenes.js';

export const BOOKS = [
  { key: 'grammar', code: 'g', title: 'English Grammar in Use', subtitle: 'Intermediate · Raymond Murphy', short: 'Grammaire', color: 'burgundy' },
  { key: 'vocab_int', code: 'vi', title: 'English Vocabulary in Use', subtitle: 'Pre-intermediate & Intermediate', short: 'Vocabulaire', color: 'wine' },
  { key: 'vocab_adv', code: 'va', title: 'English Vocabulary in Use', subtitle: 'Advanced', short: 'Vocabulaire avancé', color: 'navy' },
  { key: 'collocations', code: 'co', title: 'English Collocations in Use', subtitle: 'Intermediate · McCarthy & O’Dell', short: 'Collocations', color: 'teal' },
  { key: 'idioms', code: 'id', title: 'English Idioms in Use', subtitle: 'Intermediate · McCarthy & O’Dell', short: 'Idiomes', color: 'wine' },
  { key: 'idioms_pv', code: 'ip', title: 'English Idioms & Phrasal Verbs', subtitle: 'The Complete Guide', short: 'Idiomes & phrasal verbs', color: 'navy' },
  { key: 'proverbs', code: 'p', title: '150 Common English Proverbs', subtitle: 'Meanings and examples', short: 'Proverbes', color: 'amber' },
];
export const bookByCode = Object.fromEntries(BOOKS.map(b => [b.code, b]));
export const bookByKey = Object.fromEntries(BOOKS.map(b => [b.key, b]));

const cache = new Map();
let catalog = null, available = new Set(), proverbs = [], images = {};

export async function initContent() {
  const [c, idx, p, im] = await Promise.all([
    fetch('content/catalog.json').then(r => r.json()),
    fetch('content/index.json').then(r => r.ok ? r.json() : { units: [] }).catch(() => ({ units: [] })),
    fetch('content/proverbs.json').then(r => r.json()),
    fetch('content/images.json').then(r => r.ok ? r.json() : {}).catch(() => ({})),
  ]);
  images = im || {};
  catalog = c;
  available = new Set(idx.units);
  proverbs = p.items;
  // Précharge les unités déjà commencées pour pouvoir afficher leurs cartes en révision.
  const started = new Set(Object.keys(store.state.units));
  for (const id of Object.keys(store.state.items)) {
    const u = id.split(':')[1];
    if (u !== 'p') started.add(u);
  }
  await Promise.all([...started].filter(u => available.has(u)).map(loadUnit));
}

export function splitUnitId(uid) {
  const m = uid.match(/^([a-z]+)(\d+)$/);
  return { code: m[1], n: Number(m[2]) };
}

export function unitList(bookKey) {
  const b = bookByKey[bookKey];
  return (catalog[bookKey] || []).map(u => ({ ...u, id: b.code + u.n, available: available.has(b.code + u.n) }));
}

export function unitMeta(uid) {
  const { code, n } = splitUnitId(uid);
  const b = bookByCode[code];
  const u = catalog[b.key].find(x => x.n === n);
  return { ...u, id: uid, book: b, available: available.has(uid) };
}

export function isAvailable(uid) { return available.has(uid); }
export function availableCount(bookKey) { return unitList(bookKey).filter(u => u.available).length; }

export async function loadUnit(uid) {
  if (cache.has(uid)) return cache.get(uid);
  const data = await fetch(`content/units/${uid}.json`).then(r => r.json());
  cache.set(uid, data);
  return data;
}
export function unitCached(uid) { return cache.get(uid); }

export function getProverbs() { return proverbs; }

// Photo locale (Wikimedia Commons) associée à une carte, avec son crédit.
export function photoFor(card) {
  const p = card?.img && images[card.img];
  return p ? { src: p.file, credit: `${p.artist}${p.license ? ' · ' + p.license : ''}`, source: p.source } : null;
}

// Prochaine unité non étudiée d'un livre (dans l'ordre du livre, parmi les unités disponibles).
export function nextUnit(bookKey, exclude = []) {
  return unitList(bookKey).find(u => u.available && !store.state.units[u.id]?.lessonDone && !exclude.includes(u.id)) || null;
}

/* ---------- Cartes ---------- */
// Identifiants : c:<unité>:<n> (anglais → français), r:<unité>:<n> (français → anglais).
export function cardIds(uid, unit) {
  return (unit.cards || []).map((_, i) => `c:${uid}:${i}`);
}

export function cardData(id) {
  const [dir, uid, n] = id.split(':');
  if (uid === 'p') {
    const p = proverbs[Number(n) - 1];
    if (!p) return null;
    const front = { kind: 'proverb', en: p.en };
    const back = { en: p.en, fr: p.fr, def: p.meaning, ex: p.example };
    return { id, dir, uid, source: 'Proverbe ' + p.n, ...(dir === 'c' ? { front, back } : { front: { kind: 'proverb-rev', fr: p.fr, def: p.meaning }, back }) };
  }
  const unit = cache.get(uid);
  const c = unit?.cards?.[Number(n)];
  if (!c) return null;
  const meta = unitMeta(uid);
  const photo = photoFor(c);
  // Collocations et idiomes « humains » sans photo : illustration dessinée par l'app.
  const scene = !photo && !c.q && ILLUSTRATED.has(meta.book.code) ? sceneFor(`${c.en} ${c.def || ''}`) : null;
  const back = { en: c.en, fr: c.fr, def: c.def, ex: c.ex, note: c.note, pic: c.pic, photo, scene };
  const source = `${meta.book.short} · Unité ${meta.n}`;
  if (dir === 'c') return { id, dir, uid, source, front: { kind: c.q ? 'rule' : 'word', en: c.en, q: c.q, pic: c.pic, photo, scene }, back };
  return { id, dir, uid, source, front: { kind: 'rev', fr: c.fr, def: c.def, hint: c.hint, pic: c.pic, photo, scene }, back };
}

// Livres dont les cartes reçoivent des illustrations dessinées.
export const ILLUSTRATED = new Set(['co', 'id', 'ip']);

/* ---------- Glossaire : traductions françaises des collocations présentes dans un texte ---------- */
const IRREGULAR = {
  be: 'be|am|is|are|was|were|been|being', have: 'have|has|had|having', do: 'do|does|did|done|doing', go: 'go|goes|went|gone|going',
  make: 'make|makes|made|making', take: 'take|takes|took|taken|taking', give: 'give|gives|gave|given|giving', get: 'get|gets|got|gotten|getting',
  come: 'come|comes|came|coming', keep: 'keep|keeps|kept|keeping', catch: 'catch|catches|caught|catching', break: 'break|breaks|broke|broken|breaking',
  bring: 'bring|brings|brought|bringing', hold: 'hold|holds|held|holding', run: 'run|runs|ran|running', fall: 'fall|falls|fell|fallen|falling',
  feel: 'feel|feels|felt|feeling', lose: 'lose|loses|lost|losing', pay: 'pay|pays|paid|paying', tell: 'tell|tells|told|telling', win: 'win|wins|won|winning',
  throw: 'throw|throws|threw|thrown|throwing', see: 'see|sees|saw|seen|seeing', speak: 'speak|speaks|spoke|spoken|speaking', meet: 'meet|meets|met|meeting',
  leave: 'leave|leaves|left|leaving', lead: 'lead|leads|led|leading', draw: 'draw|draws|drew|drawn|drawing', rise: 'rise|rises|rose|risen|rising',
  burst: 'burst|bursts|bursting', put: 'put|puts|putting', set: 'set|sets|setting', cut: 'cut|cuts|cutting', let: 'let|lets|letting', hit: 'hit|hits|hitting',
  say: 'say|says|said|saying', find: 'find|finds|found|finding', think: 'think|thinks|thought|thinking', buy: 'buy|buys|bought|buying',
  sell: 'sell|sells|sold|selling', send: 'send|sends|sent|sending', spend: 'spend|spends|spent|spending', stand: 'stand|stands|stood|standing',
  know: 'know|knows|knew|known|knowing', grow: 'grow|grows|grew|grown|growing', drive: 'drive|drives|drove|driven|driving',
  write: 'write|writes|wrote|written|writing', eat: 'eat|eats|ate|eaten|eating', drink: 'drink|drinks|drank|drunk|drinking',
  sleep: 'sleep|sleeps|slept|sleeping', shake: 'shake|shakes|shook|shaken|shaking', bear: 'bear|bears|bore|borne|bearing',
  tear: 'tear|tears|tore|torn|tearing', wear: 'wear|wears|wore|worn|wearing', hang: 'hang|hangs|hung|hanging', stick: 'stick|sticks|stuck|sticking',
  strike: 'strike|strikes|struck|striking', blow: 'blow|blows|blew|blown|blowing', fly: 'fly|flies|flew|flown|flying', sink: 'sink|sinks|sank|sunk|sinking',
  shoot: 'shoot|shoots|shot|shooting', dig: 'dig|digs|dug|digging', bite: 'bite|bites|bit|bitten|biting',
};
const PLACEHOLDER = /^(sb|sth|someone|somebody|something|someone's|somebody's|one's|your|yourself|oneself|my|his|her|their|our)$/;
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function tokenRe(tok) {
  if (PLACEHOLDER.test(tok)) return "[\\w'’]+(?:\\s[\\w'’]+)?";
  if (IRREGULAR[tok]) return `(?:${IRREGULAR[tok]})`;
  if (tok.length <= 3) return escRe(tok);
  return `${escRe(tok.replace(/e$/, ''))}\\w{0,4}`;
}
const matchers = new Map();
function matcherFor(en) {
  if (matchers.has(en)) return matchers.get(en);
  const base = en.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/^to /, '').split(/[\/,;]| or /)[0].replace(/[^a-z'’ -]/g, ' ').trim();
  // Les articles et déterminants ne comptent pas : « make a mistake » reconnaît aussi « made mistakes ».
  const toks = base.split(/\s+/).filter(t => t && !/^(a|an|the|to|some|any)$/.test(t));
  const det = '(?:[\\s-]+(?:a|an|the|some|any|my|your|his|her|its|our|their|this|that))?[\\s-]+';
  const re = toks.length >= 2 ? new RegExp(`\\b${toks.map(tokenRe).join(det)}\\b`, 'i') : null;
  matchers.set(en, re);
  return re;
}
// Cartes de l'unité dont l'expression apparaît dans les textes donnés (formes conjuguées comprises).
export function glossaryFor(uid, texts) {
  const unit = cache.get(uid);
  if (!unit) return [];
  const hay = texts.filter(Boolean).join(' \n ').replace(/\*\*|==|~~|\*/g, '');
  const out = [];
  for (const c of unit.cards || []) {
    if (c.q || !c.en || !c.fr) continue;
    const re = matcherFor(c.en);
    if (re && re.test(hay) && !out.some(o => o.en === c.en)) out.push({ en: c.en, fr: c.fr });
  }
  return out.slice(0, 8);
}

/* ---------- Exercices ---------- */
// Identifiants : x:<unité>:<n>, ou x:p:<n>:m (sens) / x:p:<n>:c (compléter) pour les proverbes.
export function exerciseIds(uid, unit) {
  return (unit.exercises || []).map((_, i) => `x:${uid}:${i}`);
}

function seeded(n) { let s = n * 9301 + 49297; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
function pickOthers(n, count, field) {
  const rnd = seeded(n);
  const out = new Set();
  while (out.size < count) {
    const k = Math.floor(rnd() * proverbs.length);
    if (k !== n - 1) out.add(proverbs[k][field]);
  }
  return [...out];
}
function shuffleWith(arr, n) {
  const rnd = seeded(n + 7), a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function proverbEnding(en) {
  const words = en.replace(/[.!?]$/, '').split(' ');
  const cut = Math.max(1, Math.ceil(words.length * 0.55));
  return { start: words.slice(0, cut).join(' '), end: words.slice(cut).join(' ') };
}

export function proverbExerciseIds(n) { return [`x:p:${n}:m`, `x:p:${n}:c`]; }

export function exerciseData(id) {
  const parts = id.split(':');
  const uid = parts[1];
  if (uid === 'p') {
    const n = Number(parts[2]), p = proverbs[n - 1];
    if (!p) return null;
    if (parts[3] === 'm') {
      const opts = shuffleWith([p.meaning, ...pickOthers(n, 3, 'meaning')], n);
      return { id, uid, source: 'Proverbe ' + n, t: 'mcq', instr: 'What does this proverb mean?', instrFr: 'Que signifie ce proverbe ?', q: `“${p.en}”`, o: opts, a: opts.indexOf(p.meaning), why: p.fr, ex: p.example };
    }
    const { start, end } = proverbEnding(p.en);
    const wrong = pickOthers(n, 3, 'en').map(x => proverbEnding(x).end).filter(e => e && e !== end);
    const opts = shuffleWith([end, ...wrong.slice(0, 3)], n + 1);
    return { id, uid, source: 'Proverbe ' + n, t: 'mcq', instr: 'Complete the proverb.', instrFr: 'Complète le proverbe.', q: `${start} …`, o: opts.map(o => '… ' + o), a: opts.indexOf(end), why: `${p.en} — ${p.fr}` };
  }
  const unit = cache.get(uid);
  const ex = unit?.exercises?.[Number(parts[2])];
  if (!ex) return null;
  const meta = unitMeta(uid);
  return { id, uid, source: `${meta.book.short} · Unité ${meta.n}`, ...ex };
}
