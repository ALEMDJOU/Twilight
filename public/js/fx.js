// Effets visuels : confettis, compteurs animés, apparitions en cascade. Respecte « réduire les animations ».
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function confetti(intensity = 1) {
  if (reduced()) return;
  const c = document.createElement('canvas');
  c.className = 'confetti';
  const dpr = devicePixelRatio || 1;
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  document.body.append(c);
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  const colors = ['#F2B05E', '#E0785F', '#B4507E', '#6E4AA8', '#FFE2A8', '#3CC48A'];
  const parts = Array.from({ length: Math.round(140 * intensity) }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.3,
    y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 14 - 4,
    s: Math.random() * 7 + 4,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    c: colors[Math.floor(Math.random() * colors.length)],
    round: Math.random() < 0.35,
  }));
  const t0 = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.s / 2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
    if (t - t0 < 2600) requestAnimationFrame(frame); else c.remove();
  })(t0);
}

// Fait défiler un nombre de 0 à sa valeur.
export function countUp(el, to, { duration = 900, suffix = '' } = {}) {
  if (reduced() || typeof to !== 'number') { el.textContent = to + suffix; return; }
  const t0 = performance.now();
  (function step(t) {
    const k = Math.min(1, (t - t0) / duration);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(to * e) + suffix;
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}

// Apparition en cascade des enfants marqués .reveal
export function stagger(root) {
  const els = root.querySelectorAll('.reveal');
  els.forEach((el, i) => el.style.setProperty('--d', `${Math.min(i, 12) * 55}ms`));
}

export function pulse(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}
