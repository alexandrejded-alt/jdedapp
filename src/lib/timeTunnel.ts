/**
 * Le tunnel du voyage dans le temps : un vrai couloir en perspective, avec un seul point de fuite
 * (le volcan). Il est fait de nervures (anneaux) et de longerons, entre lesquels s'enchaînent des
 * panneaux : cadrans d'horloge, engrenages, années qui défilent, hublots allumés, grilles de ventilation.
 * Des arcs d'énergie crépitent sur les nervures, des ondes de choc partent du point de fuite, et un
 * vaisseau détaillé, vu de dos, file vers le volcan. Tout partage la même perspective : un seul plan.
 */

/** Secondes ajoutées AVANT le duel : le vaisseau décolle et entre dans le tunnel. */
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
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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

const SPINES = 16;
const DEPTH = 22;

/** Couleur chaude selon la proximité : or au loin, braise tout près. */
const warm = (near: number, a: number) => `rgba(255, ${Math.round(205 - 105 * near)}, ${Math.round(120 - 96 * near)}, ${Math.max(0, a).toFixed(3)})`;

/** Cadran d'horloge dans un panneau (repère unitaire centré, de -0.5 à 0.5). */
function clockFace(g: CanvasRenderingContext2D, T: number, dir: number, seed: number, a: number) {
  g.strokeStyle = `rgba(255, 196, 110, ${0.8 * a})`;
  g.lineWidth = 0.03;
  g.beginPath();
  g.arc(0, 0, 0.38, 0, TAU);
  g.stroke();
  g.lineWidth = 0.014;
  g.beginPath();
  g.arc(0, 0, 0.32, 0, TAU);
  g.stroke();
  g.lineWidth = 0.024;
  g.beginPath();
  for (let k = 0; k < 12; k++) {
    const an = (k / 12) * TAU;
    const r0 = k % 3 === 0 ? 0.24 : 0.28;
    g.moveTo(Math.cos(an) * r0, Math.sin(an) * r0);
    g.lineTo(Math.cos(an) * 0.32, Math.sin(an) * 0.32);
  }
  g.stroke();
  const mAng = -Math.PI / 2 - dir * T * (5 + seed * 4);
  const hAng = -Math.PI / 2 - dir * T * (0.6 + seed * 0.5);
  g.lineCap = 'round';
  g.strokeStyle = `rgba(255, 240, 200, ${0.95 * a})`;
  g.lineWidth = 0.032;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(Math.cos(mAng) * 0.28, Math.sin(mAng) * 0.28);
  g.stroke();
  g.strokeStyle = `rgba(255, 130, 40, ${0.95 * a})`;
  g.lineWidth = 0.048;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(Math.cos(hAng) * 0.17, Math.sin(hAng) * 0.17);
  g.stroke();
  g.fillStyle = `rgba(255, 240, 200, ${a})`;
  g.beginPath();
  g.arc(0, 0, 0.04, 0, TAU);
  g.fill();
}

/** Engrenage qui tourne. */
function gearFace(g: CanvasRenderingContext2D, T: number, dir: number, seed: number, a: number) {
  const teeth = 10 + Math.floor(seed * 6);
  const rot = dir * T * (0.9 + seed) * (seed > 0.5 ? 1 : -1);
  g.strokeStyle = `rgba(255, 170, 80, ${0.85 * a})`;
  g.fillStyle = `rgba(255, 110, 30, ${0.14 * a})`;
  g.lineWidth = 0.03;
  g.beginPath();
  for (let k = 0; k < teeth * 2; k++) {
    const an = rot + (k / (teeth * 2)) * TAU;
    const r = k % 2 ? 0.27 : 0.38;
    const x = Math.cos(an) * r;
    const y = Math.sin(an) * r;
    if (k === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fill();
  g.stroke();
  g.beginPath();
  g.arc(0, 0, 0.12, 0, TAU);
  g.stroke();
  g.beginPath();
  for (let k = 0; k < 3; k++) {
    const an = rot * 1.0 + (k / 3) * TAU;
    g.moveTo(Math.cos(an) * 0.12, Math.sin(an) * 0.12);
    g.lineTo(Math.cos(an) * 0.26, Math.sin(an) * 0.26);
  }
  g.stroke();
}

/** Années qui défilent. */
function yearFace(g: CanvasRenderingContext2D, T: number, dir: number, seed: number, a: number) {
  const base = 1500 + Math.floor(seed * 520);
  const yr = Math.round(base - dir * T * (14 + seed * 30));
  g.save();
  g.scale(0.01, 0.01);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '700 30px "Barlow Condensed", system-ui, sans-serif';
  g.fillStyle = `rgba(255, 214, 140, ${0.95 * a})`;
  g.fillText(String(yr), 0, 2);
  g.restore();
  g.strokeStyle = `rgba(255, 150, 60, ${0.6 * a})`;
  g.lineWidth = 0.02;
  g.beginPath();
  g.moveTo(-0.4, -0.3);
  g.lineTo(0.4, -0.3);
  g.moveTo(-0.4, 0.3);
  g.lineTo(0.4, 0.3);
  g.stroke();
}

/** Grille de ventilation / hublots allumés en rythme. */
function ventFace(g: CanvasRenderingContext2D, T: number, n: number, seed: number, a: number) {
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    const on = 0.5 + 0.5 * Math.sin(n * 0.9 - T * 4.2 + r * 1.3 + seed * 6);
    g.fillStyle = `rgba(255, ${150 + 70 * on | 0}, ${50 + 90 * on | 0}, ${(0.18 + 0.6 * on) * a})`;
    g.fillRect(-0.36, -0.36 + r * 0.19, 0.72, 0.1);
  }
}

/** Hublots : une rangée de petites fenêtres lumineuses. */
function portholes(g: CanvasRenderingContext2D, T: number, n: number, seed: number, a: number) {
  for (let k = 0; k < 3; k++) {
    const on = 0.55 + 0.45 * Math.sin(n * 0.7 + k * 1.9 - T * 3 + seed * 9);
    g.fillStyle = `rgba(255, 220, 150, ${(0.25 + 0.65 * on) * a})`;
    g.beginPath();
    g.arc(-0.26 + k * 0.26, 0, 0.1, 0, TAU);
    g.fill();
    g.strokeStyle = `rgba(255, 150, 60, ${0.7 * a})`;
    g.lineWidth = 0.025;
    g.stroke();
  }
}

/** Vaisseau vu de dos, qui regarde le point de fuite. Unité : ~50 de demi-envergure. */
function ship(g: CanvasRenderingContext2D, k: number, bank: number, flick: number, T: number) {
  g.save();
  g.scale(k, k);
  g.rotate(bank);
  g.lineJoin = 'round';

  // Flammes des réacteurs : cônes additifs, longs et fins
  g.globalCompositeOperation = 'lighter';
  for (const sx of [-1, 1]) {
    const len = (34 + 14 * Math.sin(T * 60 + sx)) * flick;
    const fl = g.createLinearGradient(0, 28, 0, 28 + len);
    fl.addColorStop(0, 'rgba(255, 250, 220, 0.95)');
    fl.addColorStop(0.35, 'rgba(255, 160, 60, 0.6)');
    fl.addColorStop(1, 'rgba(255, 90, 20, 0)');
    g.fillStyle = fl;
    g.beginPath();
    g.moveTo(sx * 10 - 4.5, 28);
    g.lineTo(sx * 10, 28 + len);
    g.lineTo(sx * 10 + 4.5, 28);
    g.closePath();
    g.fill();
    const gl = g.createRadialGradient(sx * 10, 27, 0, sx * 10, 27, 30 * flick);
    gl.addColorStop(0, 'rgba(255, 236, 190, 0.9)');
    gl.addColorStop(0.3, 'rgba(255, 140, 50, 0.5)');
    gl.addColorStop(1, 'rgba(255, 90, 20, 0)');
    g.fillStyle = gl;
    g.fillRect(sx * 10 - 32, 27 - 32, 64, 64);
  }
  g.globalCompositeOperation = 'source-over';

  // Ailes : deux tons, nervures, bord d'attaque lumineux
  for (const sx of [-1, 1]) {
    const wing = g.createLinearGradient(sx * 14, 0, sx * 56, 26);
    wing.addColorStop(0, '#ffa244');
    wing.addColorStop(1, '#a8300a');
    g.fillStyle = wing;
    g.beginPath();
    g.moveTo(sx * 13, -4);
    g.lineTo(sx * 56, 22);
    g.lineTo(sx * 52, 33);
    g.lineTo(sx * 13, 23);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(40, 14, 6, 0.55)';
    g.beginPath();
    g.moveTo(sx * 15, 6);
    g.lineTo(sx * 47, 24);
    g.lineTo(sx * 45, 29);
    g.lineTo(sx * 15, 20);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(255, 232, 170, 0.9)';
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(sx * 13, -4);
    g.lineTo(sx * 56, 22);
    g.stroke();
    g.strokeStyle = 'rgba(30, 10, 4, 0.7)';
    g.lineWidth = 0.7;
    g.beginPath();
    for (let r = 0; r < 4; r++) {
      g.moveTo(sx * (18 + r * 9), 3 + r * 5);
      g.lineTo(sx * (17 + r * 9), 24 + r * 2);
    }
    g.stroke();
    // Feu de bout d'aile qui clignote
    const blink = Math.sin(T * 9 + (sx > 0 ? 0 : 2.4)) > 0.2;
    g.fillStyle = blink ? (sx > 0 ? '#fff6dc' : '#ff5a2a') : 'rgba(120, 60, 30, 0.8)';
    g.beginPath();
    g.arc(sx * 55, 23, 1.8, 0, TAU);
    g.fill();
    if (blink) {
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = sx > 0 ? 'rgba(255, 240, 200, 0.45)' : 'rgba(255, 90, 40, 0.45)';
      g.beginPath();
      g.arc(sx * 55, 23, 6, 0, TAU);
      g.fill();
      g.globalCompositeOperation = 'source-over';
    }
  }
  // Dérives
  for (const sx of [-1, 1]) {
    g.fillStyle = '#ffbf58';
    g.beginPath();
    g.moveTo(sx * 9, -10);
    g.lineTo(sx * 11, -40);
    g.lineTo(sx * 13, -10);
    g.closePath();
    g.fill();
  }
  g.fillStyle = '#ffd37a';
  g.beginPath();
  g.moveTo(-2.5, -18);
  g.lineTo(0, -56);
  g.lineTo(2.5, -18);
  g.closePath();
  g.fill();

  // Coque : dégradé métal chaud, joints, plaques
  const hull = g.createLinearGradient(-20, 0, 20, 0);
  hull.addColorStop(0, '#24150f');
  hull.addColorStop(0.35, '#6a3d2a');
  hull.addColorStop(0.5, '#8a5236');
  hull.addColorStop(0.65, '#6a3d2a');
  hull.addColorStop(1, '#24150f');
  g.fillStyle = hull;
  g.beginPath();
  g.moveTo(0, -40);
  g.lineTo(14, -6);
  g.lineTo(20, 16);
  g.lineTo(10, 30);
  g.lineTo(-10, 30);
  g.lineTo(-20, 16);
  g.lineTo(-14, -6);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(255, 226, 160, 0.75)';
  g.lineWidth = 1.2;
  g.stroke();
  g.strokeStyle = 'rgba(20, 8, 4, 0.6)';
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(0, -38);
  g.lineTo(0, 26);
  g.moveTo(-15, 4);
  g.lineTo(15, 4);
  g.moveTo(-18, 15);
  g.lineTo(18, 15);
  g.stroke();
  // Prises d'air
  for (const sx of [-1, 1]) {
    g.fillStyle = 'rgba(14, 6, 3, 0.85)';
    g.beginPath();
    g.moveTo(sx * 6, 8);
    g.lineTo(sx * 13, 10);
    g.lineTo(sx * 13, 17);
    g.lineTo(sx * 6, 15);
    g.closePath();
    g.fill();
  }
  // Verrière : verre sombre, reflets
  const glass = g.createLinearGradient(0, -22, 0, 2);
  glass.addColorStop(0, '#3d6a96');
  glass.addColorStop(1, '#0f1d2e');
  g.fillStyle = glass;
  g.beginPath();
  g.ellipse(0, -9, 6.4, 12, 0, 0, TAU);
  g.fill();
  g.strokeStyle = 'rgba(255, 220, 170, 0.8)';
  g.lineWidth = 0.9;
  g.stroke();
  g.fillStyle = 'rgba(255, 255, 255, 0.5)';
  g.beginPath();
  g.ellipse(-2.2, -14, 1.6, 5.5, -0.15, 0, TAU);
  g.fill();
  // Tuyères : anneau, intérieur incandescent
  for (const sx of [-1, 1]) {
    g.fillStyle = '#0e0705';
    g.beginPath();
    g.ellipse(sx * 10, 27, 8, 5.6, 0, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(255, 190, 110, 0.8)';
    g.lineWidth = 1;
    g.stroke();
    g.fillStyle = '#ffe9b8';
    g.beginPath();
    g.ellipse(sx * 10, 27, 4.6, 3, 0, 0, TAU);
    g.fill();
  }
  g.restore();
}

export function drawTunnel(g: CanvasRenderingContext2D, w: number, h: number, s: TunnelState) {
  const a = clamp(s.alpha);
  if (a <= 0.003) return;
  const { vx, vy, T, dir } = s;
  const reach = Math.hypot(w, h);
  const F = reach * 0.2;
  // Distance parcourue, en nervures : une accélération douce à l'aller, une vitesse régulière au retour
  const c = dir > 0 ? 2.2 * T + 0.35 * Math.min(T, 4.2) ** 2 : 2.6 * T;
  const roll = 0.07 * Math.sin(T * 0.8) + 0.02 * Math.sin(T * 2.3);
  const n0 = Math.floor(c);

  g.save();
  g.globalAlpha = a;
  g.lineCap = 'round';
  g.lineJoin = 'round';

  // Assombrit les bords : au bout du couloir, on voit le volcan
  const edge = g.createRadialGradient(vx, vy, reach * 0.1, vx, vy, reach * 0.62);
  edge.addColorStop(0, 'rgba(8, 4, 2, 0)');
  edge.addColorStop(1, 'rgba(8, 4, 2, 0.5)');
  g.fillStyle = edge;
  g.fillRect(0, 0, w, h);

  const P = (th: number, zd: number): [number, number] => {
    const r = F / zd;
    return [vx + Math.cos(th) * r, vy + Math.sin(th) * r];
  };
  const fade = (zd: number) => clamp((DEPTH - 2 - zd) / 8) * clamp((zd - 0.18) / 0.55);
  const dTh = TAU / SPINES;

  // ---- Panneaux, du plus loin au plus proche ----
  for (let n = n0 + DEPTH; n >= n0 + 1; n--) {
    const zA = n - c; // nervure proche
    const zB = zA + 1; // nervure lointaine
    if (zA < 0.12) continue;
    const f = fade(zA);
    if (f <= 0.01) continue;
    const near = clamp(1 - zA / 9);
    for (let k = 0; k < SPINES; k++) {
      const th0 = roll + k * dTh;
      const th1 = th0 + dTh;
      const p0 = P(th0, zA);
      const p1 = P(th1, zA);
      const p2 = P(th1, zB);
      const p3 = P(th0, zB);
      const id = n * 97 + k * 13;
      const hs = hash(id);
      // Plaque sombre, légèrement teintée
      g.fillStyle = `rgba(${28 + 20 * near | 0}, ${12 + 8 * near | 0}, 6, ${0.62 * f})`;
      g.beginPath();
      g.moveTo(p0[0], p0[1]);
      g.lineTo(p1[0], p1[1]);
      g.lineTo(p2[0], p2[1]);
      g.lineTo(p3[0], p3[1]);
      g.closePath();
      g.fill();

      // Détail dans le panneau (repère unitaire, déformé par la perspective)
      const zm = (zA + zB) / 2;
      const [cx, cy] = P(th0 + dTh / 2, zm);
      const tm = th0 + dTh / 2;
      const ux = Math.cos(tm);
      const uy = Math.sin(tm);
      const pw = 2 * Math.sin(dTh / 2) * (F / zm) * 0.86;
      const ph = (F / zA - F / zB) * 0.8;
      if (pw * ph < 6 || pw < 2 || ph < 2) continue;
      if (hs < 0.62) continue; // beaucoup de panneaux restent lisses
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.transform(uy * pw, -ux * pw, ux * ph, uy * ph, cx, cy);
      const af = f * (0.5 + 0.5 * near + 0.2);
      const kind = Math.floor(((hs - 0.62) / 0.38) * 5);
      const seed = hash(id + 5);
      if (kind === 0) clockFace(g, T, dir, seed, af);
      else if (kind === 1) gearFace(g, T, dir, seed, af);
      else if (kind === 2) yearFace(g, T, dir, seed, af);
      else if (kind === 3) ventFace(g, T, n, seed, af);
      else portholes(g, T, n, seed, af);
      g.restore();
    }
  }

  g.globalCompositeOperation = 'lighter';

  // ---- Longerons : les lignes qui filent vers le point de fuite ----
  for (let k = 0; k < SPINES; k++) {
    const th = roll + k * dTh;
    const nearP = P(th, 0.22);
    const farP = P(th, DEPTH);
    const lg = g.createLinearGradient(nearP[0], nearP[1], farP[0], farP[1]);
    lg.addColorStop(0, 'rgba(255, 170, 70, 0.55)');
    lg.addColorStop(0.6, 'rgba(255, 130, 40, 0.28)');
    lg.addColorStop(1, 'rgba(255, 110, 30, 0)');
    g.strokeStyle = lg;
    g.lineWidth = k % 4 === 0 ? 2.4 : 1.1;
    g.beginPath();
    g.moveTo(nearP[0], nearP[1]);
    g.lineTo(farP[0], farP[1]);
    g.stroke();
  }

  // ---- Nervures : anneaux polygonaux, noeuds lumineux, arcs d'énergie ----
  const arcSeed = Math.floor(T * 14);
  for (let n = n0 + DEPTH; n >= n0 + 1; n--) {
    const z = n - c;
    if (z < 0.14) continue;
    const f = fade(z);
    if (f <= 0.01) continue;
    const r = F / z;
    const nearK = clamp(1 - z / 9);
    const major = n % 4 === 0;
    g.strokeStyle = warm(nearK, (major ? 0.95 : 0.55) * f);
    g.lineWidth = (major ? 1.6 : 0.9) + 3.2 * nearK * nearK * (major ? 1.4 : 1);
    g.beginPath();
    for (let k = 0; k <= SPINES; k++) {
      const [x, y] = P(roll + k * dTh, z);
      if (k === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    if (major) {
      // Double filet intérieur
      g.strokeStyle = warm(nearK, 0.35 * f);
      g.lineWidth = 0.8 + 1.2 * nearK;
      g.beginPath();
      g.arc(vx, vy, r * 0.93, 0, TAU);
      g.stroke();
    }
    // Noeuds aux croisements : petite lumière avec halo
    const nodeR = Math.max(1, 1.2 + 4.2 * nearK * nearK + 1.2 * f);
    for (let k = 0; k < SPINES; k++) {
      const pulse = 0.55 + 0.45 * Math.sin(n * 0.9 - T * 5 + k * 0.4);
      const [x, y] = P(roll + k * dTh, z);
      if (x < -40 || x > w + 40 || y < -40 || y > h + 40) continue;
      g.fillStyle = `rgba(255, 236, 190, ${(0.4 + 0.5 * pulse) * f})`;
      g.beginPath();
      g.arc(x, y, nodeR * (major ? 1.3 : 0.9), 0, TAU);
      g.fill();
      if (major && nearK > 0.1) {
        g.fillStyle = `rgba(255, 140, 50, ${0.2 * pulse * f})`;
        g.beginPath();
        g.arc(x, y, nodeR * 3.4, 0, TAU);
        g.fill();
      }
    }
    // Arc électrique entre deux noeuds voisins, qui crépite
    if (major && hash(n * 3.1 + arcSeed) > 0.5 && z > 0.4 && z < 12) {
      const k = Math.floor(hash(n + arcSeed * 0.37) * SPINES);
      const [x0, y0] = P(roll + k * dTh, z);
      const [x1, y1] = P(roll + (k + 1) * dTh, z);
      const mx = x1 - x0;
      const my = y1 - y0;
      const L = Math.hypot(mx, my) || 1;
      g.strokeStyle = `rgba(255, 244, 214, ${0.85 * f})`;
      g.lineWidth = 0.9 + 1.6 * nearK;
      g.beginPath();
      g.moveTo(x0, y0);
      const segs = 7;
      for (let q = 1; q < segs; q++) {
        const u = q / segs;
        const off = (hash(n * 11 + q + arcSeed) - 0.5) * L * 0.3;
        g.lineTo(x0 + mx * u - (my / L) * off, y0 + my * u + (mx / L) * off);
      }
      g.lineTo(x1, y1);
      g.stroke();
      g.strokeStyle = `rgba(255, 130, 40, ${0.35 * f})`;
      g.lineWidth = 4 + 6 * nearK;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
    }
  }

  // ---- Poussière et traits de vitesse (peu nombreux, fins) ----
  const rate = dir > 0 ? 1.5 : 1.3;
  for (let i = 0; i < 70; i++) {
    const ang = i * 2.39996;
    const p = frac(hash(i) + T * rate);
    const r = (0.05 + p * p) * reach * 0.7;
    const len = (6 + p * 90) * (0.5 + 0.5 * a);
    g.strokeStyle = i % 5 ? `rgba(255, 220, 160, ${0.45 * p})` : `rgba(255, 150, 70, ${0.55 * p})`;
    g.lineWidth = 0.5 + p * 1.2;
    g.beginPath();
    g.moveTo(vx + Math.cos(ang) * r, vy + Math.sin(ang) * r);
    g.lineTo(vx + Math.cos(ang) * (r + len), vy + Math.sin(ang) * (r + len));
    g.stroke();
  }

  // ---- Au point de fuite : ondes de choc, halo, reflet anamorphique ----
  for (let i = 0; i < 3; i++) {
    const p = frac(T * 0.55 * (dir > 0 ? 1 : -1) + i / 3);
    const pr = reach * 0.5 * p * p + 6;
    g.strokeStyle = `rgba(255, 190, 110, ${0.5 * (1 - p) * p * 4 * 0.5})`;
    g.lineWidth = 1 + 2.4 * (1 - p);
    g.beginPath();
    g.arc(vx, vy, pr, 0, TAU);
    g.stroke();
  }
  const core = g.createRadialGradient(vx, vy, 0, vx, vy, reach * 0.13);
  core.addColorStop(0, 'rgba(255, 244, 214, 0.5)');
  core.addColorStop(0.35, 'rgba(255, 150, 60, 0.2)');
  core.addColorStop(1, 'rgba(255, 90, 20, 0)');
  g.fillStyle = core;
  g.fillRect(vx - reach * 0.13, vy - reach * 0.13, reach * 0.26, reach * 0.26);
  const flare = g.createLinearGradient(vx - reach * 0.25, vy, vx + reach * 0.25, vy);
  flare.addColorStop(0, 'rgba(255, 150, 60, 0)');
  flare.addColorStop(0.5, 'rgba(255, 230, 180, 0.42)');
  flare.addColorStop(1, 'rgba(255, 150, 60, 0)');
  g.fillStyle = flare;
  g.fillRect(vx - reach * 0.25, vy - 1.2, reach * 0.5, 2.4);
  g.globalCompositeOperation = 'source-over';

  // ---- Vaisseau : en perspective, sa taille et son écart au point de fuite diminuent ensemble ----
  const q = clamp(s.ship);
  const depth = Math.exp(-3.1 * ease(q));
  const base = Math.min(w, h) * 0.0048;
  const weave = Math.sin(T * 1.7);
  const ox = weave * w * 0.1 * depth;
  const oy = h * 0.3 * depth;
  const sx = vx + ox;
  const sy = vy + oy;
  const flick = 0.85 + 0.15 * Math.sin(T * 40);
  const tl = Math.hypot(ox, oy) || 1;
  const nx = ox / tl;
  const ny = oy / tl;
  const trail = reach * 0.24 * depth + 8;
  g.globalCompositeOperation = 'lighter';
  const tg = g.createLinearGradient(sx, sy, sx + nx * trail, sy + ny * trail);
  tg.addColorStop(0, 'rgba(255, 200, 110, 0.6)');
  tg.addColorStop(1, 'rgba(255, 110, 30, 0)');
  g.strokeStyle = tg;
  g.lineWidth = Math.max(2, 30 * base * depth);
  g.beginPath();
  g.moveTo(sx, sy);
  g.lineTo(sx + nx * trail, sy + ny * trail);
  g.stroke();
  // Bulle d'énergie autour du vaisseau
  const sr = Math.max(6, 62 * base * (0.15 + 0.85 * depth));
  const bub = g.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr * 1.25);
  bub.addColorStop(0, 'rgba(255, 170, 80, 0)');
  bub.addColorStop(0.75, `rgba(255, 190, 110, ${0.1 + 0.05 * Math.sin(T * 6)})`);
  bub.addColorStop(1, 'rgba(255, 150, 60, 0)');
  g.fillStyle = bub;
  g.beginPath();
  g.arc(sx, sy, sr * 1.25, 0, TAU);
  g.fill();
  g.globalCompositeOperation = 'source-over';
  g.save();
  g.translate(sx, sy);
  ship(g, base * (0.15 + 0.85 * depth), -weave * 0.2, flick, T);
  g.restore();

  // ---- Compteur d'années ----
  const prog = dir > 0 ? clamp(s.ship) : clamp((s.ship - 0.45) / 0.55);
  const year = Math.round(dir > 0 ? lerp(2026, 1885, ease(prog)) : lerp(1885, 2026, ease(prog)));
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  const fs = Math.max(22, Math.min(w, h) * 0.075);
  g.font = `700 ${fs}px "Barlow Condensed", system-ui, sans-serif`;
  g.globalCompositeOperation = 'lighter';
  g.shadowColor = 'rgba(255, 106, 19, 0.9)';
  g.shadowBlur = 14;
  g.fillStyle = 'rgba(255, 226, 170, 0.92)';
  g.fillText(String(year), w / 2, h * 0.215);
  g.shadowBlur = 0;
  g.font = `700 ${Math.max(10, fs * 0.28)}px "Barlow Condensed", system-ui, sans-serif`;
  g.fillStyle = 'rgba(255, 170, 80, 0.8)';
  g.fillText(dir > 0 ? 'REMONTÉE DU TEMPS' : 'RETOUR AU PRÉSENT', w / 2, h * 0.215 + fs * 0.42);
  g.globalCompositeOperation = 'source-over';

  g.restore();
}
