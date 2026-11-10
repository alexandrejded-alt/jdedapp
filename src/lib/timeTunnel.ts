/**
 * Le tunnel du voyage dans le temps, version épurée « saut en hyperespace » :
 * seulement des traînées de lumière qui jaillissent d'un unique point de fuite (le cratère du volcan)
 * et une lueur au centre. Rien d'autre : le zoom du volcan reste la vedette, le tunnel ne fait
 * que l'accompagner. À l'aller les traits s'écartent du centre, au retour ils y replongent.
 */

/** Secondes ajoutées AVANT le duel : le zoom commence plus tôt, pour être long et progressif. */
export const TUNNEL_PRE = 1.9;
/** Durée réelle du retour (le duel, lui, garde son rythme d'origine). */
export const TUNNEL_BACK = 2.8;

const TAU = Math.PI * 2;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => {
  const x = clamp(n);
  return x * x * (3 - 2 * x);
};
const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const frac = (n: number) => n - Math.floor(n);

export type TunnelState = {
  /** Temps réel écoulé depuis le début de la séquence. */
  T: number;
  /** Intensité du tunnel, de 0 à 1. */
  alpha: number;
  /** Point de fuite à l'écran (suit exactement le zoom). */
  vx: number;
  vy: number;
  /** Vitesse du saut, de 0 à 1 (la longueur des traînées en dépend). */
  speed: number;
  /** Sens du voyage : 1 = aller (les traits s'écartent), -1 = retour (ils replongent). */
  dir: 1 | -1;
};

const STREAKS = 190;

export function drawTunnel(g: CanvasRenderingContext2D, w: number, h: number, s: TunnelState) {
  const a = clamp(s.alpha);
  if (a <= 0.003) return;
  const { vx, vy, T, dir } = s;
  const reach = Math.hypot(w, h);
  const sp = clamp(s.speed);

  g.save();
  g.lineCap = 'round';
  g.globalCompositeOperation = 'lighter';

  // Lueur du point de fuite : chaude, discrète
  const gr = reach * (0.1 + 0.12 * sp);
  const core = g.createRadialGradient(vx, vy, 0, vx, vy, gr);
  core.addColorStop(0, `rgba(255, 236, 200, ${0.42 * a})`);
  core.addColorStop(0.4, `rgba(255, 150, 60, ${0.18 * a})`);
  core.addColorStop(1, 'rgba(255, 100, 20, 0)');
  g.fillStyle = core;
  g.fillRect(vx - gr, vy - gr, gr * 2, gr * 2);

  // Traînées : toutes issues du même point, de plus en plus longues et rapides en s'éloignant
  const rate = 0.55 + 0.9 * sp;
  for (let i = 0; i < STREAKS; i++) {
    const ang = hash(i * 1.7) * TAU;
    const seed = hash(i * 3.3 + 9);
    const p = frac(seed + (dir > 0 ? T : -T) * rate * (0.7 + 0.6 * hash(i + 40)));
    const q = p * p * p;
    const r0 = reach * (0.045 + 0.62 * q);
    const len = reach * (0.01 + (0.04 + 0.34 * sp) * q * 1.6);
    const fade = clamp(p / 0.12) * (1 - clamp((p - 0.9) / 0.1));
    const al = a * fade * (0.25 + 0.7 * q) * (0.5 + 0.5 * seed);
    if (al < 0.01) continue;
    const cx = Math.cos(ang);
    const sy = Math.sin(ang);
    const x0 = vx + cx * r0;
    const y0 = vy + sy * r0;
    const x1 = vx + cx * (r0 + len);
    const y1 = vy + sy * (r0 + len);
    g.lineWidth = 0.6 + 2.6 * q;
    g.strokeStyle = seed > 0.8 ? `rgba(255, 244, 222, ${al})` : seed > 0.35 ? `rgba(255, 196, 120, ${al})` : `rgba(255, 130, 50, ${al})`;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  }
  g.restore();
}

export { ease as tunnelEase };
