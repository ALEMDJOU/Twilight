// Réglages : temps quotidien, vocabulaire, voix, aide en français, sauvegarde.
import { h, icon, toast, setMode, applyTheme, anchorNav } from '../ui.js';
import { store } from '../store.js';
import { englishVoices, speak, voiceStatus, localVoices, piperReady } from '../tts.js';
import { resetPlan } from '../session.js';

export function settingsView(root) {
  setMode(null);
  const s = store.state.settings;
  const save = (msg = 'Réglage enregistré') => { store.save(); toast(msg); };

  const minutes = h('select', { onchange: e => { s.minutesPerDay = Number(e.target.value); resetPlan(); save('Séance du jour recalculée'); } },
    [15, 20, 30, 45, 60, 90, 120].map(m => h('option', { value: m, selected: m === s.minutesPerDay || null }, m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) : ''}`)));

  const track = h('select', { onchange: e => { s.vocabTrack = e.target.value; resetPlan(); save(); } },
    h('option', { value: 'int-then-adv', selected: s.vocabTrack === 'int-then-adv' || null }, 'Intermédiaire, puis Avancé'),
    h('option', { value: 'parallel', selected: s.vocabTrack === 'parallel' || null }, 'Les deux en alternance'));

  const prov = h('select', { onchange: e => { s.newProverbsPerDay = Number(e.target.value); save(); } },
    [0, 3, 5, 8, 10].map(n => h('option', { value: n, selected: n === s.newProverbsPerDay || null }, String(n))));

  const voiceSel = h('select', { onchange: e => { s.voiceURI = e.target.value || null; save(); speak('Hello! This is my English voice.'); } });
  const fillVoices = () => {
    const vs = englishVoices();
    voiceSel.replaceChildren(h('option', { value: '' }, 'Automatique (anglais britannique)'),
      ...vs.map(v => h('option', { value: v.voiceURI, selected: v.voiceURI === s.voiceURI || null }, `${v.name} (${v.lang})`)));
  };
  const engine = h('select', { onchange: e => { s.voiceEngine = e.target.value; save(); fillStatus(); speak('Hello! This is my American English voice.'); } },
    h('option', { value: 'piper', selected: (s.voiceEngine || 'piper') === 'piper' || null }, 'Piper — voix américaine (hors ligne, recommandé)'),
    h('option', { value: 'windows', selected: s.voiceEngine === 'windows' || null }, 'Voix Windows / Chrome'));
  const voiceInfo = h('div', { class: 'voice-status small' });
  const fillStatus = () => {
    const st = voiceStatus();
    voiceInfo.className = 'voice-status small ' + (st === 'offline' || st === 'piper' ? 'ok' : 'warn');
    if (st === 'piper') return voiceInfo.replaceChildren(h('p', {}, icon('check', 14), ' Voix américaine Piper installée dans Twilight : la prononciation fonctionne sans internet.'));
        voiceInfo.replaceChildren(st === 'offline'
      ? h('p', {}, icon('check', 14), ` Prononciation hors ligne prête : ${localVoices().map(v => v.name.replace(/^Microsoft /, '').replace(/ - .*/, '')).join(', ')}.`)
      : h('div', {},
          h('p', {}, h('strong', {}, 'Aucune voix anglaise installée sur cet ordinateur.'), ' Sans internet, la prononciation ne peut pas fonctionner.'),
          h('p', {}, 'Pour l’installer (une seule fois, gratuit) : Paramètres Windows → Heure et langue → Voix (Speech) → « Ajouter des voix » → choisis ', h('strong', {}, 'English (United Kingdom)'), ' et ', h('strong', {}, 'English (United States)'), '. Redémarre ensuite Chrome.')));
  };
  const fillAll = () => { fillVoices(); fillStatus(); };
  fillAll();
  if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', fillAll);
  document.addEventListener('voice-change', fillStatus);

  const pron = h('select', { onchange: e => { s.pronunciation = e.target.value; save(); } },
    [['easy', 'Indulgente — pour débuter'], ['normal', 'Normale'], ['strict', 'Exigeante — chaque mot compte']].map(([v, l]) =>
      h('option', { value: v, selected: (s.pronunciation || 'normal') === v || null }, l)));

  const rate = h('input', { type: 'range', min: 0.6, max: 1.2, step: 0.05, value: s.rate, onchange: e => { s.rate = Number(e.target.value); save(); speak('How fast should I speak?'); } });

  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Thème' }, [['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']].map(([v, l]) =>
    h('button', { type: 'button', class: s.theme === v ? 'on' : '', onclick: e => {
      s.theme = v; applyTheme(); store.save();
      seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.currentTarget));
    } }, l)));

  // Rappel quotidien : une tâche Windows affiche une notification si la séance n'est pas faite.
  const remTime = h('input', { type: 'time', value: s.reminderTime || '19:00', class: 'time-input' });
  const remSwitch = h('input', { type: 'checkbox' });
  const remInfo = h('p', { class: 'muted small' }, 'Chargement…');
  const remTest = h('button', { class: 'btn ghost', type: 'button', onclick: async () => {
    const r = await fetch('/api/reminder/test', { method: 'POST' }).catch(() => null);
    toast(r?.ok ? 'Notification envoyée' : 'Impossible d’afficher la notification', r?.ok ? 'ok' : 'err');
  } }, icon('play', 16), 'Tester');
  const applyReminder = async () => {
    s.reminderTime = remTime.value; store.save();
    try {
      const r = await fetch('/api/reminder', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: remSwitch.checked, time: remTime.value }) });
      const st = await r.json();
      if (!r.ok) throw new Error(st.error);
      showReminder(st);
      toast(st.enabled ? `Rappel programmé chaque jour à ${st.time}` : 'Rappel désactivé', 'ok');
    } catch { toast('Réglage du rappel impossible', 'err'); remInfo.textContent = 'Le serveur Twilight doit être lancé pour régler le rappel.'; }
  };
  const showReminder = st => {
    if (!st.supported) { remSwitch.disabled = true; remTime.disabled = true; remInfo.textContent = 'Les rappels automatiques sont disponibles sous Windows.'; return; }
    remSwitch.checked = !!st.enabled;
    if (st.time) remTime.value = st.time;
    remInfo.textContent = st.enabled
      ? `Chaque jour à ${st.time}, Windows t’envoie une notification si ta séance n’est pas terminée (même sans internet, même si Twilight est fermé).`
      : 'Désactivé. Active-le pour recevoir une notification chaque jour.';
  };
  remSwitch.onchange = applyReminder;
  remTime.onchange = () => { if (remSwitch.checked) applyReminder(); };
  fetch('/api/reminder').then(r => r.json()).then(showReminder).catch(() => { remInfo.textContent = 'Le serveur Twilight doit être lancé pour régler le rappel.'; });
  const reminderRow = h('div', { class: 'reminder-row' },
    h('label', { class: 'toggle' }, remSwitch, h('span', { class: 'switch' }), h('span', {}, h('strong', {}, 'Rappel quotidien'), h('small', { class: 'muted' }, 'Notification Windows à l’heure choisie.'))),
    h('div', { class: 'reminder-ctl' }, remTime, remTest), remInfo);

  const toggle = (key, label, desc) => h('label', { class: 'toggle' },
    h('input', { type: 'checkbox', checked: s[key] || null, onchange: e => { s[key] = e.target.checked; save(); } }),
    h('span', { class: 'switch' }), h('span', {}, h('strong', {}, label), h('small', { class: 'muted' }, desc)));

  const exportBtn = h('button', { class: 'btn ghost', onclick: () => {
    const blob = new Blob([JSON.stringify(store.state, null, 1)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `twilight-sauvegarde-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a); a.click(); a.remove();
  } }, 'Exporter ma progression');
  const file = h('input', { type: 'file', accept: 'application/json', hidden: true, onchange: async e => {
    try {
      const data = JSON.parse(await e.target.files[0].text());
      if (data.version !== 1) throw new Error();
      store.replace(data); toast('Progression importée', 'ok'); location.hash = '#/';
    } catch { toast('Fichier invalide', 'err'); }
  } });
  const importBtn = h('button', { class: 'btn ghost', onclick: () => file.click() }, 'Importer une sauvegarde');
  let armed = false;
  const resetBtn = h('button', { class: 'btn danger', onclick: () => {
    if (!armed) { armed = true; resetBtn.textContent = 'Clique encore pour tout effacer'; setTimeout(() => { armed = false; resetBtn.textContent = 'Tout réinitialiser'; }, 4000); return; }
    store.reset(); toast('Progression effacée'); location.hash = '#/';
  } }, 'Tout réinitialiser');

  root.replaceChildren(h('h1', { class: 'page-title' }, 'Réglages'),
    h('section', { class: 'card settings' },
      h('h2', {}, icon('clock', 18), 'Séance'),
      row('Temps d’étude par jour', 'La séance se répartit en 40 % cartes, 40 % exercices, 20 % leçons.', minutes),
      row('Parcours de vocabulaire', 'Ordre dans lequel les livres de vocabulaire sont étudiés.', track),
      row('Nouveaux proverbes par jour', '150 proverbes au total.', prov),
      reminderRow),
    h('section', { class: 'card settings reveal' },
      h('h2', {}, icon('sun', 18), 'Apparence'),
      row('Thème', 'Auto suit le réglage de Windows.', seg)),
    h('section', { class: 'card settings reveal' },
      h('h2', {}, icon('sound', 18), 'Voix et aide'),
      row('Moteur de voix', 'Piper est une voix américaine naturelle intégrée à Twilight.', engine),
      row('Voix Windows (secours)', 'Utilisée si Piper est désactivé ou indisponible.', voiceSel),
      voiceInfo,
      row('Vitesse de lecture', 'Plus lent pour mieux entendre.', rate),
      row('Sévérité de la prononciation', 'Niveau d’exigence des exercices au micro (reconnaissance vocale hors ligne).', pron),
      toggle('autoSpeak', 'Lecture automatique', 'Lit la bonne réponse et le dos des cartes à voix haute.'),
      toggle('showFr', 'Aide en français ouverte', 'Affiche directement les explications en français (sinon, un clic suffit).')),
    h('section', { class: 'card settings' },
      h('h2', {}, icon('gear', 18), 'Sauvegarde'),
      h('p', { class: 'muted small' }, store.online
        ? 'Ta progression est enregistrée automatiquement dans la base SQLite Twilight/data/twilight.db, avec une copie par jour dans data/backups.'
        : 'Serveur introuvable : la progression est gardée dans ce navigateur seulement. Lance Twilight avec « Lancer Twilight.bat ».'),
      h('div', { class: 'row-actions' }, exportBtn, importBtn, file, resetBtn)));
  // Ancrages vers chaque bloc de réglages.
  const blocks = [...root.querySelectorAll('section.settings')];
  const nav = anchorNav(blocks.map(b => [b.querySelector('h2')?.textContent.trim() || 'Réglages', b]), { label: 'Réglages' });
  if (nav) root.querySelector('.page-title').after(nav);
}

function row(label, desc, control) {
  return h('div', { class: 'set-row' }, h('div', {}, h('strong', {}, label), h('small', { class: 'muted' }, desc)), control);
}
