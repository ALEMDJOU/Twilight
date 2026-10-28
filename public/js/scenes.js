// Illustrations vectorielles faites maison (SVG, 100 % hors ligne) pour les collocations « humaines » :
// un ou deux personnages, avec une émotion, un geste et parfois un objet.
// sceneFor(text) choisit automatiquement la scène d'après les mots de la collocation.

const SKIN = ['#F2C8A0', '#C98E62', '#8D5A3B'];
const SHIRT = ['#A4487A', '#2B2A5C', '#E0785F', '#3CA48A', '#6E4AA8'];
const BG = { happy: '#FDE9C9', laugh: '#FDE9C9', love: '#FBE0EA', sad: '#DCE6F5', cry: '#DCE6F5', angry: '#FAD9D3', surprised: '#FFF0C2', scared: '#E4E0F5', tired: '#E6E3EE', sick: '#DDF0E4', think: '#E8E4F6', neutral: '#EEE9E2' };

// Règles : motifs → scène. La première règle qui correspond l'emporte.
const RULES = [
  // Traits de caractère sociables : deux personnes qui discutent avec plaisir.
  [/\b(good company|outgoing|sociable|sense of humou?r|friendly|get on well|life and soul)/, { mood: 'happy', action: 'talk' }],
  [/\b(tears?|cr(y|ies|ied|ying)|weep|sob)\b/, { mood: 'cry' }],
  [/\b(laugh|giggl|burst out laughing|in stitches)/, { mood: 'laugh' }],
  [/\b(smil|grin|cheer|delight|happ|joy|thrill|glad|pleased|great fun)/, { mood: 'happy' }],
  [/\b(lov|romanc|fall for|crush|kiss|date|first sight|heart)/, { mood: 'love', prop: 'heart' }],
  [/\b(hug|embrac|cuddl)/, { mood: 'love', action: 'hug' }],
  [/\b(shake hands|handshake|greet|introduc|acquaintance|meet|congratulat)/, { mood: 'happy', action: 'shake' }],
  [/\b(argu|quarrel|row\b|dispute|disagree|heated)/, { mood: 'angry', action: 'talk' }],
  [/\b(angr|furious|temper|patience|annoy|rage|cross\b|irritat|offence|criticis)/, { mood: 'angry' }],
  [/\b(talk|chat|conversation|discuss|gossip|speak|say|tell|ask|hint|subject|whisper|shout|mention|agree|point)/, { mood: 'neutral', action: 'talk' }],
  [/\b(surpris|shock|amaz|astonish|stun|unexpected|breakthrough)/, { mood: 'surprised' }],
  [/\b(scar|fear|afraid|frighten|terrif|panic|nervous|alarm|danger)/, { mood: 'scared' }],
  [/\b(sad|upset|depress|miserabl|disappoint|heartbroken|grief|lonel|fail)/, { mood: 'sad' }],
  [/\b(tired|exhaust|sleep|asleep|nap|yawn|awake|bed|dawn|dusk|insomnia)/, { mood: 'tired', action: 'sleep' }],
  [/\b(ill\b|illness|cold|flu|sick|pain|ache|injur|health|disease|fever|cough|patient|medic)/, { mood: 'sick', prop: 'thermometer' }],
  [/\b(phone|call|ring\b|text|message|email|attachment|internet|online|search|website|click)/, { mood: 'neutral', prop: 'phone' }],
  [/\b(read|book|novel|story|literature|page|chapter|critic)/, { mood: 'neutral', prop: 'book' }],
  [/\b(writ|essay|draft|note|report|research|study|lecture|exam|homework|academic|thesis|assignment|revis)/, { mood: 'think', prop: 'pen' }],
  [/\b(work|job|office|career|business|meeting|colleague|boss|deadline|presentation|launch|company director|rival company|notice)/, { mood: 'neutral', prop: 'laptop' }],
  [/\b(eat|meal|food|dish|appetite|hunger|hungry|dinner|lunch|breakfast|cook|taste|delicious|snack|nourish)/, { mood: 'happy', prop: 'plate' }],
  [/\b(drink|coffee|tea|thirst|cup|glass)/, { mood: 'happy', prop: 'cup' }],
  [/\b(money|price|cost|pay|spend|squander|cash|afford|budget|cheap|expensive|salary|wealth|rich|poor|debt|loan|savings)/, { mood: 'neutral', prop: 'money' }],
  [/\b(music|sing|song|guitar|band|concert|perform|tour)/, { mood: 'happy', prop: 'music' }],
  [/\b(walk|stroll|wander|pace|step|stride|march|limp|tiptoe|hike)/, { mood: 'neutral', action: 'walk' }],
  [/\b(run|race|sport|exercise|jog|fit\b|train|gym|penalty|match|goal|team)/, { mood: 'happy', action: 'run' }],
  [/\b(think|believ|opinion|idea|decid|decision|choice|choos|remember|memory|forget|consider|doubt|wonder|judg|imagin|feeling)/, { mood: 'think', action: 'think' }],
  [/\b(wav|bye|hello|welcome|farewell)/, { mood: 'happy', action: 'wave' }],
];

export function sceneFor(text) {
  const t = String(text || '').toLowerCase();
  for (const [re, spec] of RULES) if (re.test(t)) return { action: 'stand', ...spec, seed: hash(t) };
  return null;
}

function hash(s) { let x = 7; for (const c of s) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; }

/* ---------- Dessin ---------- */
function face(cx, cy, mood) {
  const eye = (x, closed) => closed
    ? `<path d="M${x - 3.5} ${cy - 2}q3.5 3 7 0" stroke="#2A2233" stroke-width="2" fill="none" stroke-linecap="round"/>`
    : `<circle cx="${x}" cy="${cy - 2}" r="${mood === 'surprised' || mood === 'scared' ? 3 : 2.3}" fill="#2A2233"/>`;
  const closed = mood === 'tired' || mood === 'laugh' || mood === 'cry';
  let out = eye(cx - 7, closed) + eye(cx + 7, closed);
  const brows = { angry: `<path d="M${cx - 11} ${cy - 9}l7 3M${cx + 11} ${cy - 9}l-7 3" stroke="#2A2233" stroke-width="2.2" stroke-linecap="round"/>`,
    sad: `<path d="M${cx - 11} ${cy - 7}l7 -2.5M${cx + 11} ${cy - 7}l-7 -2.5" stroke="#2A2233" stroke-width="2" stroke-linecap="round"/>`,
    cry: `<path d="M${cx - 11} ${cy - 7}l7 -2.5M${cx + 11} ${cy - 7}l-7 -2.5" stroke="#2A2233" stroke-width="2" stroke-linecap="round"/>`,
    surprised: `<path d="M${cx - 10} ${cy - 10}q3 -3 6 0M${cx + 4} ${cy - 10}q3 -3 6 0" stroke="#2A2233" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    think: `<path d="M${cx + 4} ${cy - 10}q3 -2 6 0" stroke="#2A2233" stroke-width="2" fill="none" stroke-linecap="round"/>` };
  out += brows[mood] || '';
  const m = cy + 8;
  const mouths = {
    happy: `<path d="M${cx - 7} ${m - 2}q7 7 14 0" stroke="#2A2233" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
    love: `<path d="M${cx - 7} ${m - 2}q7 7 14 0" stroke="#2A2233" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
    laugh: `<path d="M${cx - 8} ${m - 3}h16q-1 9 -8 9t-8 -9z" fill="#7A2A3A"/>`,
    sad: `<path d="M${cx - 6} ${m + 3}q6 -6 12 0" stroke="#2A2233" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
    cry: `<path d="M${cx - 6} ${m + 3}q6 -6 12 0" stroke="#2A2233" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
    angry: `<path d="M${cx - 6} ${m + 2}h12" stroke="#2A2233" stroke-width="2.4" stroke-linecap="round"/>`,
    surprised: `<ellipse cx="${cx}" cy="${m + 1}" rx="3.5" ry="4.5" fill="#7A2A3A"/>`,
    scared: `<path d="M${cx - 6} ${m + 2}q1.5 -3 3 0t3 0t3 0t3 0" stroke="#2A2233" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    tired: `<path d="M${cx - 4} ${m + 1}h8" stroke="#2A2233" stroke-width="2" stroke-linecap="round"/>`,
    sick: `<path d="M${cx - 6} ${m + 2}q3 -3 6 0t6 0" stroke="#2A2233" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    think: `<path d="M${cx - 3} ${m + 1}h7" stroke="#2A2233" stroke-width="2" stroke-linecap="round"/>`,
    neutral: `<path d="M${cx - 5} ${m}q5 3 10 0" stroke="#2A2233" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  };
  out += mouths[mood] || mouths.neutral;
  if (mood === 'cry') out += `<path d="M${cx - 8} ${cy + 1}q-4 8 0 12q4 -4 0 -12zM${cx + 8} ${cy + 1}q-4 8 0 12q4 -4 0 -12z" fill="#4C9BE0"/><path d="M${cx - 15} ${cy + 16}q-3 5 0 8q3 -3 0 -8z" fill="#4C9BE0" opacity=".8"/>`;
  if (mood === 'love' || mood === 'happy' || mood === 'laugh') out += `<circle cx="${cx - 12}" cy="${cy + 5}" r="3.2" fill="#F29C9C" opacity=".6"/><circle cx="${cx + 12}" cy="${cy + 5}" r="3.2" fill="#F29C9C" opacity=".6"/>`;
  if (mood === 'sick') out += `<rect x="${cx - 16}" y="${cy - 18}" width="32" height="36" rx="16" fill="#9BD3A8" opacity=".25"/>`;
  return out;
}

// Un personnage centré en (x, 0). arms : positions des mains [gx, gy, dx, dy] relatives à l'épaule.
function person(x, { mood, action, skin, shirt, hair, flip = false }) {
  const s = flip ? -1 : 1;
  const hx = x, hy = 62;
  const sleeping = action === 'sleep';
  let arms;
  switch (action) {
    case 'wave': arms = [-18, 18, 20, -26]; break;
    case 'run': arms = [-22, -6, 18, 16]; break;
    case 'think': arms = [-14, 20, 8, -8]; break;
    case 'talk': arms = [-12, 22, 22, 4]; break;
    case 'shake': arms = [-12, 22, 26, 12]; break;
    case 'hug': arms = [-10, 12, 28, 6]; break;
    case 'hold': arms = [-10, 18, 14, 10]; break;
    default: arms = [-14, 24, 14, 24];
  }
  const [lx, ly, rx, ry] = arms.map((v, i) => (i % 2 === 0 ? v * s : v));
  const shY = 92;
  const legs = action === 'run'
    ? `<path d="M${x - 5} 128l-12 18M${x + 5} 128l14 12" stroke="#2A2A3E" stroke-width="8" stroke-linecap="round"/>`
    : action === 'walk'
      ? `<path d="M${x - 5} 128l-8 20M${x + 5} 128l8 20" stroke="#2A2A3E" stroke-width="8" stroke-linecap="round"/>`
      : `<path d="M${x - 6} 128v20M${x + 6} 128v20" stroke="#2A2A3E" stroke-width="8" stroke-linecap="round"/>`;
  if (sleeping) {
    return `<g><rect x="${x - 46}" y="112" width="92" height="22" rx="8" fill="#B9A7D8"/><rect x="${x - 50}" y="128" width="100" height="10" rx="4" fill="#8F7BB8"/>
      <rect x="${x - 42}" y="98" width="30" height="18" rx="9" fill="#fff"/><path d="M${x - 14} 106h50a8 8 0 0 1 0 16h-50z" fill="${shirt}"/>
      <circle cx="${x - 26}" cy="98" r="15" fill="${skin}"/><path d="M${x - 41} 96a15 15 0 0 1 30 -4q-12 -6 -30 4z" fill="${hair}"/>
      <path d="M${x - 31} 99q3 2 6 0M${x - 22} 99q3 2 6 0" stroke="#2A2233" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <text x="${x + 6}" y="80" font-family="sans-serif" font-weight="800" font-size="16" fill="#6E4AA8">z</text><text x="${x + 18}" y="66" font-family="sans-serif" font-weight="800" font-size="20" fill="#6E4AA8">Z</text></g>`;
  }
  return `<g>
    ${legs}
    <path d="M${x - 17} ${shY + 4}q0 -10 10 -10h14q10 0 10 10v32h-34z" fill="${shirt}"/>
    <path d="M${x - 14} ${shY}l${lx} ${ly}M${x + 14} ${shY}l${rx} ${ry}" stroke="${shirt}" stroke-width="9" stroke-linecap="round"/>
    <circle cx="${x - 14 + lx}" cy="${shY + ly}" r="5" fill="${skin}"/><circle cx="${x + 14 + rx}" cy="${shY + ry}" r="5" fill="${skin}"/>
    <rect x="${x - 5}" y="${hy + 14}" width="10" height="8" fill="${skin}"/>
    <circle cx="${hx}" cy="${hy}" r="19" fill="${skin}"/>
    <path d="M${hx - 19} ${hy - 2}a19 19 0 0 1 38 0q-6 -12 -19 -12t-19 12z" fill="${hair}"/>
    ${face(hx, hy + 2, mood)}
  </g>`;
}

function prop(kind, x, y) {
  switch (kind) {
    case 'phone': return `<rect x="${x - 6}" y="${y - 11}" width="12" height="22" rx="3" fill="#2A2A3E"/><rect x="${x - 4}" y="${y - 8}" width="8" height="14" rx="1.5" fill="#8FD3FF"/>`;
    case 'book': return `<path d="M${x - 15} ${y - 9}h13q2 0 2 2v18q0 -2 -2 -2h-13zM${x + 15} ${y - 9}h-13q-2 0 -2 2v18q0 -2 2 -2h13z" fill="#E0785F" stroke="#A4487A" stroke-width="1.5"/>`;
    case 'pen': return `<rect x="${x - 14}" y="${y - 10}" width="24" height="30" rx="2" fill="#fff" stroke="#B8B2C8" stroke-width="1.5"/><path d="M${x - 9} ${y - 3}h14M${x - 9} ${y + 3}h14M${x - 9} ${y + 9}h9" stroke="#B8B2C8" stroke-width="1.5"/><path d="M${x + 6} ${y + 14}l12 -18" stroke="#2B2A5C" stroke-width="4" stroke-linecap="round"/>`;
    case 'laptop': return `<rect x="${x - 18}" y="${y - 14}" width="36" height="22" rx="3" fill="#2A2A3E"/><rect x="${x - 15}" y="${y - 11}" width="30" height="16" rx="1" fill="#8FD3FF"/><path d="M${x - 24} ${y + 8}h48l-4 6h-40z" fill="#6E6A80"/>`;
    case 'plate': return `<ellipse cx="${x}" cy="${y + 4}" rx="18" ry="6" fill="#fff" stroke="#C9C3D6" stroke-width="1.5"/><circle cx="${x - 5}" cy="${y}" r="5" fill="#E0785F"/><circle cx="${x + 5}" cy="${y + 1}" r="4" fill="#3CA48A"/>`;
    case 'cup': return `<path d="M${x - 9} ${y - 8}h18l-2 18h-14z" fill="#fff" stroke="#A4487A" stroke-width="2"/><path d="M${x + 9} ${y - 4}q7 0 6 6t-7 5" stroke="#A4487A" stroke-width="2" fill="none"/><path d="M${x - 3} ${y - 14}q3 -4 0 -8M${x + 3} ${y - 14}q3 -4 0 -8" stroke="#B8B2C8" stroke-width="1.6" fill="none"/>`;
    case 'money': return `<rect x="${x - 16}" y="${y - 9}" width="32" height="18" rx="3" fill="#7BC89A"/><circle cx="${x}" cy="${y}" r="5" fill="#4E9A6E"/><circle cx="${x + 18}" cy="${y + 10}" r="7" fill="#F2B05E" stroke="#C98A2E" stroke-width="1.5"/>`;
    case 'thermometer': return `<rect x="${x - 3}" y="${y - 16}" width="6" height="24" rx="3" fill="#fff" stroke="#B8B2C8" stroke-width="1.5"/><circle cx="${x}" cy="${y + 10}" r="5" fill="#E0605A"/><rect x="${x - 1.5}" y="${y - 6}" width="3" height="14" fill="#E0605A"/>`;
    case 'heart': return `<path d="M${x} ${y + 10}c-14 -9 -16 -20 -8 -23q5 -2 8 3q3 -5 8 -3c8 3 6 14 -8 23z" fill="#E0605A"/>`;
    case 'music': return `<path d="M${x - 6} ${y + 8}v-22l16 -4v20" stroke="#2B2A5C" stroke-width="3" fill="none"/><circle cx="${x - 9}" cy="${y + 9}" r="5" fill="#2B2A5C"/><circle cx="${x + 7}" cy="${y + 5}" r="5" fill="#2B2A5C"/>`;
    default: return '';
  }
}

export function sceneSVG(spec) {
  const r = spec.seed || 1;
  const skin = SKIN[r % 3], skin2 = SKIN[(r >> 3) % 3];
  const shirt = SHIRT[r % SHIRT.length], shirt2 = SHIRT[(r >> 2) % SHIRT.length === r % SHIRT.length ? (r + 1) % SHIRT.length : (r >> 2) % SHIRT.length];
  const hair = ['#3A2A22', '#7A4A2A', '#1E1B2E', '#C98A4A'][(r >> 4) % 4], hair2 = ['#1E1B2E', '#3A2A22', '#C98A4A', '#7A4A2A'][(r >> 5) % 4];
  const bg = BG[spec.mood] || BG.neutral;
  const two = spec.action === 'shake' || spec.action === 'hug' || spec.action === 'talk';
  let body;
  if (two) {
    const other = spec.action === 'talk' && spec.mood === 'angry' ? 'angry' : spec.mood;
    body = person(58, { mood: spec.mood, action: spec.action, skin, shirt, hair }) + person(102, { mood: other, action: spec.action, skin: skin2, shirt: shirt2, hair: hair2, flip: true });
    if (spec.action === 'talk') body += `<path d="M48 22h40a8 8 0 0 1 8 8v8a8 8 0 0 1 -8 8h-26l-8 8v-8h-6a8 8 0 0 1 -8 -8v-8a8 8 0 0 1 8 -8z" fill="#fff" stroke="#C9C3D6" stroke-width="1.5"/><circle cx="58" cy="34" r="2.5" fill="#8E89A0"/><circle cx="68" cy="34" r="2.5" fill="#8E89A0"/><circle cx="78" cy="34" r="2.5" fill="#8E89A0"/>`;
    if (spec.action === 'hug') body += prop('heart', 80, 28);
  } else {
    const action = spec.prop && !spec.action ? 'hold' : spec.action;
    body = person(80, { mood: spec.mood, action, skin, shirt, hair });
    if (spec.prop) body += prop(spec.prop, spec.prop === 'heart' ? 112 : 108, spec.prop === 'heart' ? 46 : 104);
    if (spec.action === 'think') body += `<circle cx="112" cy="40" r="4" fill="#fff" stroke="#C9C3D6"/><circle cx="120" cy="28" r="6" fill="#fff" stroke="#C9C3D6"/><path d="M118 6h22a8 8 0 0 1 0 16h-22a8 8 0 0 1 0 -16z" fill="#fff" stroke="#C9C3D6" stroke-width="1.5"/><text x="129" y="19" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="12" fill="#6E4AA8">?</text>`;
    if (spec.mood === 'surprised') body += `<text x="112" y="44" font-family="sans-serif" font-weight="900" font-size="26" fill="#E0785F">!</text>`;
    if (spec.mood === 'angry') body += `<path d="M104 40l6 -6M110 46l8 -3M100 34l2 -8" stroke="#E0605A" stroke-width="3" stroke-linecap="round"/>`;
    if (spec.mood === 'scared') body += `<path d="M100 54q2 4 0 7q-2 -3 0 -7z" fill="#8FD3FF"/>`;
  }
  return `<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><rect width="160" height="160" rx="24" fill="${bg}"/><ellipse cx="80" cy="150" rx="56" ry="5" fill="#000" opacity=".06"/>${body}</svg>`;
}
