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

export const store = {
  state: emptyState(),
  online: true,
  _timer: null,
  _listeners: new Set(),

  // Offline first : la copie du navigateur et la base SQLite sont comparées, la plus récente gagne.
  async load() {
    let server = null, local = null;
    try {
      const r = await fetch('/api/progress', { cache: 'no-store' });
      if (!r.ok) throw new Error('api');
      server = await r.json();
      this.online = true;
    } catch {
      this.online = false;
    }
    try { local = JSON.parse(localStorage.getItem('twilight-progress') || 'null'); } catch { local = null; }
    const valid = d => d && d.version === 1;
    let data = valid(server) ? server : null;
    if (valid(local) && (!data || (local.savedAt || 0) > (data.savedAt || 0))) data = local;
    if (data) {
      const base = emptyState();
      this.state = { ...base, ...data, settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) } };
    }
    // La copie locale était plus récente (travail hors ligne) : on la renvoie au serveur.
    if (this.online && data && data === local) this._write();
    if (!this.online) this._retry();
  },

  save(now = false) {
    clearTimeout(this._timer);
    const run = () => this._write();
    if (now) return run();
    this._timer = setTimeout(run, 1500);
  },

  async _write() {
    this.state.savedAt = Date.now();
    const body = JSON.stringify(this.state);
    try { localStorage.setItem('twilight-progress', body); } catch { /* stockage indisponible */ }
    try {
      const r = await fetch('/api/progress', { method: 'PUT', body, headers: { 'Content-Type': 'application/json' } });
      const was = this.online;
      this.online = r.ok;
      if (this.online && !was) this.emit();
    } catch {
      if (this.online) { this.online = false; this.emit(); }
      this._retry();
    }
  },

  // Serveur arrêté : on réessaie régulièrement, puis on synchronise dès qu'il revient.
  _retry() {
    if (this._retryTimer) return;
    this._retryTimer = setInterval(async () => {
      try {
        const r = await fetch('/api/progress', { method: 'HEAD', cache: 'no-store' });
        if (r.status < 500) { clearInterval(this._retryTimer); this._retryTimer = null; this._write(); }
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
