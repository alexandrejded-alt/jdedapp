/**
 * Le tunnel du voyage dans le temps : un seul point de fuite (le volcan), des anneaux-cadrans qui
 * foncent vers la caméra, des traits de vitesse, un cadran géant dont les aiguilles tournent,
 * et un vaisseau vu de dos qui file vers le volcan. Tout partage le même point de fuite et la même
 * perspective, pour que l'ensemble se lise comme un seul plan.
 */

/** Secondes ajoutées AVANT le duel : le vaisseau décolle et entre dans le tunnel. */
export const TUNNEL_PRE = 1.9;
/** Durée réelle du retour (le duel, lui, garde son rythme d'origine). */
export const TUNNEL_BACK = 2.8;

const TAU = Math.PI * 2;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const x = clamp(n); return x * x * (3 - 2 * x); };
const noise = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const frac = (n: number) => n - Math.floor(n);

export type TunnelState = {
  /** Temps réel écoulé depuis le début de la séquence. */
  T: number;
  /** Intensité du tunnel, de 0 à 1. */
  alpha: number;
  /** Point de fuite à l'écran. */
  vx: number;
  vy: number;
  /** Avancement du vaisseau : 0 = tout près de la caméra, 1 = dans le point de fuite. */
  ship: number;
  /** Sens du voyage : 1 = aller (vers le passé), -1 = retour. */
  dir: 1 | -1;
};

function ring(g: CanvasRenderingContext2D, x: number, y: number, r: number, z: number, i: number, spin: number, a: number) {
  const col = (k: number) => `rgba(255, ${Math.round(100 + 130 * z)}, ${Math.round(24 + 100 * z * z)}, ${(a * k).toFixed(3)})`;
  g.lineWidth = 0.6 + 4.5 * z * z;
  g.strokeStyle = col(0.9);
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.stroke();
  if (r < 34) return;
  // Graduations de cadran, qui tournent dans un sens puis dans l'autre
  g.strokeStyle = col(0.75);
  g.lineWidth = 0.8 + 1.6 * z;
  const rot = i * 0.7 + spin * (i % 2 ? 1 : -1);
  g.beginPath();
  for (let k = 0; k < 24; k++) {
    const ang = rot + (k / 24) * TAU;
    const len = r * (k % 6 === 0 ? 0.12 : 0.05);
    g.moveTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
    g.lineTo(x + Math.cos(ang) * (r - len), y + Math.sin(ang) * (r - len));
  }
  g.stroke();
}

/** Cadran géant au fond du tunnel : ses aiguilles tournent vite (en arrière à l'aller, en avant au retour). */
function dial(g: CanvasRenderingContext2D, x: number, y: number, R: number, T: number, dir: number, a: number) {
  g.save();
  g.globalAlpha *= a;
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(255, 190, 110, 0.55)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(x, y, R, 0, TAU);
  g.stroke();
  g.beginPath();
  for (let k = 0; k < 12; k++) {
    const ang = (k / 12) * TAU;
    g.moveTo(x + Math.cos(ang) * R, y + Math.sin(ang) * R);
    g.lineTo(x + Math.cos(ang) * (R * (k % 3 === 0 ? 0.84 : 0.92)), y + Math.sin(ang) * (R * (k % 3 === 0 ? 0.84 : 0.92)));
  }
  g.stroke();
  const hand = (ang: number, len: number, w: number, color: string) => {
    g.strokeStyle = color;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x - Math.cos(ang) * R * 0.1, y - Math.sin(ang) * R * 0.1);
    g.lineTo(x + Math.cos(ang) * R * len, y + Math.sin(ang) * R * len);
    g.stroke();
  };
  hand(-Math.PI / 2 - dir * T * 11, 0.82, 2, 'rgba(255, 226, 160, 0.9)');
  hand(-Math.PI / 2 - dir * T * 0.9, 0.55, 3.4, 'rgba(255, 140, 50, 0.9)');
  g.restore();
}

/** Vaisseau vu de dos, qui regarde le point de fuite. Unité : ~50 de demi-envergure. */
function ship(g: CanvasRenderingContext2D, k: number, bank: number, flick: number) {
  g.save();
  g.scale(k, k);
  g.rotate(bank);
  g.lineJoin = 'round';

  // Lueur des réacteurs, additive
  g.globalCompositeOperation = 'lighter';
  for (const sx of [-1, 1]) {
    const gl = g.createRadialGradient(sx * 10, 26, 0, sx * 10, 26, 34 * flick);
    gl.addColorStop(0, 'rgba(255, 236, 190, 0.95)');
    gl.addColorStop(0.3, 'rgba(255, 140, 50, 0.6)');
    gl.addColorStop(1, 'rgba(255, 90, 20, 0)');
    g.fillStyle = gl;
    g.fillRect(sx * 10 - 36, 26 - 36, 72, 72);
  }
  g.globalCompositeOperation = 'source-over';

  // Ailes
  for (const sx of [-1, 1]) {
    const wing = g.createLinearGradient(sx * 14, 0, sx * 54, 26);
    wing.addColorStop(0, '#ff9a3a');
    wing.addColorStop(1, '#b8380a');
    g.fillStyle = wing;
    g.beginPath();
    g.moveTo(sx * 13, -2);
    g.lineTo(sx * 54, 24);
    g.lineTo(sx * 50, 32);
    g.lineTo(sx * 13, 22);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(255, 226, 160, 0.8)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(sx * 13, -2);
    g.lineTo(sx * 54, 24);
    g.stroke();
  }
  // Dérive
  g.fillStyle = '#ffc15a';
  g.beginPath();
  g.moveTo(-3, -16);
  g.lineTo(0, -52);
  g.lineTo(3, -16);
  g.closePath();
  g.fill();
  // Coque
  const hull = g.createLinearGradient(-18, 0, 18, 0);
  hull.addColorStop(0, '#2a1a15');
  hull.addColorStop(0.5, '#5a3425');
  hull.addColorStop(1, '#2a1a15');
  g.fillStyle = hull;
  g.beginPath();
  g.moveTo(0, -38);
  g.lineTo(14, -6);
  g.lineTo(19, 16);
  g.lineTo(9, 28);
  g.lineTo(-9, 28);
  g.lineTo(-19, 16);
  g.lineTo(-14, -6);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(255, 226, 160, 0.7)';
  g.lineWidth = 1.2;
  g.stroke();
  // Verrière
  g.fillStyle = '#1f3550';
  g.beginPath();
  g.ellipse(0, -9, 6, 11, 0, 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(255, 255, 255, 0.35)';
  g.beginPath();
  g.ellipse(-2, -13, 1.8, 5, 0, 0, TAU);
  g.fill();
  // Tuyères
  for (const sx of [-1, 1]) {
    g.fillStyle = '#120c0a';
    g.beginPath();
    g.ellipse(sx * 10, 25, 7, 5, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#ffe3a0';
    g.beginPath();
    g.ellipse(sx * 10, 25, 4.2, 2.8, 0, 0, TAU);
    g.fill();
  }
  g.restore();
}

export function drawTunnel(g: CanvasRenderingContext2D, w: number, h: number, s: TunnelState) {
  const a = clamp(s.alpha);
  if (a <= 0.003) return;
  const { vx, vy, T } = s;
  const reach = Math.hypot(w, h);
  const speed = s.dir > 0 ? 0.8 * T + 0.1 * Math.min(T, 4.2) ** 2 : 0.8 * T;

  g.save();
  g.globalAlpha = a;
  g.lineCap = 'round';

  // Bords du tunnel assombris : au bout, on voit le volcan
  const edge = g.createRadialGradient(vx, vy, reach * 0.12, vx, vy, reach * 0.62);
  edge.addColorStop(0, 'rgba(8, 4, 2, 0)');
  edge.addColorStop(1, 'rgba(8, 4, 2, 0.62)');
  g.fillStyle = edge;
  g.fillRect(0, 0, w, h);

  g.globalCompositeOperation = 'lighter';
  dial(g, vx, vy, Math.min(w, h) * 0.3, T, s.dir, 0.4);

  // Anneaux-cadrans : chacun naît au point de fuite et grossit en fonçant vers nous
  const RINGS = 15;
  for (let i = 0; i < RINGS; i++) {
    const z = frac(speed * 0.55 + i / RINGS);
    const r = reach * 0.012 + reach * 0.72 * Math.pow(z, 2.4);
    ring(g, vx, vy, r, z, i, T * 0.5, Math.sin(Math.PI * z) ** 0.8);
  }

  // Traits de vitesse, tous dirigés vers le même point de fuite
  const rate = s.dir > 0 ? 1.7 : 1.4;
  for (let i = 0; i < 110; i++) {
    const ang = i * 2.39996;
    const p = frac(noise(i) + T * rate);
    const r = (0.04 + p * p) * reach * 0.7;
    const len = (8 + p * 150) * (0.5 + 0.5 * a);
    g.strokeStyle = i % 5 ? `rgba(255, 214, 150, ${0.55 * p})` : `rgba(255, 140, 60, ${0.7 * p})`;
    g.lineWidth = 0.6 + p * 1.5;
    g.beginPath();
    g.moveTo(vx + Math.cos(ang) * r, vy + Math.sin(ang) * r);
    g.lineTo(vx + Math.cos(ang) * (r + len), vy + Math.sin(ang) * (r + len));
    g.stroke();
  }

  // Lueur au point de fuite
  const core = g.createRadialGradient(vx, vy, 0, vx, vy, reach * 0.16);
  core.addColorStop(0, 'rgba(255, 236, 190, 0.7)');
  core.addColorStop(0.4, 'rgba(255, 140, 50, 0.28)');
  core.addColorStop(1, 'rgba(255, 90, 20, 0)');
  g.fillStyle = core;
  g.fillRect(vx - reach * 0.16, vy - reach * 0.16, reach * 0.32, reach * 0.32);
  g.globalCompositeOperation = 'source-over';

  // Vaisseau : en perspective, sa taille et son écart au point de fuite diminuent ensemble
  const q = clamp(s.ship);
  const depth = Math.exp(-3.1 * ease(q));
  const base = Math.min(w, h) * 0.0044;
  const weave = Math.sin(T * 1.7);
  const ox = weave * w * 0.1 * depth;
  const oy = h * 0.3 * depth;
  const sx = vx + ox;
  const sy = vy + oy;
  const flick = 0.85 + 0.15 * Math.sin(T * 40);
  // Traînée : le long de la ligne qui part du point de fuite
  const tl = Math.hypot(ox, oy) || 1;
  const nx = ox / tl;
  const ny = oy / tl;
  const trail = reach * 0.22 * depth + 8;
  g.globalCompositeOperation = 'lighter';
  const tg = g.createLinearGradient(sx, sy, sx + nx * trail, sy + ny * trail);
  tg.addColorStop(0, 'rgba(255, 190, 100, 0.55)');
  tg.addColorStop(1, 'rgba(255, 110, 30, 0)');
  g.strokeStyle = tg;
  g.lineWidth = Math.max(2, 30 * base * depth);
  g.beginPath();
  g.moveTo(sx, sy);
  g.lineTo(sx + nx * trail, sy + ny * trail);
  g.stroke();
  g.globalCompositeOperation = 'source-over';
  g.save();
  g.translate(sx, sy);
  ship(g, base * (0.15 + 0.85 * depth), -weave * 0.2 + (s.dir < 0 ? 0 : 0), flick);
  g.restore();

  g.restore();
}
