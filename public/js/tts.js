// Prononciation avec la synthèse vocale du navigateur (gratuite).
// Hors ligne, seules les voix installées dans Windows (localService) fonctionnent :
// on les choisit toujours en priorité, pour que la prononciation marche avec ou sans internet.
import { store } from './store.js';
import { piperAvailable, piperSpeak, piperStop, piperLoad } from './piper.js';

// Moteur par défaut : Piper (voix américaine locale). Les voix Windows servent de secours.
let piperOk = false;
piperAvailable().then(ok => {
  piperOk = ok;
  document.dispatchEvent(new CustomEvent('voice-change'));
  if (ok && usePiper()) piperLoad().catch(e => { console.warn('Piper indisponible', e); piperOk = false; document.dispatchEvent(new CustomEvent('voice-change')); });
});
const usePiper = () => piperOk && (store.state.settings.voiceEngine || 'piper') === 'piper';
export const piperReady = () => piperOk;

let voices = [];
function refresh() { voices = speechSynthesis.getVoices().filter(v => /^en[-_]/i.test(v.lang)); }
if ('speechSynthesis' in window) {
  refresh();
  speechSynthesis.onvoiceschanged = refresh;
}

export function englishVoices() { return voices; }
export const localVoices = () => voices.filter(v => v.localService);

// État de la voix hors ligne, affiché dans les réglages.
export function voiceStatus() {
  if (usePiper()) return 'piper';
  if (!('speechSynthesis' in window)) return 'none';
  if (localVoices().length) return 'offline';
  return voices.length ? 'online-only' : 'none';
}

function pickVoice() {
  const wanted = store.state.settings.voiceURI;
  const online = navigator.onLine;
  const usable = v => v.localService || online;
  return voices.find(v => v.voiceURI === wanted && usable(v))
    || voices.find(v => /en-GB/i.test(v.lang) && v.localService)
    || voices.find(v => /en-US/i.test(v.lang) && v.localService)
    || voices.find(v => v.localService)
    || (online ? voices.find(v => /en-GB/i.test(v.lang)) || voices[0] : null);
}

let warned = false;
export function speak(text, rate, onEnd) {
  if (!text) { onEnd?.(); return; }
  const clean = String(text).replace(/<[^>]+>/g, '').replace(/___+/g, '…').replace(/[*_=~]/g, '');
  const r = rate ?? store.state.settings.rate ?? 0.95;
  if (usePiper()) {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    piperSpeak(clean, r, onEnd).catch(e => { console.warn('Piper', e); systemSpeak(clean, r, onEnd); });
    return;
  }
  systemSpeak(clean, r, onEnd);
}

function systemSpeak(clean, rate, onEnd) {
  piperStop();
  if (!('speechSynthesis' in window)) { onEnd?.(); return; }
  speechSynthesis.cancel();
  const v = pickVoice();
  if (!v) {
    // Aucune voix anglaise installée sur l'ordinateur : impossible de parler hors ligne.
    if (!warned) { warned = true; document.dispatchEvent(new CustomEvent('tts-missing')); }
    onEnd?.();
    return;
  }
  const u = new SpeechSynthesisUtterance(clean);
  u.voice = v; u.lang = v.lang;
  u.rate = rate;
  let fallbackTried = false;
  u.onend = () => onEnd?.();
  u.onerror = e => {
    // Une voix en ligne échoue sans internet : on réessaie avec une voix locale.
    const local = localVoices()[0];
    if (!fallbackTried && local && !v.localService && e.error !== 'interrupted' && e.error !== 'canceled') {
      fallbackTried = true;
      const u2 = new SpeechSynthesisUtterance(clean);
      u2.voice = local; u2.lang = local.lang; u2.rate = u.rate;
      u2.onend = u2.onerror = () => onEnd?.();
      speechSynthesis.speak(u2);
    } else onEnd?.();
  };
  speechSynthesis.speak(u);
}

export const ttsAvailable = () => piperOk || 'speechSynthesis' in window;
