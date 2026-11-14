// Typical mistakes of French speakers, with a checked explanation (in English).
// Each rule receives one correction { from, to, fc, tc }, lower-cased: from/to = the changed part,
// fc/tc = the same with one word of context on each side. The first matching rule wins.
// Rules are deliberately narrow: no explanation is better than a wrong one.

const has = (s, re) => re.test(s);
const words = s => s.split(/\s+/).filter(Boolean);

const UNCOUNTABLE = ['information', 'advice', 'furniture', 'equipment', 'homework', 'luggage', 'baggage', 'knowledge', 'research', 'evidence', 'progress', 'feedback', 'software', 'traffic', 'accommodation', 'transport'];

// False friends: [wrong word, right word, explanation].
const FALSE_FRIENDS = [
  ['actually', 'currently', '“Actually” means “in fact”. For “actuellement”, say currently or at the moment.'],
  ['actually', 'now', '“Actually” means “in fact”. For “actuellement”, say now, currently or at the moment.'],
  ['eventually', 'possibly', '“Eventually” means “in the end”. For “éventuellement”, say possibly or perhaps.'],
  ['sensible', 'sensitive', '“Sensible” means reasonable. Someone who is easily hurt is sensitive.'],
  ['sportive', 'sporty', 'Someone who likes sport is sporty.'],
  ['sympathetic', 'nice', '“Sympathetic” means showing compassion. For “sympa”, say nice or friendly.'],
  ['sympathetic', 'friendly', '“Sympathetic” means showing compassion. For “sympa”, say friendly or nice.'],
  ['sympathic', 'friendly', '“Sympathic” is not an English word. For “sympa”, say friendly or nice.'],
  ['sympathic', 'nice', '“Sympathic” is not an English word. For “sympa”, say nice or friendly.'],
  ['sympathic', 'kind', '“Sympathic” is not an English word. For “sympa”, say kind, nice or friendly.'],
  ['library', 'bookshop', 'A library lends books; a shop that sells books is a bookshop (bookstore in American English).'],
  ['library', 'bookstore', 'A library lends books; a shop that sells books is a bookstore (bookshop in British English).'],
  ['assist', 'attend', 'To be present at an event is to attend it; “assist” means to help.'],
  ['assisted', 'attended', 'To be present at an event is to attend it; “assist” means to help.'],
  ['formation', 'training', 'Professional courses are called training.'],
  ['experiment', 'experience', 'An experiment is a scientific test; what you live through is experience.'],
  ['rest', 'stay', '“Rest” means to relax; to remain somewhere is to stay.'],
  ['rested', 'stayed', '“Rest” means to relax; to remain somewhere is to stay.'],
  ['pass', 'take', 'You take (or sit) an exam; “pass” means to succeed in it.'],
  ['passed', 'took', 'You take (or sit) an exam; “pass” means to succeed in it.'],
  ['equilibrium', 'balance', '“Equilibrium” is a technical word; in daily life we talk about a good balance.'],
  ['occasion', 'opportunity', 'A chance to do something is an opportunity; an occasion is a special event.'],
  ['deception', 'disappointment', '“Deception” means lying or tricking; the feeling is disappointment.'],
  ['deceived', 'disappointed', '“Deceived” means tricked; the feeling is disappointed.'],
  ['souvenirs', 'memories', 'A souvenir is an object you bring back; things you remember are memories.'],
  ['souvenir', 'memory', 'A souvenir is an object you bring back; something you remember is a memory.'],
];

// Words that need a fixed preposition: [word, preposition].
const PREPOSITIONS = [
  ['depend', 'on'], ['depends', 'on'], ['dependent', 'on'], ['interested', 'in'], ['good', 'at'], ['bad', 'at'],
  ['married', 'to'], ['different', 'from'], ['responsible', 'for'], ['proud', 'of'], ['keen', 'on'],
  ['participate', 'in'], ['consist', 'of'], ['believe', 'in'], ['listen', 'to'], ['listening', 'to'],
  ['wait', 'for'], ['waiting', 'for'], ['look', 'at'], ['looking', 'at'], ['ask', 'for'], ['pay', 'for'],
  ['afraid', 'of'], ['full', 'of'], ['similar', 'to'], ['arrive', 'in'], ['arrived', 'in'], ['arrive', 'at'], ['arrived', 'at'],
];

const HOMOPHONES = [
  [['there', 'their', "they're"], 'their = belonging to them; there = in that place; they’re = they are.'],
  [['your', "you're"], 'your = belonging to you; you’re = you are.'],
  [['its', "it's"], 'its = belonging to it; it’s = it is / it has.'],
  [['then', 'than'], 'Use than to compare (bigger than); then means next or at that time.'],
  [['to', 'too', 'two'], 'too = also / more than enough; to = towards; two = 2.'],
  [['lose', 'loose'], 'lose = stop having something; loose = not tight.'],
  [['were', 'where'], 'where = in which place; were = past of be.'],
  [['weather', 'whether'], 'weather = rain, sun…; whether = if.'],
];

const MODALS = 'must|can|could|should|will|would|may|might|shall';
const BASE_OR_PAST = 'went|go|ate|eat|spoke|speak|saw|see|did|do|took|take|wrote|write|came|gave|give|began|begin|drank|drink|ran|swam|swim|knew|know|forgot|forget|chose|choose|broke|break|drove|drive|flew|fly|fell|fall';
const PARTICIPLES = 'gone|eaten|spoken|seen|done|taken|written|come|given|begun|drunk|run|swum|known|forgotten|chosen|broken|driven|flown|fallen';

// Prétérits en -ed inventés pour des verbes irréguliers : forme fautive → [base, prétérit, participe].
// Pas « seed », « leaved », « singed », « flied », « costed », « putted », « leaded », « hided », « blowed » : ce sont aussi de vrais mots.
const WRONG_PAST = {
  feeled: ['feel', 'felt', 'felt'], buyed: ['buy', 'bought', 'bought'], thinked: ['think', 'thought', 'thought'], goed: ['go', 'went', 'gone'],
  eated: ['eat', 'ate', 'eaten'], maked: ['make', 'made', 'made'], taked: ['take', 'took', 'taken'], writed: ['write', 'wrote', 'written'],
  speaked: ['speak', 'spoke', 'spoken'], catched: ['catch', 'caught', 'caught'], teached: ['teach', 'taught', 'taught'], bringed: ['bring', 'brought', 'brought'],
  sleeped: ['sleep', 'slept', 'slept'], spended: ['spend', 'spent', 'spent'], finded: ['find', 'found', 'found'], knowed: ['know', 'knew', 'known'],
  losed: ['lose', 'lost', 'lost'], payed: ['pay', 'paid', 'paid'], sayed: ['say', 'said', 'said'], choosed: ['choose', 'chose', 'chosen'],
  drived: ['drive', 'drove', 'driven'], falled: ['fall', 'fell', 'fallen'], forgeted: ['forget', 'forgot', 'forgotten'], forgetted: ['forget', 'forgot', 'forgotten'],
  gived: ['give', 'gave', 'given'], runned: ['run', 'ran', 'run'], swimmed: ['swim', 'swam', 'swum'], telled: ['tell', 'told', 'told'],
  understanded: ['understand', 'understood', 'understood'], weared: ['wear', 'wore', 'worn'], winned: ['win', 'won', 'won'], comed: ['come', 'came', 'come'],
  drinked: ['drink', 'drank', 'drunk'], meeted: ['meet', 'met', 'met'], sended: ['send', 'sent', 'sent'], readed: ['read', 'read', 'read'],
  keeped: ['keep', 'kept', 'kept'], sitted: ['sit', 'sat', 'sat'], standed: ['stand', 'stood', 'stood'], getted: ['get', 'got', 'got'],
  beginned: ['begin', 'began', 'begun'], breaked: ['break', 'broke', 'broken'], builded: ['build', 'built', 'built'], throwed: ['throw', 'threw', 'thrown'],
  growed: ['grow', 'grew', 'grown'], drawed: ['draw', 'drew', 'drawn'], becomed: ['become', 'became', 'become'], fighted: ['fight', 'fought', 'fought'],
  holded: ['hold', 'held', 'held'], meaned: ['mean', 'meant', 'meant'], hurted: ['hurt', 'hurt', 'hurt'], stealed: ['steal', 'stole', 'stolen'],
  shaked: ['shake', 'shook', 'shaken'], rided: ['ride', 'rode', 'ridden'], lended: ['lend', 'lent', 'lent'], flyed: ['fly', 'flew', 'flown'],
};
const bare = w => (w || '').replace(/^[“"(]+|[.,!?;:”")]+$/g, '');

function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

const single = (from, to) => words(from).length === 1 && words(to).length === 1;

const RULES = [
  // ---- Calques fréquents (corrigés aussi par autoFix) ----
  ({ from, to }) => {
    const t = words(to).map(bare);
    for (const w of words(from).map(bare)) {
      const v = WRONG_PAST[w];
      if (v && t.some(x => v.includes(x)))
        return `${cap(v[0])} is an irregular verb: the past is ${v[1]}${v[2] !== v[1] ? ` (past participle: ${v[2]})` : ''}, not ${w}.`;
    }
    return false;
  },
  ({ fc, tc }) => has(tc, /\byears old\b/) && !has(fc, /\byears old\b/) && has(fc, /\byears\b/)
    && 'For age, say years old or just the number: she is 80 years old / she is 80 (not she is 80 years).',
  ({ from, to, sentence }) => /^(can|can't|cannot)$/.test(bare(words(from)[0])) && /^(could|couldn't)$/.test(bare(words(to)[0]))
    && (PAST_MARK.test(sentence) || words(sentence).some(w => PAST_FORMS.has(bare(w))))
    && 'The story is in the past: the past of can is could (she could not carry it).',
  ({ from, to, sentence }) => {
    const me = has(from, /\bme and\b/) || (has(to, /\band i\b/) && !has(from, /\band i\b/)) || (bare(from) === 'me' && bare(to) === 'i');
    if (!me || !has(sentence, /\band i\b/)) return false;
    return 'When you are part of the subject, use I and put yourself last: my brother and I (not me and my brother).'
      + (has(from, /\bwe\b/) && !has(to, /\bwe\b/) ? ' Don’t repeat the subject with we.' : '');
  },
  ({ from, to, fc, sentence }) => {
    // « my brother we spend » → « my brother spent » : pronom en trop après le sujet (le verbe peut aussi changer de temps).
    const f = words(from).map(bare), t = words(to).map(bare);
    const msg = 'Don’t repeat the subject with a pronoun: my brother spent (not my brother we spent).';
    // Suppression seule : « My brother he is 12 » → « My brother is 12 ».
    const [n0, p0] = words(fc);
    if (!to && /^(we|they|he|she)$/.test(from) && p0 === from && /^[a-z]+$/.test(n0 || '') && !/ly$/.test(n0)
      && !/^(and|or|but|that|because|when|if|so|who|which|where|then|now|also|yesterday|today|tomorrow|i|you|we|they|he|she|it|me|him|her|us|them)$/.test(n0)) return msg;
    const i = f.findIndex((w, k) => k > 0 && /^(we|they|he|she)$/.test(w) && !/^(and|or|but|that|because|when|if|so|i|you|we|they|he|she|it)$/.test(f[k - 1]));
    if (i < 1 || t.length !== f.length - 1 || f.slice(0, i).join(' ') !== t.slice(0, i).join(' ')) return false;
    const v = f[i + 1], v2 = t[i], p = PRESENT[v];
    if (!v || !v2 || f.slice(i + 2).join(' ') !== t.slice(i + 1).join(' ')) return false;
    if (v === v2) return msg;
    return p && past(p[0]) === v2 && PAST_MARK.test(sentence) ? `${msg} Use the past simple with a finished time: ${v2}.` : false;
  },
  ({ from, to, fc }) => from === 'in' && to === 'into' && has(fc, /\bmov(e|es|ed|ing) in\b/)
    && 'Use into for a movement to the inside: move into a new flat, go into the room.',
  ({ from, to, tc, sentence }) => has(from, /\b(make|makes|made|making)\b/) && has(to, /\b(take|takes|took|taking|taken)\b/)
    && has(`${tc} ${sentence}`, /\b(take|takes|took|taking|taken) (a |an |some |many |lots of |a lot of |a few |\w+ )?(photo|photos|photograph|photographs|selfie|selfies)\b/)
    && 'We take a photo (not make a photo).',
  ({ from, to, tc, sentence }) => has(from, /\b(make|makes|made|making|do|does|did|doing|done)\b/) && has(to, /\b(have|has|had|having)\b/)
    && has(`${tc} ${sentence}`, /\b(have|has|had|having) (a|an|the|my|our|their|his|her) (\w+ )?part(y|ies)\b/)
    && 'We have a party (or throw a party), not make / do a party.',
  ({ from, to, fc, tc }) => has(fc, /\b(have|has|had)\b/) && has(tc, /\b(am|is|are|was|were|i'm)\b/) && has(tc, /\b(am|is|are|was|were|i'm) (hungry|thirsty|sleepy|cold|hot|afraid)\b/) && !has(from, /\b(a|an)\b/)
    && 'Use be for these feelings: I am hungry, I am cold, I am afraid (not I have hungry, I have fear).',
  ({ from, to, fc }) => has(fc, /\bpeople\b/) && /^(is|was|has|isn't|wasn't|hasn't|doesn't)$/.test(from) && /^(are|were|have|aren't|weren't|haven't|don't)$/.test(to)
    && 'People is plural: people are, people were, people have, people don’t.',
  ({ from, to, sentence }) => from === 'of' && to === 'in' && has(sentence, new RegExp(`\\b(most \\w+|least \\w+|${SUPER})( \\w+)? in the world\\b`))
    && 'After a superlative, use in for a place: the most beautiful city in the world.',
  // ---- Verbs ----
  ({ from, to }) => has(from, new RegExp(`\\b(have|has) (${BASE_OR_PAST})\\b`)) && has(to, new RegExp(`\\b(${PARTICIPLES})\\b`))
    && 'After have / has, use the past participle: gone, eaten, spoken, seen, done, taken…',
  ({ from, to, fc }) => has(fc, /\b(yesterday|ago|last|in \d{4})\b/) && has(from, /\b(have|has)\b/) && !has(to, /\b(have|has)\b/)
    && 'With a finished time (yesterday, last week, two years ago, in 2020), use the past simple, not the present perfect.',
  ({ from, to }) => has(from, /^(have|has)\b/) && !has(to, /\b(have|has|am|is|are)\b/) && words(to).length <= 2
    && 'The action is finished and placed in the past: use the past simple (we ate, she made), not the present perfect.',
  ({ from, to }) => from === 'have' && to === 'has' && 'With a singular subject (he, she, it, technology, my family…), use has.',
  ({ from, to }) => from === 'has' && to === 'have' && 'With a plural subject (they, we, people…) or I / you, use have.',
  ({ from, to }) => has(from, /\b(was|were) \w+ing\b/) && has(to, /\bused to \w+/)
    && 'For a past habit that has stopped, use used to + verb: people used to write letters.',
  ({ from, to }) => !has(from, /\b(have|has)\b/) && has(to, /\b(have|has) (been|lived|worked|known|studied|had|wanted)\b/)
    && 'For something that started in the past and is still true (for, since), use the present perfect: I have lived here for three years.',
  ({ from, to }) => has(from, /\bdon'?t\b/) && has(to, /\bdoesn'?t\b/) && 'With he, she, it (third person singular), the negative is doesn’t.',
  ({ from, to }) => from === 'do' && to === 'does' && 'With he, she, it (third person singular), use does.',
  ({ from, to }) => from === 'was' && to === 'were' && 'With a plural subject (people, they, we, you), the past of be is were.',
  ({ from, to }) => from === 'is' && to === 'are' && 'With a plural subject, use are. Remember: people is always plural.',
  ({ from, to }) => has(from, /\b(am|is|are) agree\b/) && has(to, /\bagrees?\b/) && 'Agree is a verb: I agree, she agrees (not I am agree).',
  ({ fc, tc }) => has(fc, new RegExp(`\\b(${MODALS}) to \\w+`)) && !has(tc, new RegExp(`\\b(${MODALS}) to\\b`))
    && 'After a modal verb (must, can, should, will, would, could, may, might), use the base form without to.',
  ({ from, tc }) => has(from, /\bfor\b/) && has(tc, /\bto\b/) && !has(tc, /\bfor\b/)
    && 'To express purpose, use to + verb (to improve, to communicate), not for or for to.',
  ({ from, to }) => has(from, /\b(have|has) \d+ years?\b/) && has(to, /\b(am|is|are) \d+/) && 'Use be for age: I am 20 (years old).',
  ({ from, to }) => has(from, /\b(it'?s|it is) depend/) && has(to, /\bit depends\b/) && 'Say it depends (depend is a verb).',
  ({ from, to }) => has(from, /\bwant that\b/) && has(to, /\bwant \w+ to\b/) && 'Use want + person + to + verb: I want you to come.',
  ({ from, to, fc }) => {
    // Third person -s: the same verb with -s / -es / -ies after a singular subject.
    if (!single(from, to)) return false;
    const third = to === from + 's' || to === from + 'es' || (from.endsWith('y') && to === from.slice(0, -1) + 'ies');
    return third && !from.endsWith('s') && has(fc, /\b(he|she|it|everybody|everyone|nobody|somebody|someone)\b/)
      && 'With he, she, it, everybody…, the present simple verb takes -s: she lives, everybody uses.';
  },
  // ---- Nouns and articles ----
  ({ from, to }) => single(from, to) && from.replace(/[.,]$/, '').endsWith('ys') && to.replace(/[.,]$/, '') === from.replace(/[.,]$/, '').slice(0, -2) + 'ies'
    && 'Nouns ending in consonant + y make their plural with -ies: story → stories, city → cities.',
  ({ from, to }) => single(from, to) && to.replace(/[.,]$/, '') === 'lives' && from.replace(/[.,]$/, '') === 'lifes'
    && 'The plural of life is lives (also: wife → wives, knife → knives).',
  ({ from, to }) => UNCOUNTABLE.some(w => from.replace(/[.,]$/, '') === w + 's' && to.replace(/[.,]$/, '').endsWith(w))
    && 'This noun is uncountable in English: no -s and no a (some information, some advice).',
  ({ from, fc }) => from === 'the' && has(fc, /\bwatch\w* the\b/) && 'We say watch TV, without the.',
  ({ from, fc }) => from === 'the' && has(fc, /\bthe next\b/) && 'Say next Saturday, next week, next year — without the.',
  ({ from, to }) => ((from === 'the' && !to) || (has(from, /^the \w+$/) && to === from.slice(4)))
    && 'No article before a noun used in a general sense (technology, life, people) or before meals (during dinner).',
  ({ from, to }) => !from && /^(a|an)$/.test(to) && 'A singular countable noun needs a / an (she is a teacher).',
  ({ from, to }) => from === 'a' && to === 'an' && 'Use an before a vowel sound: an hour, an apple.',
  ({ from, to }) => from === 'an' && to === 'a' && 'Use a before a consonant sound: a university, a European country.',
  ({ from, to }) => has(from, /\bthe most of\b/) && has(to, /\bmost\b/) && 'Say most people, most of the time (not the most of).',
  ({ from, to }) => from === 'much' && to === 'many' && 'Use many with plural countable nouns (many books), much with uncountable nouns (much time).',
  ({ from, to }) => from === 'many' && to === 'much' && 'Use much with uncountable nouns (much money), many with plural countable nouns (many friends).',
  ({ from, to }) => has(from, /\bwrite\b/) && has(to, /writing to/) && 'Use the present continuous for what you are doing now (I’m writing to you), and write to + person.',
  ({ from, tc }) => has(from, /\b(take|takes|took|taking|taken)\b/) && has(tc, /\b(have|has|had|having) breakfast\b/) && 'We have breakfast, lunch or dinner (not take), usually without my.',
  ({ from }) => has(from, /\bimpatient\b/) && '“Impatient” means unable to wait calmly. For a future event you are happy about, use look forward to + -ing: I’m looking forward to seeing you.',
  // ---- Prepositions and structures ----
  ({ from, to, fc }) => (has(from, /\bdiscuss\w* about\b/) || (from === 'about' && !to && has(fc, /\bdiscuss/))) && 'Discuss takes no preposition: discuss a problem (not discuss about).',
  ({ from, to, fc }) => (has(from, /\bexplain\w* me\b/) || (has(fc, /\bexplain/) && has(to, /\bto me\b/))) && 'Say explain something to me (not explain me).',
  ({ fc, to }) => has(fc, /\b(say|said) (me|him|her|us|them)\b/) && has(to, /\b(tell|told)\b/) && 'tell + person (tell me the truth); say + thing (say something, say it to me).',
  ({ from, to }) => from === 'all the time' && to === 'always'
    && 'All the time goes at the end (she is on Instagram all the time); always goes after be or before the verb (she is always on Instagram).',
  ({ from, to }) => from === 'during' && to === 'for' && 'Use for + a length of time (for two hours); during + an event (during the film).',
  ({ from, to }) => from === 'since' && to === 'for' && 'Use for + a length of time (for two years); since + a starting point (since 2020).',
  ({ from, to }) => from === 'for' && to === 'since' && 'Use since + a starting point (since 2020, since Monday); for + a length of time.',
  ({ from, to, fc }) => ((from === 'of' && !to && has(fc, /\bnear of\b/)) || has(from, /\bnear of\b/)) && 'Near takes no of: near Lyon, near the station.',
  ({ from, to, fc }) => has(fc, /\b(go|went|come|came|get|got) to home\b/) && !has(to, /to home/) && 'No to before home after go, come, get: go home, get home.',
  ({ from, to }) => has(from, /\bmake\b/) && has(to, /\b(go|went) \w+ing\b/) && 'For many sports, say go + -ing (go surfing, go skiing), not make.',
  ({ from, to }) => has(from, /\b(make|made|making)\b/) && has(to, /\b(do|did|doing|does|play|played|playing)\b/)
    && 'Use do / play for activities and sports (do sport, play tennis, do homework); make = create or produce (make a cake).',
  ({ from, to, tc }) => has(from, /\bdid\b/) && has(to, /\bhad\b/) && has(tc, /barbecue|party|meal|lunch|dinner|breakfast|picnic/)
    && 'Use have for meals, parties and barbecues: we had a barbecue, have lunch.',
  ({ from, to }) => has(from, /\b(do|did|doing|does)\b/) && has(to, /\b(make|made|making|makes)\b/)
    && 'make = create, produce, cause (make a mistake, make a decision, make friends); do = tasks and activities.',
  ({ fc, tc }) => has(fc, /\btoo much \w+/) && has(tc, /\btoo \w+/) && !has(tc, /too much/) && 'Before an adjective, use too (too expensive, too dependent), not too much.',
  ({ from, to }) => has(from, /\bvery\b/) && has(to, /\breally\b/) && 'Very cannot go before a verb: I really like it / I like it very much.',
  ({ from, to }) => has(from, /\bmore \w+/) && has(to, /\b\w+er\b/) && !has(to, /\bmore\b/) && 'Short adjectives take -er (bigger, cheaper); use more + long adjective (more expensive). Irregular: good → better, bad → worse.',
  ({ from }) => has(from, /\bthe same than\b/) && 'Say the same as (not the same than).',
  ({ fc, tc }) => fc.includes('a lot') && tc.includes('a lot') && tc.indexOf('a lot') > fc.indexOf('a lot')
    && 'Put the object right after the verb; a lot / very much come after it: it changed our lives a lot.',
  ({ from, to }) => has(from, /\b\w+ (he|she|they|it) (is|are|was|were|has|have)\b/) && !has(to, /\b(he|she|they|it) (is|are|was|were|has|have)\b/)
    && 'Don’t repeat the subject with a pronoun: My brother is 12 (not My brother he is 12).',
  ({ fc, tc }) => {
    for (const [w, p] of PREPOSITIONS) {
      const re = new RegExp(`\\b${w} ${p}\\b`);
      if (has(tc, re) && !has(fc, re) && has(fc, new RegExp(`\\b${w}\\b`)))
        return `The right preposition is ${w} ${p}.${/^arrive/.test(w) ? ' (arrive in + city or country, arrive at + a place; never arrive to)' : ''}`;
    }
    return false;
  },
  ({ from, to }) => {
    if (!single(from, to)) return false;
    const a = from.replace(/[.,!?;:]$/, ''), b = to.replace(/[.,!?;:]$/, '');
    for (const [ff, good, msg] of FALSE_FRIENDS) if (a === ff && b === good) return msg;
    for (const [set, msg] of HOMOPHONES) if (set.includes(a) && set.includes(b)) return msg;
    return false;
  },
];

// ---------------------------------------------------------------------------------------------
// Corrections automatiques sûres : calques du français que le petit modèle laisse passer
// (mesuré : sans elles, il ne corrige que ~60 % des erreurs). Chaque motif est étroit et sans ambiguïté.
const DAYS = 'monday|tuesday|wednesday|thursday|friday|saturday|sunday';
// Pas « may » ni « march » : ce sont aussi des verbes.
const MONTHS = 'january|february|april|june|july|august|september|october|november|december';
const LANGS = 'english|french|spanish|german|italian|portuguese|chinese|japanese|arabic|russian|american|british|european|african|canadian';
const COMPARATIVES = { calm: 'calmer', quiet: 'quieter', cheap: 'cheaper', big: 'bigger', small: 'smaller', nice: 'nicer', easy: 'easier', busy: 'busier', happy: 'happier', fast: 'faster', slow: 'slower', old: 'older', young: 'younger', clean: 'cleaner', cold: 'colder', hot: 'hotter', warm: 'warmer', large: 'larger', long: 'longer', short: 'shorter', strong: 'stronger', safe: 'safer', rich: 'richer', poor: 'poorer', tall: 'taller', high: 'higher', low: 'lower', simple: 'simpler', quick: 'quicker', near: 'nearer', late: 'later', early: 'earlier', hard: 'harder' };
const TOO_ADJ = 'dependent|expensive|tired|busy|difficult|hard|easy|big|small|cold|hot|important|interesting|boring|long|short|late|early|young|old|noisy|crowded|stressed|stressful|slow|fast|far|dangerous|complicated|polluted|crazy|serious|heavy|loud';
const HAVE = { take: 'have', takes: 'has', took: 'had', taking: 'having', taken: 'had' };
const gerund = v => v.endsWith('e') && !v.endsWith('ee') ? v.slice(0, -1) + 'ing' : v + 'ing';
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
// Garde la majuscule de départ quand le motif commence une phrase.
const keepCase = (m, rep) => /^[A-Z]/.test(m) ? cap(rep) : rep;
// Le mot juste avant demande-t-il le participe (have eaten, was eaten) ou la base (didn't go, to go) ?
const formAfter = (str, off) => {
  const prev = str.slice(Math.max(0, off - 40), off);
  if (/\b(did|didn['’]t|do|does|don['’]t|doesn['’]t|to|can|could|will|would|should|must|might|may)\s+(not\s+|never\s+)?$/i.test(prev)) return 0;
  if (/(\b(have|has|had|having|been|be|being|is|are|was|were|am|get|gets|got|getting|haven['’]t|hasn['’]t|hadn['’]t|isn['’]t|aren['’]t|wasn['’]t|weren['’]t)|['’](ve|s))\s+(not\s+|never\s+|already\s+|just\s+|ever\s+|also\s+)?$/i.test(prev)) return 2;
  return 1;
};
const NUM = '\\d+|(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[- ](?:one|two|three|four|five|six|seven|eight|nine))?|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen';
const KIN = 'brother|brothers|sister|sisters|friend|friends|mother|father|mum|mom|dad|parents|family|cousin|cousins|wife|husband|girlfriend|boyfriend|son|daughter|children|kids|grandmother|grandfather|grandma|grandpa|grandparents|uncle|aunt|neighbour|neighbor|neighbours|neighbors|colleague|colleagues|classmates|boss|teacher|dog|cat';
const SUPER = 'best|worst|biggest|largest|smallest|tallest|highest|oldest|youngest|richest|poorest|fastest|longest|greatest|strongest|happiest|nicest|coldest|hottest|deepest|cheapest|prettiest|ugliest|busiest|safest';
// Sujet + éventuel adverbe juste avant le verbe (évite « This made a good photo », « Did a party take place »).
const SUBJ_BEFORE = "(?<=\\b(?:I|you|we|they|he|she|to|can|could|will|would|should|must|let['’]s|didn['’]t|don['’]t|doesn['’]t|have|has|had|['’]ve|also|often|always|never|usually|sometimes|then)\\s)";
const TO_HAVE = { make: 'have', makes: 'has', made: 'had', making: 'having', do: 'have', does: 'has', did: 'had', doing: 'having', done: 'had' };
const TO_TAKE = { make: 'take', makes: 'takes', made: 'took', making: 'taking' };
const BE = (p, h) => /^i$/i.test(p) ? (h.toLowerCase() === 'had' ? 'was' : 'am') : /^(he|she)$/i.test(p) ? (h.toLowerCase() === 'had' ? 'was' : 'is') : (h.toLowerCase() === 'had' ? 'were' : 'are');
const PEOPLE_VERB = { is: 'are', was: 'were', has: 'have', "isn't": "aren't", "wasn't": "weren't", "hasn't": "haven't", "doesn't": "don't" };

const AUTO = [
  [/\bsay (me|him|her|us|them)\b/gi, (m, p) => keepCase(m, `tell ${p.toLowerCase()}`)],
  // Seulement au début d'un message (« I write you because… ») : « I write to you every week » est correct.
  [/\bI write (to )?you (because|to tell|to ask|to invite|to thank|about|this)\b/g, (m, to, next) => `I’m writing to you ${next}`],
  [/\bwatch(es|ed|ing)? the (tv|television)\b(?! (show|series|programme|program|news|screen|set))/gi, (m, s = '') => keepCase(m, `watch${s} TV`)],
  [/\b(take|takes|took|taking|taken) (my |his |her |our |their |the )?breakfast\b/gi, (m, v) => keepCase(m, `${HAVE[v.toLowerCase()]} breakfast`)],
  [/\bmore (\w+)\b/gi, (m, a) => COMPARATIVES[a.toLowerCase()] ? keepCase(m, COMPARATIVES[a.toLowerCase()]) : m],
  [new RegExp(`\\b(too|so) much (${TOO_ADJ})\\b`, 'gi'), (m, t, a) => `${t} ${a}`],
  // « changed a lot our lives » → « changed our lives a lot » : le complément suit directement le verbe.
  [/\b(\w+ed|change|changes|help|helps|like|likes|love|loves) (a lot|very much) (our|my|your|their|his|her|the) (\w+)\b/gi, (m, v, adv, det, n) => `${v} ${det} ${n} ${adv}`],
  [new RegExp(`\\bthe next (${DAYS}|week|weekend|month|year)\\b`, 'gi'), (m, d) => keepCase(m, `next ${d}`)],
  [/\b(during|at|for|after|before) the (dinner|lunch|breakfast)\b/gi, (m, p, meal) => `${p} ${meal}`],
  [/\b(I am|I'm|I’m|we are|we're)( so| very| really)? impatient to (see|meet|hear from|visit|start|go)\b/gi, (m, s, adv, v) => `${s}${adv || ''} looking forward to ${gerund(v.split(' ')[0])}${v.includes(' ') ? ' ' + v.split(' ').slice(1).join(' ') : ''}`],
  [/\bpublic transports\b/gi, m => keepCase(m, 'public transport')],
  [/\bthere (is|was) (a lot of|lots of|many) (?!news\b|series\b|means\b)(\w+[^s\W]s)\b/gi, (m, v, q, n) => keepCase(m, `there ${v === 'is' ? 'are' : 'were'} ${q} ${n}`)],
  [/\bsince (\w+) (years|months|weeks|days|hours)\b/gi, (m, n, u) => `for ${n} ${u}`],
  [/\bduring (\w+) (years|months|weeks|days|hours|minutes)\b/gi, (m, n, u) => /^(two|three|four|five|six|seven|eight|nine|ten|\d+|a few|several|many)$/i.test(n) ? `for ${n} ${u}` : m],
  [/\b((?:^|[.!?]\s+|,\s*|\bbut |\band |\bbecause |\bthat ))the (life|nature|society|technology) (is|was|has|can|will)\b/gi, (m, pre, n, v) => `${pre}${/[.!?]\s+$|^$/.test(pre) ? cap(n) : n} ${v}`],
  [/\bnear of\b/gi, m => keepCase(m, 'near')],
  [/\b(listen|listens|listened|listening) (music|the radio|songs|podcasts|my music|the music)\b/gi, (m, v, o) => `${v} to ${o}`],
  [/\bdiscuss(ed|es|ing)? about\b/gi, (m, s = '') => keepCase(m, `discuss${s}`)],
  [/\b(depend|depends|depended|dependent) of\b/gi, (m, w) => `${w} on`],
  [/\b(I|we|they|you) (am|are) agree\b/gi, (m, p) => `${p} agree`],
  // Pas « will » ni « may » : « the will to live » est correct.
  [/\b(must|can|could|should|would|might) to (\w+)/gi, (m, md, v) => `${md} ${v}`],
  [/\bfor to (\w+)/gi, (m, v) => `to ${v}`],
  [/\b(it'?s|it is) depend(s)?\b/gi, m => keepCase(m, 'it depends')],
  [/\bexplain(ed|s)? me\b/gi, (m, s = '') => `explain${s} to me`],
  [/\bmarried with\b/gi, () => 'married to'],
  [/\binterested by\b/gi, () => 'interested in'],
  [/\b(go|goes|went|come|comes|came|get|gets|got) to home\b/gi, (m, v) => `${v} home`],
  [/\bthe most of\b/gi, m => keepCase(m, 'most of')],
  [/\bthe same than\b/gi, () => 'the same as'],
  [/\b(informations|advices|furnitures|homeworks|luggages|knowledges|equipments)\b/gi, m => m.slice(0, -1)],
  [/\b(I|he|she|we|they|you) (have|has) (\d+|twenty|thirty|forty|fifty) years( old)?\b/gi, (m, p, h, n) => `${p} ${/^(he|she)$/i.test(p) ? 'is' : /^i$/i.test(p) ? 'am' : 'are'} ${n} years old`],
  // feeled → felt, have eated → have eaten, didn't goed → didn't go. « payed out » (marine) reste.
  [new RegExp(`\\b(${Object.keys(WRONG_PAST).join('|')})\\b(?! out\\b)`, 'gi'), (m, w, off, str) => keepCase(m, WRONG_PAST[w.toLowerCase()][formAfter(str, off)])],
  // « she is 80 years and » → « 80 years old » ; pas « 2 years and 6 months », ni « married for 30 years ».
  [new RegExp(`\\b((?:I am|I'm|I’m|I was|(?:he|she) (?:is|was)|(?:he|she)['’]s|(?:you|we|they) (?:are|were)|(?:you|we|they)['’]re|(?:my|his|her|our|their) (?:${KIN}) (?:is|are|was|were)) (?:only |almost |nearly |about |now |already )?(?:${NUM})) years(?! old)(?=\\s+and\\b|\\s*[.,;!?]|\\s*$)(?![\\s,]+(?:and\\s+)?(?:a half|\\S+\\s+months?)\\b)`, 'gi'), (m, pre) => `${pre} years old`],
  // « Me and my brother (, we) spend » en début de phrase → « My brother and I spend ». Pas « She invited me and my brother ».
  [new RegExp(`(^|[.!?]\\s+|\\n\\s*)[Mm]e and (my|our) ((?:(?:little|big|older|younger|best|elder) )?(?:${KIN}))(,? we\\b)?(?= [a-z])(?! (?:against|in|at|on|with|for|vs|versus|together|again|too|both|alone|forever)\\b)`, 'g'), (m, pre, det, n) => `${pre}${cap(det)} ${n} and I`],
  [new RegExp(`${SUBJ_BEFORE}(make|makes|made|making) ((?:a|an|some|many|lots of|a lot of|a few|\\d+|two|three|four|five|ten) )?(photos?|photographs?|selfies?)\\b(?=\\s*(?:[.,!?;:]|$)|\\s+(?:of|in front|at|on|for|during|together|every|because|but|while|when|there|here|yesterday|today)\\b)`, 'gi'),
    (m, v, det = '', n, off, str) => `${v.toLowerCase() === 'made' && formAfter(str, off) === 2 ? 'taken' : TO_TAKE[v.toLowerCase()]} ${det}${n}`],
  [new RegExp(`${SUBJ_BEFORE}(make|makes|made|making|do|does|did|doing|done) (a) ((?:big|small|little|surprise|birthday|garden|great|huge|farewell|house|welcome|christmas|halloween) )?party\\b(?=\\s*(?:[.!?;:,]|$)|\\s+(?:for|with|at|on|in|to celebrate|next|last|every|this|tonight|tomorrow|yesterday|and|because|when|but|so|together)\\b)`, 'gi'),
    (m, v, det, adj = '') => `${TO_HAVE[v.toLowerCase()]} ${det} ${adj}party`],
  // « I have hungry / fear » → « I am hungry / afraid ». Pas « We have hot, cold or sparkling water » : seulement en fin de phrase ou devant un mot sûr.
  [/\b(I|you|we|they|he|she) (have|has|had) (hungry|thirsty|sleepy|cold|hot|fear)\b(?=\s*(?:[.!?;]|$)|\s+(?:because|so|now|today|tonight|when|at night|in the (?:morning|evening)|in (?:winter|summer)|of)\b)/gi,
    (m, p, h, a) => `${p} ${BE(p, h)} ${a.toLowerCase() === 'fear' ? 'afraid' : a}`],
  // « people is » → « people are » ; pas « the number of people is », « one of the people is », « a people is » (= un peuple).
  [/(?<!\b(?:[Oo]f|[Aa])\s(?:\w+\s){0,2})\b([Pp]eople) (is|was|has|isn['’]t|wasn['’]t|hasn['’]t|doesn['’]t)\b/g, (m, p, v) => `${p} ${PEOPLE_VERB[v.replace('’', "'")].replace("'", v.includes('’') ? '’' : "'")}`],
  // « the most beautiful (city) of the world » → « in the world » ; pas « the rest of the world », « the world's », « the World Cup ».
  [new RegExp(`\\b(the (?:most|least) (?!of\\b|part\\b)\\w+|the (?:${SUPER}))( \\w+)? of the world\\b(?![’']|\\s+(?:cup|war|wars|championships?|series|tour|records?|bank|heritage|games|stage|order|population|economy)\\b)`, 'gi'),
    (m, sup, n = '') => /^ (part|region|area|corner|side|rest|end|top|history|map|\w+s)$/i.test(n) ? m : `${sup}${n} in the world`],
  // « move in a new house » → « move into ». Pas « move in » seul (= emménager).
  [/\b(move|moves|moved|moving) in (?=(?:a|an) (?:new |bigger |smaller |small |big |nice |little )?(?:house|flat|apartment|home|studio)\b|(?:my|our|their|his|her|the) new (?:house|flat|apartment|home|studio|place|office)\b)/gi, (m, v) => `${v} into `],
  [new RegExp(`\\b(${DAYS}|${MONTHS}|${LANGS})\\b`, 'g'), m => cap(m)],
];

// ---------------------------------------------------------------------------------------------
// Temps verbaux : corrigés seulement quand un indice de temps clair est dans la même phrase.
// Formes irrégulières : base → [prétérit, participe passé].
const IRREGULAR = {
  go: ['went', 'gone'], come: ['came', 'come'], see: ['saw', 'seen'], eat: ['ate', 'eaten'], drink: ['drank', 'drunk'], do: ['did', 'done'],
  have: ['had', 'had'], make: ['made', 'made'], take: ['took', 'taken'], buy: ['bought', 'bought'], meet: ['met', 'met'], read: ['read', 'read'],
  write: ['wrote', 'written'], sleep: ['slept', 'slept'], speak: ['spoke', 'spoken'], leave: ['left', 'left'], run: ['ran', 'run'], swim: ['swam', 'swum'],
  sit: ['sat', 'sat'], get: ['got', 'got'], spend: ['spent', 'spent'], give: ['gave', 'given'], bring: ['brought', 'brought'], teach: ['taught', 'taught'],
  know: ['knew', 'known'], think: ['thought', 'thought'], feel: ['felt', 'felt'], drive: ['drove', 'driven'], fly: ['flew', 'flown'], begin: ['began', 'begun'],
  send: ['sent', 'sent'], wear: ['wore', 'worn'], say: ['said', 'said'], tell: ['told', 'told'], find: ['found', 'found'], lose: ['lost', 'lost'],
  win: ['won', 'won'], sing: ['sang', 'sung'], put: ['put', 'put'], forget: ['forgot', 'forgotten'], understand: ['understood', 'understood'],
};
const DOUBLE = new Set(['run', 'swim', 'sit', 'get', 'stop', 'plan', 'shop', 'begin', 'put', 'win', 'travel', 'chat']);
const ACTION_VERBS = ['go', 'come', 'see', 'eat', 'drink', 'do', 'make', 'take', 'buy', 'meet', 'read', 'write', 'sleep', 'speak', 'run', 'swim', 'sit', 'get',
  'spend', 'give', 'bring', 'teach', 'drive', 'fly', 'send', 'wear', 'say', 'tell', 'find', 'lose', 'win', 'sing', 'put', 'organise', 'organize', 'prepare',
  'play', 'watch', 'work', 'live', 'study', 'cook', 'travel', 'wait', 'rain', 'snow', 'call', 'phone', 'talk', 'listen', 'look', 'plan', 'stay', 'invite',
  'celebrate', 'learn', 'visit', 'walk', 'help', 'clean', 'dance', 'shop', 'chat', 'move', 'paint', 'fix', 'try', 'use'];
const third = v => /(s|sh|ch|x|o|z)$/.test(v) ? v + 'es' : /[^aeiou]y$/.test(v) ? v.slice(0, -1) + 'ies' : v === 'have' ? 'has' : v + 's';
const ing = v => v.endsWith('ie') ? v.slice(0, -2) + 'ying' : DOUBLE.has(v) ? v + v.slice(-1) + 'ing' : /[^e]e$/.test(v) && v !== 'be' ? v.slice(0, -1) + 'ing' : v + 'ing';
const past = v => IRREGULAR[v]?.[0] || (v.endsWith('e') ? v + 'd' : /[^aeiou]y$/.test(v) ? v.slice(0, -1) + 'ied' : DOUBLE.has(v) ? v + v.slice(-1) + 'ed' : v + 'ed');
const participle = v => IRREGULAR[v]?.[1] || past(v);
// Verbes au passé qui montrent que le récit est au passé (pas « read », « put », « left » : même forme au présent, ou autre sens).
const PAST_FORMS = new Set(['was', 'were', 'did', 'had', ...Object.values(IRREGULAR).map(f => f[0]), ...ACTION_VERBS.map(v => past(v))]
  .filter(w => !/^(read|put|left|could)$/.test(w)));
// forme du présent écrite par l'élève → [base, avec -s ?]
const PRESENT = {};
for (const v of ACTION_VERBS.concat(Object.keys(IRREGULAR))) { PRESENT[v] = [v, false]; PRESENT[third(v)] = [v, true]; }

const SUBJ = { i: 'I’m', you: 'you’re', we: 'we’re', they: 'they’re', he: 'he’s', she: 'she’s', it: 'it’s' };
const THIRD_SUBJ = /^(he|she|it)$/i;
const FUTURE_MARK = new RegExp(`\\b(tomorrow|tonight|next (week|weekend|month|year|summer|winter|${DAYS})|this (weekend|evening|afternoon|summer|winter|${DAYS}))\\b`, 'i');
const NOW_MARK = /\b(right now|at the moment|look!|listen!)|^now\b|, now\b/i;
const PAST_WORDS = new RegExp(`\\b(yesterday|last (night|week|weekend|month|year|summer|winter|time|${DAYS})|\\w+ (days|weeks|months|years) ago)\\b`, 'i');
// « in 2019 » est un indice de passé seulement si l'année est passée (« in 2030 » est futur).
const PAST_MARK = { test: s => PAST_WORDS.test(s) || [...s.matchAll(/\bin (\d{4})\b/gi)].some(m => m[1] > 1900 && m[1] < new Date().getFullYear()) };
const DURATION_MARK = /\b(since (\d{4}|\w+day|last \w+|(i|he|she|we|they|you) (was|were)|childhood|then)|for (\d+|two|three|four|five|six|seven|eight|nine|ten|many|several|a few) (years|months|weeks|days|hours))\b/i;
// Le présent reste juste avec un horaire (the train leaves tomorrow), un verbe d'état ou une habitude.
const TIMETABLE = /^(leave|leaves|start|starts|begin|begins|arrive|arrives|open|opens|close|closes|depart|departs|finish|finishes)$/i;
const HABIT = /\b(every|usually|always|often|sometimes|never|generally|normally)\b/i;
const proper = (subj, verb, fn) => {
  const p = PRESENT[verb.toLowerCase()];
  if (!p || p[1] !== THIRD_SUBJ.test(subj)) return null;   // l'accord doit être cohérent, sinon on ne touche à rien
  return fn(p[0]);
};

// prev : la phrase précédente (« Look! It rains. » : l'indice est dans la phrase d'avant).
function fixSentence(s, prev = '') {
  const pron = '\\b(I|you|we|they|he|she|it)\\b';
  if (HABIT.test(s) || /\b(will|won't|going to|'ll|’ll)\b/i.test(s)) return s;
  // Après if / when / unless, le présent simple est juste même avec un futur (if it rains tomorrow).
  if (FUTURE_MARK.test(s) && !/\b(if|when|unless|as soon as|before|after|until)\b/i.test(s)) {
    s = s.replace(new RegExp(`${pron} (\\w+)\\b`, 'gi'), (m, subj, verb) => {
      if (TIMETABLE.test(verb) || /^(have|has)$/i.test(verb)) return m;
      const r = proper(subj, verb, base => `${keepCase(subj, SUBJ[subj.toLowerCase()])} ${ing(base)}`);
      return r || m;
    });
  }
  if (NOW_MARK.test(s) || /^(look|listen)!$/i.test(prev.trim())) {
    s = s.replace(new RegExp(`${pron} (\\w+)\\b`, 'gi'), (m, subj, verb) => {
      if (/^(live|lives|work|works|have|has)$/i.test(verb)) return m;
      return proper(subj, verb, base => `${keepCase(subj, SUBJ[subj.toLowerCase()])} ${ing(base)}`) || m;
    });
  }
  if (PAST_MARK.test(s) && !/\b(since|for \w+ (years|months|weeks|days))\b/i.test(s)) {
    s = s.replace(new RegExp(`${pron} (also |then |first |finally )?(\\w+)\\b`, 'gi'), (m, subj, adv = '', verb) =>
      proper(subj, verb, base => `${subj} ${adv}${past(base)}`) || m);
  }
  if (DURATION_MARK.test(s) && !FUTURE_MARK.test(s)) {
    s = s.replace(new RegExp(`${pron} (am|is|are)\\b(?! \\w+ing)`, 'gi'), (m, subj) => `${subj} ${THIRD_SUBJ.test(subj) ? 'has' : 'have'} been`);
    s = s.replace(new RegExp(`${pron} (\\w+)\\b`, 'gi'), (m, subj, verb) => {
      if (/^(have|has|am|is|are|was|were)$/i.test(verb)) return m;
      return proper(subj, verb, base => `${subj} ${THIRD_SUBJ.test(subj) ? 'has' : 'have'} ${participle(base)}`) || m;
    });
  }
  return s;
}

// Applique les corrections sûres au texte déjà corrigé par l'IA.
// Orthographes britannique et américaine : les deux sont justes (neighbour / neighbor, organise / organize…).
const VARIANTS = [[/our/, 'or'], [/ise$/, 'ize'], [/ised$/, 'ized'], [/ising$/, 'izing'], [/isation$/, 'ization'], [/tre$/, 'ter'], [/ogue$/, 'og'], [/lled$/, 'led'], [/lling$/, 'ling'], [/ence$/, 'ense'], [/yse$/, 'yze']];
export function isSpellingVariant(a, b) {
  const [x, y] = [a, b].map(w => w.toLowerCase().replace(/[.,!?;:]+$/, ''));
  if (x === y || Math.min(x.length, y.length) < 5) return false;   // pas « four » / « for »
  return VARIANTS.some(([re, rep]) => (re.test(x) && x.replace(re, rep) === y) || (re.test(y) && y.replace(re, rep) === x));
}

// Remet l'orthographe de l'élève quand le modèle a seulement changé britannique ↔ américain.
export function keepSpelling(original, corrected) {
  const orig = original.match(/[A-Za-z]+/g) || [];
  return corrected.replace(/[A-Za-z]+/g, w => orig.find(o => isSpellingVariant(o, w)) || w);
}

export function autoFix(text) {
  let t = text;
  // « I and my brother » en début de phrase → « My brother and I ».
  t = t.replace(/(^|[.!?]\s+)I and my (\w+)\b/g, (m, pre, n) => `${pre}My ${n} and I`);
  for (const [re, fn] of AUTO) t = t.replace(re, fn);
  // Phrase par phrase pour les temps : l'indice de temps doit être dans la même phrase que le verbe.
  const parts = t.split(/(?<=[.!?])(\s+)/);
  return parts.map((p, i) => /^\s+$/.test(p) ? p : fixSentence(p, parts[i - 2] || '')).join('');
}

// Explication d'une correction de temps, d'après l'indice présent dans la phrase corrigée.
function explainTense({ from, to, sentence }) {
  if (!sentence || has(from, /\bwrite (to )?you\b/)) return null;   // « I write you » a sa propre explication
  const [f0, t0] = [words(from).at(-1), words(to).at(-1)].map(w => (w || '').replace(/[.,!?;:]$/, ''));
  // Le modèle a mis un verbe au passé : le récit est au passé (ate, swam, visited).
  if (single(from, to) && PRESENT[f0] && past(PRESENT[f0][0]) === t0)
    return PAST_MARK.test(sentence)
      ? 'With a finished time (yesterday, last week, two years ago, in 2019), use the past simple: went, saw, visited.'
      : 'This story is about a finished time in the past: use the past simple (went, ate, visited), not the present.';
  const toCont = has(to, /\b(i'm|you're|we're|they're|he's|she's|it's|am|is|are) \w+ing\b/) && !has(from, /\w+ing\b/);
  if (toCont && FUTURE_MARK.test(sentence))
    return 'For a plan already arranged for the future (next Saturday, tomorrow, tonight), use the present continuous: I’m organising a party next Saturday.';
  if (toCont && (NOW_MARK.test(sentence) || /\b(look|listen)!/.test(sentence)))
    return 'For an action happening right now (now, at the moment, Look!), use the present continuous: it’s raining.';
  const [f] = words(from), [t2] = words(to);
  if (f && t2 && PRESENT[f] && past(PRESENT[f][0]) === t2 && PAST_MARK.test(sentence))
    return 'With a finished time (yesterday, last week, two years ago, in 2019), use the past simple: went, saw, visited.';
  if (has(to, /\b(have|has) (been|\w+(ed|en|wn|ght|ung|ept|ent|ost|ood|ade|ad|ld|id|un|on|et|ut|ot))\b/) && !has(from, /\b(have|has)\b/) && DURATION_MARK.test(sentence))
    return 'For something that started in the past and is still true (since 2019, for three years), use the present perfect: I have lived here since 2019.';
  return null;
}

// Returns an explanation in English, or null when no safe rule applies.
// sentence : la phrase corrigée qui contient la correction (pour les indices de temps).
export function explain({ before = '', from = '', to = '', after = '', sentence = '' }) {
  // Capital letters: the only case where case matters.
  if (single(from, to) && to !== from && to.toLowerCase() === from && /^[A-Z]/.test(to))
    return 'Languages, nationalities, days and months take a capital letter in English (English, Monday, July).';
  const lc = s => s.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  const c = { from: lc(from), to: lc(to), fc: lc(`${before} ${from} ${after}`), tc: lc(`${before} ${to} ${after}`), sentence: lc(sentence) };
  const tense = explainTense(c);
  if (tense) return tense;
  for (const rule of RULES) { const r = rule(c); if (r) return r; }
  // Spelling: one word, very close to the right one.
  if (single(c.from, c.to)) {
    const a = c.from.replace(/[.,!?;:]$/, ''), b = c.to.replace(/[.,!?;:]$/, '');
    // Pas pour les petits mots grammaticaux : have → has n'est pas de l'orthographe.
    const grammar = /^(have|has|had|is|are|was|were|do|does|did|a|an|the|this|that|these|those|much|many|some|any)$/;
    // Verbe régulier mis au passé (kick → kicked) : c'est un temps, pas de l'orthographe.
    if (b === a + 'ed' || b === a + 'd' || (/[^aeiou]y$/.test(a) && b === a.slice(0, -1) + 'ied') || b === a + a.slice(-1) + 'ed')
      return 'This story is about a finished time in the past: use the past simple (kicked, laughed, played), not the present.';
    if (a !== b && a.length > 3 && /^[a-z]+$/.test(b) && !grammar.test(a) && !grammar.test(b) && editDistance(a, b) <= 2) return 'Spelling.';
  }
  return null;
}
