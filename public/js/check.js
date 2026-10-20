// Comparaison tolérante des réponses tapées (apostrophes, majuscules, contractions, ponctuation finale).

const CONTRACTIONS = [
  [/\bwon't\b/g, 'will not'], [/\bshan't\b/g, 'shall not'], [/\bcan't\b/g, 'cannot'], [/\bcan not\b/g, 'cannot'],
  [/\bain't\b/g, 'is not'], [/n't\b/g, ' not'],
  [/\bi'm\b/g, 'i am'], [/'re\b/g, ' are'], [/'ve\b/g, ' have'], [/'ll\b/g, ' will'],
  [/\b(it|he|she|that|what|there|where|who|here|how|this)'s\b/g, '$1 is'],
  [/\blet's\b/g, 'let us'],
];

export function normalize(s) {
  let t = String(s).toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?;:,]+$/, '')
    .replace(/^["']|["']$/g, '')
    .trim();
  for (const [re, rep] of CONTRACTIONS) t = t.replace(re, rep);
  return t.replace(/\s*([,.!?;:])\s*/g, '$1 ').replace(/\s+/g, ' ').trim();
}

// Les réponses possibles peuvent contenir « … » pour séparer plusieurs trous dans une même phrase.
export function isCorrect(given, answers) {
  const g = normalize(given);
  if (!g) return false;
  return answers.some(a => normalize(a) === g);
}

// Tolérance très limitée aux fautes de frappe : une seule lettre remplacée AU MILIEU d'un mot d'au moins 6 lettres.
// Jamais pour une lettre ajoutée/manquante ni en fin de mot : -s, -ed, -ing sont justement ce qu'on évalue.
export function isNearMiss(given, answers) {
  const g = normalize(given);
  return answers.some(a => {
    const t = normalize(a);
    if (g.length !== t.length || t.length < 6) return false;
    const diff = [];
    for (let i = 0; i < t.length; i++) if (g[i] !== t[i]) diff.push(i);
    if (diff.length !== 1) return false;
    const i = diff[0];
    const isLetter = c => /[a-z]/.test(c || '');
    if (!isLetter(g[i]) || !isLetter(t[i])) return false;
    // la lettre doit avoir des lettres de chaque côté, dans un mot d'au moins 6 lettres
    if (!isLetter(t[i - 1]) || !isLetter(t[i + 1])) return false;
    const word = t.slice(0, i).split(/[^a-z]/).pop() + t.slice(i).split(/[^a-z]/)[0];
    return word.length >= 6;
  });
}
