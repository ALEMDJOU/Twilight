// État de l'application et sauvegarde (serveur local → data/progress.json, secours : localStorage).

const DEFAULT_SETTINGS = {
  minutesPerDay: 90,
  vocabTrack: 'int-then-adv', // ou 'parallel'
  newProverbsPerDay: 5,
  showFr: true,
  voiceURI: null,
  rate: 0.95,
  voiceEngine: 'piper',
  autoSpeak: false,
  speakPraise: true,
  theme: 'auto', // 'auto' | 'light' | 'dark'
};

function emptyState() {
  return {
    version: 1,
    createdAt: Date.now(),
    savedAt: 0,
    settings: { ...DEFAULT_SETTINGS },
    items: {},   // id -> { ef, interval, reps, lapses, due, last, added }
    units: {},   // unitId -> { lessonDone, exDone, right, total }
    days: {},    // 'YYYY-MM-DD' -> { time: {lesson, exercise, cards}, right, wrong, reviews, newCards, plan }
    proverbsIntroduced: 0,
  };
}

const KEY = 'twilight-progress';
const valid = d => d && d.version === 1;
const readLocal = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
const localSavedAt = () => readLocal()?.savedAt || 0;
const snapshot = st => JSON.stringify({ ...st, savedAt: 0 }); // contenu sans la date, pour savoir s'il a changé

// Onglets ouverts en même temps : chacun prévient les autres après une sauvegarde.
const channel = 'BroadcastChannel' in self ? new BroadcastChannel('twilight') : null;

export const store = {
  state: emptyState(),
  online: true,
  _timer: null,
  _base: 0,          // savedAt de la version sur laquelle s'appuie cet onglet
  _clean: null,      // contenu déjà enregistré (rien à renvoyer s'il n'a pas changé)
  _listeners: new Set(),

  // Lit la base SQLite (si le serveur répond) et la copie du navigateur.
  async _fetchBoth() {
    let server = null;
    try {
      const r = await fetch('/api/progress', { cache: 'no-store' });
      if (!r.ok) throw new Error('api');
      server = await r.json();
      this.online = true;
    } catch {
      this.online = false;
    }
    return { server: valid(server) ? server : null, local: valid(readLocal()) ? readLocal() : null };
  },

  _apply(data) {
    const base = emptyState();
    this.state = { ...base, ...data, settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) } };
    this._base = data.savedAt || 0;
    this._clean = snapshot(this.state);
  },

  // Offline first : la copie du navigateur et la base SQLite sont comparées, la plus récente gagne.
  async load() {
    const { server, local } = await this._fetchBoth();
    let data = server;
    if (local && (!data || (local.savedAt || 0) > (data.savedAt || 0))) data = local;
    if (data) this._apply(data);
    // La copie locale était plus récente (travail hors ligne) : on la renvoie au serveur.
    if (this.online && data && data === local) this._write(true);
    if (!this.online) this._retry();
  },

  // Un autre onglet a sauvegardé : on reprend la version la plus récente, sans rien renvoyer.
  // fromServer (après un refus 409) : la version de la base gagne, même si notre copie locale est plus récente.
  async refresh(fromServer = false) {
    clearTimeout(this._timer);
    const { server, local } = await this._fetchBoth();
    let data = server;
    if (!fromServer && local && (!data || (local.savedAt || 0) > (data.savedAt || 0))) data = local;
    if (!data || (!fromServer && (data.savedAt || 0) <= this._base)) return false;
    this._apply(data);
    try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch { /* stockage indisponible */ }
    this.emit();
    dispatchEvent(new CustomEvent('twilight-sync'));
    return true;
  },

  save(now = false) {
    clearTimeout(this._timer);
    const run = () => this._write();
    if (now) return run();
    this._timer = setTimeout(run, 1500);
  },

  // force : renvoyer au serveur même sans changement (copie locale plus récente, retour du serveur).
  async _write(force = false) {
    // Un autre onglet a enregistré une version plus récente : on la recharge au lieu de l'écraser.
    if (localSavedAt() > this._base) return this.refresh();
    const snap = snapshot(this.state);
    if (!force && snap === this._clean) return; // rien de neuf (ex. simple changement d'onglet)
    this._clean = snap;
    const base = this._base;
    this.state.savedAt = Math.max(Date.now(), base + 1);
    this._base = this.state.savedAt;
    const body = JSON.stringify(this.state);
    try { localStorage.setItem(KEY, body); } catch { /* stockage indisponible */ }
    try {
      const r = await fetch('/api/progress', { method: 'PUT', body, headers: { 'Content-Type': 'application/json', 'X-Twilight-Base': String(base) } });
      // 409 : la base a été modifiée ailleurs depuis notre version ; on prend la sienne.
      if (r.status === 409) { this.online = true; return this.refresh(true); }
      const was = this.online;
      this.online = r.ok;
      if (this.online && !was) this.emit();
    } catch {
      if (this.online) { this.online = false; this.emit(); }
      this._retry();
    }
    channel?.postMessage({ savedAt: this.state.savedAt });
  },

  // Serveur arrêté : on réessaie régulièrement, puis on synchronise dès qu'il revient.
  _retry() {
    if (this._retryTimer) return;
    this._retryTimer = setInterval(async () => {
      try {
        const r = await fetch('/api/progress', { method: 'HEAD', cache: 'no-store' });
        if (r.status < 500) { clearInterval(this._retryTimer); this._retryTimer = null; this._write(true); }
      } catch { /* toujours hors ligne */ }
    }, 30000);
  },

  replace(data) {
    const base = emptyState();
    this.state = { ...base, ...data, settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) } };
    this.save(true);
    this.emit();
  },

  reset() {
    this.state = emptyState();
    this.save(true);
    this.emit();
  },

  on(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn); },
  emit() { this._listeners.forEach(fn => fn(this.state)); },
};

// Message d'un autre onglet (ou, à défaut, changement du localStorage) : on se met à jour si c'est plus récent.
const onOther = savedAt => { if (savedAt > store._base) store.refresh(); };
if (channel) channel.onmessage = e => onOther(Number(e.data?.savedAt) || 0);
else addEventListener('storage', e => { if (e.key === KEY) onOther(localSavedAt()); });

export function dayKey(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function today() {
  const k = dayKey();
  const days = store.state.days;
  if (!days[k]) days[k] = { time: { lesson: 0, exercise: 0, cards: 0 }, right: 0, wrong: 0, reviews: 0, newCards: 0, plan: null };
  return days[k];
}

// Série : nombre de jours consécutifs avec au moins 15 minutes d'étude (aujourd'hui compte s'il est atteint).
export function streak() {
  const days = store.state.days;
  const mins = k => { const t = days[k]?.time; return t ? (t.lesson + t.exercise + t.cards) / 60 : 0; };
  let n = 0;
  const d = new Date();
  if (mins(dayKey(d)) < 15) d.setDate(d.getDate() - 1);
  while (mins(dayKey(d)) >= 15) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
