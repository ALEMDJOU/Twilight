// Comparaison tolérante des réponses tapées (apostrophes, majuscules, contractions, ponctuation finale).

const CONTRACTIONS = [
  [/\bwon't\b/g, 'will not'], [/\bshan't\b/g, 'shall not'], [/\bcan't\b/g, 'cannot'], [/\bcan not\b/g, 'cannot'],
  [/\bain't\b/g, 'is not'], [/n't\b/g, ' not'],
  [/\bi'm\b/g, 'i am'], [/'re\b/g, ' are'], [/'ve\b/g, ' have'], [/'ll\b/g, ' will'],
  [/\blet's\b/g, 'let us'], [/'s (been|got)\b/g, ' has $1'],
  // 'd better = had better, 'd rather = would rather (sans ambiguïté)
  [/'d better\b/g, ' had better'], [/'d rather\b/g, ' would rather'],
];
// Contractions ambiguës : 's = is / has, 'd = would / had → on garde toutes les lectures.
const S_PRON = /\b(it|he|she|that|what|there|where|who|here|how|this)'s\b/i;
// 'd seul en début de trou (« I ___ like » → 'd like) compte aussi.
const D_PRON = /(^|\b(?:i|you|he|she|it|we|they|there|who|that))'d\b/i;
const MAX_FORMS = 16;

// Options d'un exercice : virgules comptées seulement dans les exercices de ponctuation,
// casse comptée dans les exercices de majuscules (drapeau caseSensitive ou correction qui ne porte que sur la casse).
export function checkOptions(ex = {}) {
  const txt = `${ex.instr || ''} ${ex.instrFr || ''}`;
  const commas = /punctuat|comma|ponctuation|virgule/i.test(txt);
  let caseSensitive = !!ex.caseSensitive;
  if (!caseSensitive && ex.t === 'fix' && typeof ex.q === 'string') {
    const q = clean(ex.q.replace(/\*\*|\*|~~|==/g, ''));
    caseSensitive = [].concat(ex.a).some(a => typeof a === 'string' && clean(a) !== q && clean(a).toLowerCase() === q.toLowerCase());
  }
  return { commas, caseSensitive };
}

// Unifie apostrophes, guillemets et espaces ; enlève la ponctuation finale et les guillemets qui entourent la phrase.
// L'apostrophe finale d'un possessif pluriel (wits') est gardée.
function clean(s) {
  let t = String(s)
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?;:,]+$/, '')
    .trim();
  if (/^".*"$/.test(t) || /^'.*'$/.test(t)) t = t.slice(1, -1);
  else t = t.replace(/^"|"$/g, '').replace(/^'(?!(d|s|ll|re|ve|m)\b)/i, '');
  return t.replace(/[.!?;:,]+$/, '').trim();
}

export function normalize(s, { commas = false, caseSensitive = false } = {}) {
  let t = clean(s);
  if (!caseSensitive) t = t.toLowerCase();
  for (const [re, rep] of CONTRACTIONS) t = t.replace(new RegExp(re.source, re.flags + (caseSensitive ? 'i' : '')), rep);
  // séparateur de milliers : 90,000 = 90000
  t = t.replace(/(\d),(?=\d{3}\b)/g, '$1');
  // virgules internes ignorées, sauf exercice de ponctuation
  if (!commas) t = t.replace(/,/g, ' ');
  return t.replace(/\s*([,.!?;:])\s*/g, '$1 ').replace(/\s+/g, ' ').trim();
}

// Toutes les lectures d'une réponse (he's → he is / he has, I'd → I would / I had).
export function forms(s, opts) {
  let out = [normalize(s, opts)];
  for (const [re, a, b] of [[S_PRON, ' is', ' has'], [D_PRON, ' would', ' had']]) {
    for (let k = 0; k < 4 && out.length < MAX_FORMS; k++) {
      if (!out.some(t => re.test(t))) break;
      out = out.flatMap(t => {
        const m = re.exec(t);
        if (!m) return [t];
        const head = t.slice(0, m.index) + m[1], tail = t.slice(m.index + m[0].length);
        return [(head + a + tail).trim(), (head + b + tail).trim()];
      });
    }
  }
  return out;
}

// Les réponses possibles peuvent contenir « … » pour séparer plusieurs trous dans une même phrase.
export function isCorrect(given, answers, opts) {
  if (!normalize(given, opts)) return false;
  const g = new Set(forms(given, opts));
  return answers.some(a => forms(a, opts).some(f => g.has(f)));
}

// Paires de vrais mots anglais à une lettre près : jamais une simple faute de frappe.
const CONFUSABLES = [
  ['advice', 'advise'], ['device', 'devise'], ['licence', 'license'], ['practice', 'practise'],
  ['compliment', 'complement'], ['compliments', 'complements'], ['complimentary', 'complementary'],
  ['stationary', 'stationery'], ['dependant', 'dependent'], ['affect', 'effect'], ['affected', 'effected'],
  ['wonder', 'wander'], ['wondered', 'wandered'], ['customer', 'costumer'], ['prescribe', 'proscribe'],
  ['ballet', 'ballot'], ['collar', 'cellar'], ['access', 'excess'], ['accept', 'except'],
  ['principal', 'principle'], ['lose', 'loose'], ['then', 'than'], ['quiet', 'quite'],
  ['though', 'through'], ['thought', 'though'], ['bought', 'brought'], ['angel', 'angle'],
  ['desert', 'dessert'], ['breath', 'breathe'], ['cloth', 'clothe'], ['lightning', 'lightening'],
  ['emigrate', 'immigrate'], ['eminent', 'imminent'], ['personal', 'personnel'], ['rising', 'raising'],
  ['boring', 'bored'], ['tired', 'tiring'], ['carton', 'cartoon'], ['morale', 'moral'], ['council', 'counsel'],
  ['rational', 'rationale'], ['sensible', 'sensitive'], ['economic', 'economical'], ['historic', 'historical'],
  ['classic', 'classical'], ['electric', 'electrical'], ['adapt', 'adopt'], ['assure', 'ensure'], ['ensure', 'insure'],
  ['formally', 'formerly'], ['weather', 'whether'], ['proceed', 'precede'], ['receipt', 'recipe'],
  ['marital', 'martial'], ['bridal', 'bridle'], ['canvas', 'canvass'], ['discreet', 'discrete'],
  ['prophecy', 'prophesy'], ['envelop', 'envelope'], ['loath', 'loathe'], ['peddle', 'pedal'],
  ['diary', 'dairy'], ['casual', 'causal'], ['conscience', 'conscious'],
];
const CONFUSE = new Set(CONFUSABLES.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]));
const ENDINGS = ['', 's', 'd', 'ed', 'es', 'ing', 'r', 'er', 'ly'];
// Vrai si `g` (tapé) et `t` (attendu) sont deux mots différents d'une paire confusable (formes fléchies comprises).
export function confusable(g, t) {
  if (g === t) return false;
  if (CONFUSE.has(`${g}|${t}`)) return true;
  for (const e of ENDINGS) {
    if (!e || !g.endsWith(e) || !t.endsWith(e)) continue;
    const a = g.slice(0, -e.length), b = t.slice(0, -e.length);
    if (CONFUSE.has(`${a}|${b}`) || CONFUSE.has(`${a}e|${b}e`)) return true;
  }
  return false;
}

// Tolérance très limitée aux fautes de frappe : une seule lettre remplacée AU MILIEU d'un mot d'au moins 6 lettres.
// Jamais pour une lettre ajoutée/manquante ni en fin de mot : -s, -ed, -ing sont justement ce qu'on évalue.
// Jamais non plus quand le mot tapé est un autre vrai mot (advice / advise…). Une faute tolérée compte comme « difficile ».
export function isNearMiss(given, answers, opts) {
  const g = normalize(given, opts);
  const isLetter = c => /[a-z]/i.test(c || '');
  return answers.some(a => {
    const t = normalize(a, opts);
    if (g.length !== t.length || t.length < 6) return false;
    const diff = [];
    for (let i = 0; i < t.length; i++) if (g[i] !== t[i]) diff.push(i);
    if (diff.length !== 1) return false;
    const i = diff[0];
    if (!isLetter(g[i]) || !isLetter(t[i])) return false;
    // la lettre doit avoir des lettres de chaque côté, dans un mot d'au moins 6 lettres
    if (!isLetter(t[i - 1]) || !isLetter(t[i + 1])) return false;
    const start = t.slice(0, i).split(/[^a-z]/i).pop().length;
    const word = t.slice(i - start).split(/[^a-z]/i)[0];
    if (word.length < 6) return false;
    const typed = g.slice(i - start, i - start + word.length);
    return !confusable(typed.toLowerCase(), word.toLowerCase());
  });
}
