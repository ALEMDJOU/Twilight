// Accent tonique (word stress) : règles, exemples et exceptions, en anglais américain.
// Notation d'un mot : syllabes séparées par « - », syllabe accentuée en MAJUSCULES.
// Un mot = [notation, traduction, texte à prononcer (facultatif ; false = pas de lecture), IPA imposé à Piper (facultatif)].
export const STRESS_INTRO = {
  en: 'In every English word of two or more syllables, **one syllable is stressed**: it is **louder, longer and higher**, and its vowel is clear. The other syllables are weak, and their vowels often reduce to a short *uh* sound, the **schwa** /ə/. Listen to *ba-**NA**-na*: the first and last *a* are weak, only the middle one is clear.',
  fr: 'En français, les syllabes ont presque toutes la même force, et on appuie légèrement sur la fin du mot. En anglais, c’est très différent : **une syllabe domine**, les autres s’affaiblissent. Une erreur d’accent gêne souvent plus la compréhension qu’un son mal prononcé, et elle peut même changer le mot (*a **DES**-ert*, un désert ; *to de-**SERT***, abandonner). Dans un dictionnaire, le signe **ˈ** placé avant une syllabe indique l’accent : /bəˈnænə/. Ici, la syllabe accentuée est en couleur et en gras. Clique sur un mot pour l’écouter.',
  method: 'Comment appliquer les règles : regarde d’abord **la terminaison** du mot (règles sur les suffixes), car c’est l’indice le plus fiable ; sinon, regarde **sa nature** (nom, adjectif ou verbe) et **son nombre de syllabes**. Ce sont des tendances fortes, pas des lois absolues : en cas de doute, écoute le mot.',
};

export const STRESS_RULES = [
  {
    id: 'two-noun', short: 'Noms et adjectifs (2 syll.)',
    title: 'Two-syllable nouns and adjectives: stress the first syllable',
    titleFr: 'Noms et adjectifs de deux syllabes : accent sur la première',
    en: 'Most nouns and adjectives with two syllables are stressed on the **first** syllable.',
    fr: 'C’est la règle la plus fréquente de l’anglais. Environ neuf noms de deux syllabes sur dix la suivent.',
    groups: [
      { label: 'Noms', words: [['TA-ble', 'une table'], ['WIN-dow', 'une fenêtre'], ['DOC-tor', 'un médecin'], ['MON-ey', 'l’argent'], ['STU-dent', 'un étudiant'], ['PIC-ture', 'une image'], ['PA-per', 'le papier'], ['GAR-den', 'un jardin']] },
      { label: 'Adjectifs', words: [['HAP-py', 'heureux'], ['BUS-y', 'occupé'], ['CLEV-er', 'intelligent'], ['PRET-ty', 'joli'], ['EAS-y', 'facile'], ['FUN-ny', 'drôle'], ['LA-zy', 'paresseux'], ['AN-gry', 'en colère']] },
    ],
    exceptions: [
      { label: 'Noms accentués sur la dernière syllabe', words: [['ho-TEL', 'un hôtel'], ['gui-TAR', 'une guitare'], ['ma-CHINE', 'une machine'], ['po-LICE', 'la police'], ['mis-TAKE', 'une erreur'], ['gi-RAFFE', 'une girafe'], ['ad-VICE', 'un conseil'], ['ga-RAGE', 'un garage']] },
      { label: 'Adjectifs accentués sur la dernière syllabe', words: [['a-LONE', 'seul'], ['a-WARE', 'conscient'], ['a-FRAID', 'effrayé'], ['po-LITE', 'poli'], ['com-PLETE', 'complet'], ['cor-RECT', 'correct'], ['ex-ACT', 'exact']] },
    ],
    tip: 'Beaucoup d’exceptions viennent du français (*hotel, machine, police, garage*) et gardent l’accent à la fin.',
  },
  {
    id: 'two-verb', short: 'Verbes (2 syll.)',
    title: 'Two-syllable verbs: stress the second syllable',
    titleFr: 'Verbes de deux syllabes : accent sur la deuxième',
    en: 'Most verbs with two syllables are stressed on the **second** syllable, especially when it contains a long vowel or ends in two consonants.',
    fr: 'Le premier élément est souvent un préfixe (*be-, de-, for-, in-, re-*) : il ne porte pas l’accent, c’est la racine du verbe qui le porte.',
    groups: [
      { label: 'Verbes', words: [['be-GIN', 'commencer'], ['de-CIDE', 'décider'], ['for-GET', 'oublier'], ['in-VITE', 'inviter'], ['re-LAX', 'se détendre'], ['ar-RIVE', 'arriver'], ['ex-PLAIN', 'expliquer'], ['en-JOY', 'apprécier']] },
    ],
    exceptions: [
      { label: 'Verbes en -en, -er, -ow, -el, -y, -ish, -it, -ise : accent sur la première', words: [['HAP-pen', 'se produire'], ['O-pen', 'ouvrir'], ['LIS-ten', 'écouter'], ['AN-swer', 'répondre'], ['EN-ter', 'entrer'], ['OF-fer', 'offrir'], ['FOL-low', 'suivre'], ['TRAV-el', 'voyager'], ['STUD-y', 'étudier'], ['FIN-ish', 'finir'], ['VIS-it', 'rendre visite'], ['PROM-ise', 'promettre']] },
      { label: 'Exceptions à l’exception : verbes en -er accentués à la fin', words: [['pre-FER', 'préférer'], ['re-FER', 'faire référence'], ['oc-CUR', 'se produire']] },
    ],
    tip: 'Le verbe *enter* et le verbe *offer* se terminent par un *-er* faible : on entend /ər/, donc la syllabe ne peut pas être accentuée.',
  },
  {
    id: 'pairs', short: 'Nom ou verbe ?',
    title: 'Same spelling, noun or verb: the stress changes',
    titleFr: 'Même orthographe, nom ou verbe : l’accent change',
    en: 'For many words spelled the same way, the **noun** is stressed on the **first** syllable and the **verb** on the **second**. Stress moves, and the weak vowel changes too.',
    fr: 'Astuce mémoire : **NOUN** avant, **verB** après. Le nom a l’accent devant, le verbe l’a derrière. Écoute bien la voyelle faible : *a **REC**-ord* mais *to re-**CORD*** avec un *re* très court.',
    pairs: [
      [['REC-ord', 'un enregistrement, un record', 'a record'], ['re-CORD', 'enregistrer', 'to record']],
      [['PRES-ent', 'un cadeau', 'a present'], ['pre-SENT', 'présenter', 'to present']],
      [['OB-ject', 'un objet', 'an object'], ['ob-JECT', 'objecter', 'to object']],
      [['CON-tract', 'un contrat', 'a contract'], ['con-TRACT', 'contracter', 'to contract']],
      [['PER-mit', 'un permis', 'a permit'], ['per-MIT', 'permettre', 'to permit']],
      [['REB-el', 'un rebelle', 'a rebel'], ['re-BEL', 'se rebeller', 'to rebel']],
      [['IN-crease', 'une hausse', 'an increase'], ['in-CREASE', 'augmenter', 'to increase']],
      [['IM-port', 'une importation', 'an import', 'ɐn ˈɪmpoːɹt'], ['im-PORT', 'importer', 'to import']],
      [['EX-port', 'une exportation', 'an export'], ['ex-PORT', 'exporter', 'to export']],
      [['CON-flict', 'un conflit', 'a conflict'], ['con-FLICT', 'être en conflit', 'to conflict']],
      [['SUS-pect', 'un suspect', 'a suspect'], ['sus-PECT', 'soupçonner', 'to suspect']],
      [['DES-ert', 'un désert', 'a desert'], ['de-SERT', 'abandonner', 'to desert']],
    ],
    exceptions: [
      { label: 'Même accent pour le nom et le verbe : sur la première', words: [['PROM-ise', 'promesse, promettre'], ['AN-swer', 'réponse, répondre'], ['TRAV-el', 'voyage, voyager'], ['VIS-it', 'visite, visiter'], ['PIC-ture', 'image, imaginer']] },
      { label: 'Même accent pour le nom et le verbe : sur la deuxième', words: [['re-PLY', 'réponse, répondre'], ['re-GRET', 'regret, regretter'], ['sur-PRISE', 'surprise, surprendre'], ['con-TROL', 'contrôle, contrôler'], ['re-SPECT', 'respect, respecter'], ['de-MAND', 'exigence, exiger']] },
    ],
  },
  {
    id: 'three', short: '3 syllabes et plus',
    title: 'Longer nouns and adjectives: often the first syllable',
    titleFr: 'Noms et adjectifs de trois syllabes : souvent la première',
    en: 'Without a helpful ending, nouns and adjectives of three syllables are often stressed on the **first** syllable.',
    fr: 'C’est une tendance plus qu’une règle : si le mot a une terminaison connue (voir les règles suivantes), c’est elle qui décide. Une syllabe du milieu qui contient une voyelle longue attire souvent l’accent.',
    groups: [
      { label: 'Noms', words: [['CIN-e-ma', 'le cinéma'], ['HOS-pi-tal', 'un hôpital'], ['EL-e-phant', 'un éléphant'], ['AV-e-nue', 'une avenue']] },
      { label: 'Adjectifs', words: [['BEAU-ti-ful', 'beau'], ['DIF-fi-cult', 'difficile'], ['EX-cel-lent', 'excellent'], ['DAN-ger-ous', 'dangereux']] },
    ],
    exceptions: [
      { label: 'Accent au milieu', words: [['ba-NA-na', 'une banane'], ['to-MA-to', 'une tomate'], ['po-TA-to', 'une pomme de terre'], ['com-PUT-er', 'un ordinateur'], ['um-BREL-la', 'un parapluie'], ['mu-SE-um', 'un musée'], ['im-POR-tant', 'important'], ['Sep-TEM-ber', 'septembre']] },
    ],
  },
  {
    id: 'before', short: 'Avant -tion, -ic, -ity…',
    title: 'Endings that put the stress just before them',
    titleFr: 'Terminaisons qui placent l’accent juste avant elles',
    en: 'With these endings, the stress falls on the syllable **immediately before** the ending: **-tion, -sion, -ic, -ical, -ial, -ian, -ious, -ient, -ience, -ity**.',
    fr: 'C’est la règle la plus fiable. Peu importe la longueur du mot : on repère la terminaison et on accentue la syllabe juste devant.',
    groups: [
      { label: '-tion, -sion', words: [['ed-u-CA-tion', 'l’éducation'], ['in-for-MA-tion', 'l’information'], ['de-CI-sion', 'une décision'], ['con-CLU-sion', 'une conclusion']] },
      { label: '-ic, -ical', words: [['fan-TAS-tic', 'fantastique'], ['sci-en-TIF-ic', 'scientifique'], ['ec-o-NOM-ic', 'économique'], ['po-LIT-i-cal', 'politique']] },
      { label: '-ial, -ian', words: [['of-FI-cial', 'officiel'], ['SPE-cial', 'spécial'], ['mu-SI-cian', 'un musicien'], ['li-BRAR-i-an', 'un bibliothécaire']] },
      { label: '-ious, -ient, -ience', words: [['de-LI-cious', 'délicieux'], ['VAR-i-ous', 'divers'], ['ef-FI-cient', 'efficace'], ['ex-PE-ri-ence', 'l’expérience']] },
      { label: '-ity', words: [['a-BIL-i-ty', 'la capacité'], ['e-lec-TRIC-i-ty', 'l’électricité'], ['u-ni-VER-si-ty', 'l’université'], ['re-AL-i-ty', 'la réalité']] },
    ],
    exceptions: [
      { label: 'Mots en -ic accentués plus tôt', words: [['AR-a-bic', 'l’arabe'], ['a-RITH-me-tic', 'l’arithmétique'], ['CATH-o-lic', 'catholique'], ['POL-i-tics', 'la politique'], ['LU-na-tic', 'un fou'], ['RHET-o-ric', 'la rhétorique']] },
      { label: 'Mot en -sion accentué sur la première', words: [['TEL-e-vi-sion', 'la télévision']] },
    ],
  },
  {
    id: 'third', short: '-ate, -ize, -y, -al…',
    title: 'Endings that put the stress two syllables before them',
    titleFr: 'Terminaisons qui placent l’accent sur l’avant-avant-dernière syllabe',
    en: 'With **-ate, -ize, -ify, -al** and words ending in **-cy, -phy, -gy, -try**, count from the end of the word: the stress is on the **third syllable from the end**.',
    fr: 'On compte depuis la fin : dernière, avant-dernière, puis **la troisième**, celle qui porte l’accent. Exemple : *pho-**TOG**-ra-phy* (phy = 1, ra = 2, tog = 3).',
    groups: [
      { label: '-ate', words: [['com-MU-ni-cate', 'communiquer'], ['ED-u-cate', 'éduquer'], ['CON-cen-trate', 'se concentrer'], ['DEC-o-rate', 'décorer']] },
      { label: '-ize, -ify', words: [['OR-gan-ize', 'organiser'], ['REC-og-nize', 'reconnaître'], ['CLAS-si-fy', 'classer'], ['i-DEN-ti-fy', 'identifier']] },
      { label: '-cy, -phy, -gy, -try', words: [['de-MOC-ra-cy', 'la démocratie'], ['pho-TOG-ra-phy', 'la photographie'], ['bi-OL-o-gy', 'la biologie'], ['ge-OM-e-try', 'la géométrie']] },
      { label: '-al', words: [['CRIT-i-cal', 'critique'], ['MED-i-cal', 'médical'], ['NAT-u-ral', 'naturel'], ['PER-son-al', 'personnel']] },
    ],
    exceptions: [
      { label: 'Verbes de 2 syllabes en -ate : accent à la fin', words: [['cre-ATE', 'créer'], ['re-LATE', 'relier'], ['de-BATE', 'débattre']] },
      { label: 'Longs mots en -ize : accent plus tôt', words: [['CHAR-ac-ter-ize', 'caractériser'], ['HOS-pi-tal-ize', 'hospitaliser']] },
      { label: 'Mots en -tal après deux consonnes : accent juste avant -tal', words: [['hor-i-ZON-tal', 'horizontal'], ['ac-ci-DEN-tal', 'accidentel'], ['en-vi-ron-MEN-tal', 'environnemental']] },
    ],
  },
  {
    id: 'self', short: 'Suffixes accentués',
    title: 'Endings that take the stress themselves',
    titleFr: 'Terminaisons qui portent elles-mêmes l’accent',
    en: 'These endings are stressed themselves: **-ee, -eer, -ese, -ette, -que, -oon, -oo**, and **-ain** in verbs.',
    fr: 'Ces mots viennent souvent du français ou d’autres langues, et ils gardent l’accent à la fin, comme en français.',
    groups: [
      { label: '-ee, -eer', words: [['em-ploy-EE', 'un employé', null, 'ˌɛmplɔɪˈiː'], ['ref-u-GEE', 'un réfugié', null, 'ɹˌɛfjuːdʒˈiː'], ['en-gi-NEER', 'un ingénieur'], ['vol-un-TEER', 'un bénévole']] },
      { label: '-ese, -ette', words: [['Chi-NESE', 'chinois'], ['Jap-a-NESE', 'japonais'], ['cig-a-RETTE', 'une cigarette'], ['ga-ZETTE', 'une gazette']] },
      { label: '-que', words: [['u-NIQUE', 'unique'], ['tech-NIQUE', 'une technique'], ['an-TIQUE', 'ancien, antique']] },
      { label: '-oon, -oo', words: [['bal-LOON', 'un ballon'], ['af-ter-NOON', 'l’après-midi'], ['sham-POO', 'le shampoing'], ['kan-ga-ROO', 'un kangourou', null, 'kˌæŋɡɐɹˈuː']] },
      { label: 'Verbes en -ain', words: [['en-ter-TAIN', 'divertir'], ['main-TAIN', 'maintenir'], ['ex-PLAIN', 'expliquer']] },
    ],
    exceptions: [
      { label: 'Mots en -ee accentués plus tôt', words: [['COF-fee', 'le café'], ['TOF-fee', 'le caramel'], ['com-MIT-tee', 'un comité']] },
      { label: 'Noms en -ain : accent sur la première', words: [['MOUN-tain', 'une montagne'], ['CUR-tain', 'un rideau'], ['CAP-tain', 'un capitaine'], ['BAR-gain', 'une bonne affaire']] },
    ],
  },
  {
    id: 'neutral', short: 'Suffixes neutres',
    title: 'Endings and prefixes that change nothing',
    titleFr: 'Suffixes et préfixes qui ne changent rien',
    en: 'These endings and prefixes **do not move the stress**: the word keeps the stress of its base. Endings: **-ment, -ness, -ful, -less, -ly, -er, -ing, -ship, -hood**. Prefixes: **un-, in-, im-, dis-, mis-, re-**.',
    fr: 'Il suffit de connaître l’accent du mot de base : *HAP-py* donne *HAP-pi-ness* et *un-HAP-py*.',
    groups: [
      { label: 'Suffixes', words: [['GOV-ern-ment', 'le gouvernement'], ['em-PLOY-ment', 'l’emploi'], ['HAP-pi-ness', 'le bonheur'], ['CARE-ful', 'prudent'], ['HOPE-less', 'désespéré'], ['TEACH-er', 'un enseignant']] },
      { label: 'Préfixes', words: [['un-HAP-py', 'malheureux'], ['im-POS-si-ble', 'impossible'], ['un-FRIEND-ly', 'hostile'], ['dis-COV-er', 'découvrir']] },
    ],
    exceptions: [
      { label: '-able déplace parfois l’accent', words: [['AD-mi-ra-ble', 'admirable (ad-MIRE)'], ['COM-pa-ra-ble', 'comparable (com-PARE)'], ['PREF-er-a-ble', 'préférable (pre-FER)', null, 'pɹˈɛfɹəbəl']] },
    ],
  },
  {
    id: 'family', short: 'Familles de mots',
    title: 'Word families: the stress can move',
    titleFr: 'Familles de mots : l’accent peut se déplacer',
    en: 'Inside one family, the stress often moves when a stress-changing ending is added. Apply the ending rules to each word.',
    fr: 'Ces mots se ressemblent à l’écrit, mais ils ne sonnent pas pareil : la voyelle accentuée change, et les autres s’affaiblissent. Écoute chaque série à la suite.',
    groups: [
      { label: 'photo', words: [['PHO-to-graph', 'une photographie'], ['pho-TOG-ra-pher', 'un photographe'], ['pho-to-GRAPH-ic', 'photographique']] },
      { label: 'economy', words: [['e-CON-o-my', 'l’économie'], ['ec-o-NOM-ic', 'économique'], ['e-CON-o-mist', 'un économiste']] },
      { label: 'academy', words: [['a-CAD-e-my', 'une académie'], ['ac-a-DEM-ic', 'universitaire']] },
      { label: 'politics', words: [['POL-i-tics', 'la politique'], ['po-LIT-i-cal', 'politique (adj.)'], ['pol-i-TI-cian', 'un homme politique']] },
      { label: 'Canada', words: [['CAN-a-da', 'le Canada'], ['Ca-NA-di-an', 'canadien']] },
    ],
  },
  {
    id: 'compound', short: 'Mots composés',
    title: 'Compounds and phrasal verbs',
    titleFr: 'Mots composés et verbes à particule',
    en: '**Compound nouns** are stressed on the **first** part. **Compound adjectives** and **compound verbs** are stressed on the **second** part. **Phrasal verbs** are stressed on the particle, but the **noun** made from a phrasal verb is stressed on its first part.',
    fr: 'L’accent peut changer le sens : *a **BLACK**-bird* est un merle, *a black **BIRD*** est n’importe quel oiseau noir.',
    groups: [
      { label: 'Noms composés', words: [['BLACK-board', 'un tableau noir'], ['BED-room', 'une chambre'], ['AIR-port', 'un aéroport'], ['TOOTH-brush', 'une brosse à dents'], ['GREEN-house', 'une serre']] },
      { label: 'Adjectifs composés', words: [['old FASH-ioned', 'démodé', 'old-fashioned', 'ˌoʊld fˈæʃənd'], ['bad TEM-pered', 'de mauvaise humeur', 'bad-tempered', 'bˌæd tˈɛmpɚd'], ['well KNOWN', 'bien connu', 'well-known', 'wˌɛl nˈoʊn']] },
      { label: 'Verbes composés', words: [['un-der-STAND', 'comprendre'], ['o-ver-LOOK', 'négliger'], ['out-DO', 'surpasser']] },
      { label: 'Verbes à particule', words: [['get UP', 'se lever'], ['turn ON', 'allumer', null, 'tˌɜːn ˈɔn'], ['give UP', 'abandonner', null, 'ɡˌɪv ˈʌp']] },
      { label: 'Noms issus de verbes à particule', words: [['BREAK-down', 'une panne'], ['TAKE-off', 'un décollage'], ['WORK-out', 'une séance de sport'], ['CHECK-in', 'l’enregistrement']] },
    ],
    exceptions: [
      { label: 'Noms composés accentués sur la seconde partie', words: [['ap-ple PIE', 'une tarte aux pommes', null, 'ˌæpəl pˈaɪ'], ['town HALL', 'une mairie', null, 'tˌaʊn hˈɔːl'], ['Christ-mas DAY', 'le jour de Noël', null, 'kɹˌɪsməs dˈeɪ']] },
      { label: 'Noms de voies : Street à part', words: [['FIFTH Street', 'la 5e Rue'], ['Fifth AV-e-nue', 'la 5e Avenue', null, 'fˌɪfθ ˈævənˌuː'], ['Sun-set BOU-le-vard', 'Sunset Boulevard', null, 'sˌʌnsɛt bˈuːlɪvˌɑːɹd']] },
    ],
  },
  {
    id: 'numbers', short: 'Nombres (-teen, -ty)',
    title: 'Numbers: -teen or -ty?',
    titleFr: 'Les nombres : -teen ou -ty ?',
    en: 'Numbers in **-teen** are stressed on **-teen**. Numbers in **-ty** are stressed on the **first** syllable. This contrast is what helps people hear the difference.',
    fr: 'Très important au téléphone, dans un magasin ou pour un horaire : *thir-**TEEN*** (13) et ***THIR**-ty* (30) ne se distinguent presque que par l’accent.',
    pairs: [
      [['thir-TEEN', '13', 'thirteen', 'θɜːtˈiːn'], ['THIR-ty', '30', 'thirty']],
      [['four-TEEN', '14', 'fourteen', 'foːɹtˈiːn'], ['FOR-ty', '40', 'forty']],
      [['fif-TEEN', '15', 'fifteen', 'fɪftˈiːn'], ['FIF-ty', '50', 'fifty']],
      [['six-TEEN', '16', 'sixteen', 'sɪkstˈiːn'], ['SIX-ty', '60', 'sixty']],
      [['nine-TEEN', '19', 'nineteen', 'naɪntˈiːn'], ['NINE-ty', '90', 'ninety']],
    ],
    exceptions: [
      { label: 'Devant un nom accentué, ou quand on compte, -teen peut reculer', words: [['THIR-teen PEO-ple', '13 personnes', 'thirteen people']] },
    ],
    tip: 'Pour lever le doute, on peut préciser : *thirteen, one three*.',
  },
  {
    id: 'prefix', short: 'Préfixes faibles',
    title: 'Weak first syllables: a-, be-, to-, and -self',
    titleFr: 'Premières syllabes faibles : a-, be-, to-, et -self',
    en: 'Words starting with a weak **a-**, **be-** or **to-** are stressed on the next syllable. Reflexive pronouns are stressed on **-self / -selves**.',
    fr: 'Le *a-* se prononce alors comme un schwa très court, à peine audible : /əˈɡoʊ/.',
    groups: [
      { label: 'a-', words: [['a-GO', 'il y a'], ['a-WAY', 'au loin'], ['a-BOUT', 'à propos de'], ['a-SLEEP', 'endormi']] },
      { label: 'be-, to-', words: [['be-HIND', 'derrière'], ['be-CAUSE', 'parce que'], ['to-DAY', 'aujourd’hui'], ['to-MOR-row', 'demain']] },
      { label: '-self, -selves', words: [['my-SELF', 'moi-même'], ['your-SELF', 'toi-même'], ['them-SELVES', 'eux-mêmes']] },
    ],
    exceptions: [
      { label: 'Un a- prononcé clairement porte l’accent', words: [['AL-ways', 'toujours'], ['AL-so', 'aussi'], ['AF-ter', 'après'], ['A-ble', 'capable']] },
    ],
  },
  {
    id: 'reduced', short: 'Syllabes avalées',
    title: 'Words that lose a syllable',
    titleFr: 'Les mots qui perdent une syllabe',
    en: 'In everyday American English, some words lose a weak syllable after the stressed one. Saying every written syllable sounds unnatural.',
    fr: 'Piège classique pour les francophones, car ces mots ressemblent au français. Le nombre de syllabes prononcées est indiqué à côté de la traduction.',
    noQuiz: true,
    groups: [
      { label: 'On ne prononce pas tout', words: [['COM-fort-a-ble', 'confortable · 3 syllabes : COMF-ter-ble'], ['VEG-e-ta-ble', 'un légume · 3 syllabes : VEJ-te-ble'], ['IN-ter-est-ing', 'intéressant · 3 syllabes : IN-tres-ting'], ['DIF-fer-ent', 'différent · 2 syllabes : DIF-rent'], ['CHOC-o-late', 'le chocolat · 2 syllabes : CHOK-lit'], ['EV-er-y', 'chaque · 2 syllabes : EV-ree'], ['FAM-i-ly', 'la famille · 2 syllabes : FAM-lee'], ['WEDNES-day', 'mercredi · 2 syllabes : WENZ-day'], ['CAM-er-a', 'un appareil photo · 2 syllabes : CAM-ra'], ['RES-tau-rant', 'un restaurant · 2 syllabes : REST-rant']] },
    ],
  },
  {
    id: 'usuk', short: 'US ou UK ?',
    title: 'American or British stress',
    titleFr: 'Accent américain ou britannique',
    en: 'A few words are stressed differently in American and British English. Twilight’s voice is American: use the American form, but recognize the British one.',
    fr: 'Les deux sont correctes, chacune dans sa variante. La voix de Twilight étant américaine, seule la forme américaine se lit à voix haute.',
    noQuiz: true,
    pairLabels: ['Américain', 'Britannique'],
    pairs: [
      [['ga-RAGE', 'un garage'], ['GAR-age', 'un garage', false]],
      [['ad-ver-TISE-ment', 'une publicité'], ['ad-VER-tise-ment', 'une publicité', false]],
      [['LAB-ra-to-ry', 'un laboratoire', 'laboratory'], ['la-BOR-a-to-ry', 'un laboratoire', false]],
      [['bal-LET', 'la danse classique'], ['BAL-let', 'la danse classique', false]],
      [['ca-FÉ', 'un café', 'café'], ['CAF-é', 'un café', false]],
      [['TRANS-late', 'traduire', null, 'tɹˈænsleɪt'], ['trans-LATE', 'traduire', false]],
    ],
  },
];

// Découpe une notation : [{ text, on }, séparateur…]. Le texte à prononcer se déduit des syllabes.
export function parseWord(notation) {
  const tokens = notation.split(/([- ])/);
  const syl = [];
  for (let i = 0; i < tokens.length; i += 2) {
    const raw = tokens[i];
    const on = raw === raw.toUpperCase() && raw !== raw.toLowerCase();
    syl.push({ text: on ? raw.toLowerCase() : raw, on, sep: tokens[i + 1] || '' });
  }
  return syl;
}

export const sayOf = w => w[2] === false ? null : (w[2] || parseWord(w[0]).map(s => s.text + (s.sep === ' ' ? ' ' : '')).join(''));

// Questions de quiz d'une règle : mots réguliers et exceptions (mots d'une seule syllabe accentuée).
export function quizWords(rule) {
  if (rule.noQuiz) return [];
  const out = [];
  const add = (w, why, exception) => { if (parseWord(w[0]).filter(s => s.on).length === 1 && w[2] !== false) out.push({ w, why, exception, rule }); };
  for (const g of rule.groups || []) for (const w of g.words) add(w, rule.titleFr, false);
  for (const p of rule.pairs || []) for (const w of p) add(w, rule.titleFr, false);
  for (const e of rule.exceptions || []) for (const w of e.words) add(w, e.label, true);
  return out;
}
