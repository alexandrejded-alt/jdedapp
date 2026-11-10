'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { CELEBRATE_EVENT, NAVIGATE_EVENT, SHAKE_EVENT, prefersReducedMotion, type ShakeDetail } from '@/lib/celebrate';
import { BACK, FLOWS, MAIN, POOL, RIDGES, craterPoint, volcanoFrame, type Pt } from '@/lib/volcano';

type Ember = { x: number; y: number; vx: number; vy: number; age: number; max: number; size: number; ph: number; hot: number };
type Smoke = { x: number; y: number; vx: number; vy: number; age: number; max: number; r0: number; r1: number };
type Meteor = { x: number; y: number; vx: number; vy: number; age: number; max: number; len: number; size: number };
type Bomb = { x: number; y: number; px: number; py: number; vx: number; vy: number; age: number; max: number; size: number; hot: number };
type Drip = { x: number; y: number; px: number; py: number; vx: number; vy: number; age: number; max: number; size: number };
type Crack = { s: number; lat: number; len: number; ang: number; w: number; ph: number };
type Flow = {
  pts: Pt[];
  w: number;
  delay: number;
  D: number;
  dim: number;
  clean: boolean;
  lin: boolean;
  hold: number;
  D2: number;
  phase: number;
  seed: number;
  cycle: number;
  edgeL: number[];
  edgeR: number[];
  cracks: Crack[];
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
/** L'écran d'accueil cache les ~3,4 premières secondes : l'animation du volcan démarre juste après. */

/** Bords de montagne irréguliers : on découpe chaque arête en petits segments et on les fait vibrer (toujours pareil, jamais au hasard). */
function roughen(pts: Pt[], amp: number, seed: number, calm?: [number, number]): Pt[] {
  let sd = seed;
  const rnd = () => {
    sd = (sd * 16807) % 2147483647;
    return (sd - 1) / 2147483646;
  };
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    out.push([x0, y0]);
    if (y0 > 250 || y1 > 250 || Math.abs(x1 - x0) < 6) continue;
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 4));
    for (let k = 1; k < n; k++) {
      const q = k / n;
      const x = x0 + (x1 - x0) * q;
      const calmK = calm && x > calm[0] && x < calm[1] ? 0.25 : 1;
      const bump = (rnd() - 0.5) * 2 * amp * calmK + Math.sin(x * 0.9 + seed) * amp * 0.25 * calmK;
      out.push([x, y0 + (y1 - y0) * q + bump]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const MAIN_R = roughen(MAIN, 1.5, 4242, [182, 232]);
const BACK_R = roughen(BACK, 2.6, 777);
const FAR_R: Pt[] = (() => {
  const a: Pt[] = [[-600, 260]];
  for (let x = -600; x <= 900; x += 10) a.push([x, 166 + 9 * Math.sin(x * 0.021) + 6 * Math.sin(x * 0.057 + 1) + 3 * Math.sin(x * 0.19 + x * 0.003 * x)]);
  a.push([900, 260]);
  return a;
})();
const SPLASH = 3.4;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (v: number) => v * v * (3 - 2 * v);

/** Enveloppe de l'éruption : monte vite, tient un peu, redescend doucement (environ 4 s). */
const envelope = (age: number) => (age < 0.25 ? age / 0.25 : age < 1.8 ? 1 : Math.max(0, 1 - (age - 1.8) / 2.4));

/** Couleur de la lave selon sa chaleur : noir rouge, rouge, orange, jaune clair. */
function lava(h: number, a: number): string {
  let r: number;
  let g: number;
  let b: number;
  if (h < 0.35) {
    const k = clamp(h / 0.35);
    r = 90 + 100 * k;
    g = 20 + 30 * k;
    b = 8 + 6 * k;
  } else if (h < 0.7) {
    const k = (h - 0.35) / 0.35;
    r = 190 + 65 * k;
    g = 50 + 92 * k;
    b = 14 + 22 * k;
  } else {
    const k = clamp((h - 0.7) / 0.4);
    r = 255;
    g = 142 + 84 * k;
    b = 36 + 112 * k;
  }
  return `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${clamp(a).toFixed(3)})`;
}

/** Extrait la partie d'une ligne brisée comprise entre les fractions a et b (échantillons réguliers). */
function slice(pts: Pt[], a: number, b: number): { p: Pt; s: number }[] {
  const n = pts.length - 1;
  const out: { p: Pt; s: number }[] = [];
  const at = (f: number): Pt => {
    const x = clamp(f) * n;
    const i = Math.min(n - 1, Math.floor(x));
    const k = x - i;
    return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
  };
  out.push({ p: at(a), s: a });
  for (let i = Math.floor(a * n) + 1; i <= Math.ceil(b * n) - 1; i++) {
    const s = i / n;
    if (s > a && s < b) out.push({ p: pts[i], s });
  }
  out.push({ p: at(b), s: b });
  return out;
}

/**
 * Fond animé : un volcan sombre en bas de l'écran, avec du relief, un lac de lave au sommet,
 * de la fumée, des coulées de lave qui descendent lentement, de petites braises
 * et quelques météorites légères. À chaque validation, il entre en éruption.
 */
export function VolcanoBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  const surgeRef = useRef(0);
  const pathname = usePathname();

  // Quand on change de page, la lave accélère un instant.
  useEffect(() => {
    surgeRef.current = 1;
  }, [pathname]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduce = prefersReducedMotion();
    let w = 0;
    let h = 0;
    let dpr = 1;
    let sil: HTMLCanvasElement | null = null;
    const embers: Ember[] = [];
    const smokes: Smoke[] = [];
    const meteors: Meteor[] = [];
    let eruptAge = 99;
    let eruptScale = 1;
    const bombs: Bomb[] = [];
    const drips: Drip[] = [];
    let time = 0;
    let last = 0;
    let acc = 0;
    let raf = 0;
    let spawnAcc = 0;
    let smokeAcc = 0;
    let meteorIn = rand(1.2, 3);

    // Les coulées sont mesurées une fois (via un tracé SVG), puis suivies point par point.
    const flows: Flow[] = FLOWS.map((def, i) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', def.d);
      const total = path.getTotalLength();
      const N = clamp(Math.round(total / 1.1), 44, 170);
      const pts: Pt[] = [];
      for (let k = 0; k <= N; k++) {
        const q = path.getPointAtLength((total * k) / N);
        pts.push([q.x, q.y]);
      }
      const D = def.speed ? total / def.speed : def.D;
      const cycle = def.delay + D + def.hold + def.D2;
      // Bords irréguliers (lobes) et fissures lumineuses, tirés une fois pour toutes
      let sd = 97 + i * 31;
      const rnd = () => {
        sd = (sd * 16807) % 2147483647;
        return (sd - 1) / 2147483646;
      };
      const edgeL: number[] = [];
      const edgeR: number[] = [];
      let aL = 0;
      let aR = 0;
      for (let k = 0; k <= N; k++) {
        aL = aL * 0.55 + (rnd() - 0.5) * 0.7 * (def.clean ? 0.22 : 1);
        aR = aR * 0.55 + (rnd() - 0.5) * 0.7 * (def.clean ? 0.22 : 1);
        edgeL.push(aL);
        edgeR.push(aR);
      }
      const cracks: Crack[] = [];
      const nCracks = def.clean ? 2 : 6 + Math.round(def.w * 3);
      for (let k = 0; k < nCracks; k++) {
        cracks.push({ s: rnd(), lat: (rnd() - 0.5) * 1.5, len: 0.02 + rnd() * 0.045, ang: (rnd() - 0.5) * 1.1, w: 0.4 + rnd() * 0.5, ph: rnd() * 6.28 });
      }
      return {
        pts,
        w: def.w,
        delay: def.delay,
        D,
        dim: def.dim ?? 1,
        clean: !!def.clean,
        lin: !!def.lin,
        hold: def.hold,
        D2: def.D2,
        phase: reduce ? def.delay + D + 1 : def.start - SPLASH,
        seed: i * 2.3 + 0.7,
        cycle,
        edgeL,
        edgeR,
        cracks,
      };
    });

    const poly = (g: CanvasRenderingContext2D, pts: Pt[], f: ReturnType<typeof volcanoFrame>) => {
      g.beginPath();
      pts.forEach(([x, y], i) => (i === 0 ? g.moveTo(f.x(x), f.y(y)) : g.lineTo(f.x(x), f.y(y))));
      g.closePath();
    };

    /** La silhouette ne bouge pas : on la dessine une fois, puis on la recopie à chaque image. */
    function buildSilhouette() {
      const c = document.createElement('canvas');
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      const g = c.getContext('2d');
      if (!g) return;
      g.scale(dpr, dpr);
      const f = volcanoFrame(w, h);
      let seed = 1337;
      const rnd = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };

      // Quelques étoiles très discrètes
      for (let i = 0; i < 110; i++) {
        const x = rnd() * w;
        const y = rnd() * h * 0.5;
        g.fillStyle = `rgba(255, 224, 200, ${0.08 + rnd() * 0.22})`;
        g.beginPath();
        g.arc(x, y, 0.4 + rnd() * 0.7, 0, 6.2832);
        g.fill();
      }

      // Chaîne lointaine, très estompée
      const far = g.createLinearGradient(0, f.y(150), 0, f.y(230));
      far.addColorStop(0, 'rgba(70, 34, 16, 0.75)');
      far.addColorStop(1, 'rgba(20, 10, 6, 0.9)');
      g.fillStyle = far;
      poly(g, FAR_R, f);
      g.fill();
      g.strokeStyle = 'rgba(255, 150, 70, 0.07)';
      g.lineWidth = 1;
      g.stroke();

      const back = g.createLinearGradient(0, f.y(140), 0, f.y(260));
      back.addColorStop(0, '#2a160b');
      back.addColorStop(1, '#0c0705');
      g.fillStyle = back;
      poly(g, BACK_R, f);
      g.fill();
      g.strokeStyle = 'rgba(255, 130, 50, 0.12)';
      g.lineWidth = 1;
      g.stroke();

      // Brume entre les montagnes
      const mist = g.createLinearGradient(0, f.y(170), 0, f.y(215));
      mist.addColorStop(0, 'rgba(255, 110, 40, 0)');
      mist.addColorStop(1, 'rgba(255, 110, 40, 0.05)');
      g.fillStyle = mist;
      g.fillRect(0, f.y(170), w, f.y(215) - f.y(170));

      const main = g.createLinearGradient(0, f.y(88), 0, f.y(260));
      main.addColorStop(0, '#4a2611');
      main.addColorStop(0.45, '#1d0f08');
      main.addColorStop(1, '#0a0705');
      g.fillStyle = main;
      poly(g, MAIN_R, f);
      g.fill();

      // Tout le relief est limité à la forme du volcan
      g.save();
      poly(g, MAIN_R, f);
      g.clip();
      g.save();
      g.translate(f.ox, f.oy);
      g.scale(f.u, f.u);

      // Versant droit dans l'ombre, versant gauche accroché par la lueur
      g.fillStyle = 'rgba(0, 0, 0, 0.30)';
      g.beginPath();
      [[214, 96], [228, 93], [256, 124], [292, 164], [336, 156], [384, 190], [470, 200], [470, 260], [250, 260]].forEach(([x, y], i) =>
        i === 0 ? g.moveTo(x, y) : g.lineTo(x, y),
      );
      g.closePath();
      g.fill();
      const lit = g.createLinearGradient(110, 120, 205, 120);
      lit.addColorStop(0, 'rgba(255, 140, 60, 0)');
      lit.addColorStop(1, 'rgba(255, 140, 60, 0.07)');
      g.fillStyle = lit;
      g.beginPath();
      [[186, 100], [200, 92], [207, 100], [200, 190], [120, 215], [96, 200], [146, 146]].forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
      g.closePath();
      g.fill();

      // Ravines et arêtes
      g.lineCap = 'round';
      for (const r of RIDGES) {
        const p = new Path2D(r.d);
        g.lineWidth = r.dark ? 2.6 : 1.4;
        g.strokeStyle = r.dark ? 'rgba(0, 0, 0, 0.32)' : 'rgba(255, 150, 70, 0.07)';
        g.stroke(p);
        if (r.dark) {
          g.lineWidth = 0.7;
          g.strokeStyle = 'rgba(255, 140, 60, 0.07)';
          g.translate(-1.4, 0);
          g.stroke(p);
          g.translate(1.4, 0);
        }
      }

      // Roches : de petits éclats, plus nombreux vers le bas
      for (let i = 0; i < 380; i++) {
        const y = 98 + Math.pow(rnd(), 0.75) * 150;
        const x = 207 + (rnd() - 0.5) * (30 + (y - 90) * 1.7);
        const a = 0.04 + rnd() * 0.12;
        g.fillStyle = rnd() > 0.45 ? `rgba(0, 0, 0, ${a * 1.8})` : `rgba(255, 150, 70, ${a * 0.55})`;
        g.fillRect(x, y, 0.6 + rnd() * 1.6, 0.4 + rnd() * 0.9);
      }

      // Grandes facettes : des pans de roche plus clairs ou plus sombres qui partent du cratère
      for (let i = 0; i < 9; i++) {
        const a0 = 100 + i * 24 + rnd() * 10;
        const a1 = a0 + 14 + rnd() * 18;
        const lit = 207 - a0 > 20 && rnd() > 0.35;
        g.fillStyle = lit ? `rgba(255, 140, 60, ${0.025 + rnd() * 0.03})` : `rgba(0, 0, 0, ${0.07 + rnd() * 0.08})`;
        g.beginPath();
        g.moveTo(205 + (rnd() - 0.5) * 6, 96);
        g.lineTo(a0 + (rnd() - 0.5) * 20, 240);
        g.lineTo(a1 + (rnd() - 0.5) * 20, 240);
        g.closePath();
        g.fill();
      }
      // Dizaines de ravines fines qui griffent la pente
      for (let i = 0; i < 34; i++) {
        const sx = 207 + (rnd() - 0.5) * 26;
        const sy = 95 + rnd() * 16;
        const ex = 207 + (rnd() - 0.5) * 250;
        const ey = 200 + rnd() * 40;
        const mx = sx + (ex - sx) * (0.3 + rnd() * 0.2) + (rnd() - 0.5) * 18;
        const my = sy + (ey - sy) * 0.5;
        const dark = rnd() > 0.4;
        g.lineWidth = 0.5 + rnd() * 1.2;
        g.strokeStyle = dark ? `rgba(0, 0, 0, ${0.18 + rnd() * 0.2})` : `rgba(255, 150, 70, ${0.05 + rnd() * 0.07})`;
        g.beginPath();
        g.moveTo(sx, sy);
        g.quadraticCurveTo(mx, my, ex, ey);
        g.stroke();
      }
      // Strates horizontales : les couches de coulées refroidies
      for (let i = 0; i < 16; i++) {
        const y = 108 + i * 9 + rnd() * 4;
        const half = 10 + (y - 94) * 0.95;
        g.strokeStyle = `rgba(0, 0, 0, ${0.07 + rnd() * 0.07})`;
        g.lineWidth = 0.5 + rnd() * 0.7;
        g.beginPath();
        g.moveTo(207 - half, y + rnd() * 3);
        g.bezierCurveTo(207 - half * 0.4, y + 2 + rnd() * 3, 207 + half * 0.4, y - 1 + rnd() * 3, 207 + half, y + rnd() * 3);
        g.stroke();
      }
      // Gros blocs sur les pentes basses
      for (let i = 0; i < 40; i++) {
        const y = 150 + rnd() * 90;
        const x = 207 + (rnd() - 0.5) * (50 + (y - 90) * 1.9);
        const sz = 1 + rnd() * 3.2;
        g.fillStyle = `rgba(0, 0, 0, ${0.22 + rnd() * 0.2})`;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + sz, y + sz * 0.2);
        g.lineTo(x + sz * 0.6, y + sz * 0.9);
        g.lineTo(x - sz * 0.3, y + sz * 0.7);
        g.closePath();
        g.fill();
        g.fillStyle = `rgba(255, 150, 70, ${0.06 + rnd() * 0.08})`;
        g.fillRect(x - sz * 0.3, y, sz * 0.5, 0.35);
      }
      g.restore();
      g.restore();

      // Gorge du sommet (sombre), le lac de lave vient par-dessus
      g.save();
      g.translate(f.ox, f.oy);
      g.scale(f.u, f.u);
      g.fillStyle = '#120905';
      g.beginPath();
      g.ellipse(POOL.cx, POOL.cy, POOL.rx + 2.4, POOL.ry + 1.2, 0, 0, 6.2832);
      g.fill();
      g.restore();

      // Contour discret
      // Arête éclairée par la lueur : très fine, plus vive près du cratère
      const top = MAIN_R.filter(([, y]) => y < 250);
      const rim = g.createLinearGradient(f.x(60), 0, f.x(360), 0);
      rim.addColorStop(0, 'rgba(255, 150, 70, 0)');
      rim.addColorStop(0.42, 'rgba(255, 160, 80, 0.30)');
      rim.addColorStop(0.55, 'rgba(255, 160, 80, 0.30)');
      rim.addColorStop(1, 'rgba(255, 150, 70, 0)');
      g.strokeStyle = rim;
      g.lineWidth = 1.1;
      g.beginPath();
      top.forEach(([x, y], i) => (i === 0 ? g.moveTo(f.x(x), f.y(y)) : g.lineTo(f.x(x), f.y(y))));
      g.stroke();
      sil = c;
    }

    function resize() {
      if (!canvas || !ctx) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      buildSilhouette();
      if (reduce) draw(0, 0);
    }

    function spawn(boost: number) {
      if (embers.length > 150) return;
      const f = volcanoFrame(w, h);
      const k = f.u / 1.9;
      embers.push({
        x: f.x(207) + rand(-9, 9) * f.u,
        y: f.y(91) + rand(-2, 4) * f.u,
        vx: rand(-18, 18) * k * (1 + boost),
        vy: -rand(26, 70) * k * (1 + boost * 1.6),
        age: 0,
        max: rand(3.2, 7) * (1 - boost * 0.25),
        size: rand(0.8, 2.3) * (1 + boost * 0.5),
        ph: rand(0, 6.28),
        hot: Math.random(),
      });
    }

    function spawnSmoke(boost: number) {
      if (smokes.length > 26) return;
      const f = volcanoFrame(w, h);
      smokes.push({
        x: f.x(207) + rand(-5, 5) * f.u,
        y: f.y(89),
        vx: rand(5, 14) * (f.u / 1.9),
        vy: -rand(14, 24) * (f.u / 1.9) * (1 + boost * 1.2),
        age: 0,
        max: rand(9, 15),
        r0: rand(5, 8) * f.u,
        r1: rand(24, 40) * f.u * (1 + boost * 0.4),
      });
    }

    function spawnMeteor() {
      if (meteors.length > 2) return;
      const dir = Math.random() < 0.5 ? -1 : 1;
      const ang = rand(0.42, 0.72); // angle sous l'horizontale
      const sp = rand(380, 640) * Math.max(0.7, Math.min(w, 900) / 900);
      const max = rand(0.9, 1.5);
      meteors.push({
        x: rand(w * 0.1, w * 1.0) + (dir < 0 ? w * 0.1 : -w * 0.1),
        y: rand(-10, h * 0.28),
        vx: Math.cos(ang) * sp * dir,
        vy: Math.sin(ang) * sp,
        age: 0,
        max,
        len: rand(70, 150),
        size: rand(1, 1.9),
      });
    }

    let dripAcc = 0;
    function drawFlows(dt: number, t: number, boost: number, surge: number) {
      if (!ctx) return;
      const f = volcanoFrame(w, h);
      const speed = 1 + 2.4 * boost + 2.6 * surge;
      ctx.save();
      ctx.translate(f.ox, f.oy);
      ctx.scale(f.u, f.u);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const fl of flows) {
        fl.phase += dt * speed;
        if (fl.phase >= fl.cycle) fl.phase -= fl.cycle;
        const x = (fl.phase - fl.delay) / fl.D;
        const head = x <= 0 ? 0 : x >= 1 ? 1 : fl.lin ? x : 1 - Math.pow(1 - x, 1.7);
        const yy = (fl.phase - fl.delay - fl.D - fl.hold) / fl.D2;
        const tail = yy <= 0 ? 0 : yy >= 1 ? 1 : smooth(yy);
        if (head < 0.01 || tail >= 0.995) continue;

        const seg = slice(fl.pts, tail, head);
        if (seg.length < 3) continue;
        const N = fl.pts.length - 1;
        const wid = fl.w * 1.45 * (1 + 0.3 * boost);
        const dim = fl.dim;
        const clean = fl.clean;
        const heatAt = (s: number) => {
          const wave = 0.5 + 0.5 * Math.sin(s * 17 - t * 0.9 + fl.seed);
          const wave2 = 0.5 + 0.5 * Math.sin(s * 41 - t * 1.6 + fl.seed * 2);
          const front = head < 1 ? clamp(1 - (head - s) / 0.1) : 0;
          const cool = tail > 0 ? smooth(clamp((s - tail) / 0.2)) : 1;
          return {
            heat: clamp(0.2 + 0.5 * (1 - 0.6 * s) + 0.2 * wave + 0.08 * wave2 + 0.3 * front + 0.22 * boost + 0.14 * surge, 0, 1.15) * (0.35 + 0.65 * cool),
            cool,
          };
        };

        // Ruban de la coulée : large vers le bas, bords en lobes, bout arrondi
        const L: Pt[] = [];
        const R: Pt[] = [];
        for (let i = 0; i < seg.length; i++) {
          const a = seg[Math.max(0, i - 1)].p;
          const b = seg[Math.min(seg.length - 1, i + 1)].p;
          let tx = b[0] - a[0];
          let ty = b[1] - a[1];
          const tl = Math.hypot(tx, ty) || 1;
          tx /= tl;
          ty /= tl;
          const s = seg[i].s;
          const k = Math.min(N, Math.round(s * N));
          let hw = 0.5 * wid * (0.6 + 0.9 * Math.sqrt(s));
          const tipK = head < 1 ? clamp((head - s) / 0.08) : 1;
          hw *= 0.25 + 0.75 * Math.sqrt(tipK);
          const tailK = tail > 0 ? clamp((s - tail) / 0.1) : 1;
          hw *= 0.5 + 0.5 * tailK;
          L.push([seg[i].p[0] - ty * hw * (1 + fl.edgeL[k]), seg[i].p[1] + tx * hw * (1 + fl.edgeL[k])]);
          R.push([seg[i].p[0] + ty * hw * (1 + fl.edgeR[k]), seg[i].p[1] - tx * hw * (1 + fl.edgeR[k])]);
        }
        const outline = () => {
          ctx.beginPath();
          L.forEach((q, i) => (i === 0 ? ctx.moveTo(q[0], q[1]) : ctx.lineTo(q[0], q[1])));
          for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
          ctx.closePath();
        };

        // Lueur autour
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        seg.forEach(({ p }, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
        ctx.lineWidth = wid * 3.4;
        ctx.strokeStyle = `rgba(255, 90, 20, ${(0.04 + 0.05 * boost + 0.03 * surge) * dim})`;
        ctx.stroke();

        // Croûte sombre
        ctx.globalCompositeOperation = 'source-over';
        outline();
        ctx.fillStyle = 'rgba(14, 6, 3, 0.88)';
        ctx.fill();

        // Bords incandescents (la lave qui déborde sous la croûte)
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 0.55;
        ctx.strokeStyle = `rgba(255, 110, 28, ${(0.32 + 0.25 * boost) * dim * (clean ? 0.25 : 1)})`;
        ctx.beginPath();
        L.forEach((q, i) => (i === 0 ? ctx.moveTo(q[0], q[1]) : ctx.lineTo(q[0], q[1])));
        ctx.moveTo(R[0][0], R[0][1]);
        R.forEach((q) => ctx.lineTo(q[0], q[1]));
        ctx.stroke();

        // Fissures lumineuses dans la croûte
        for (const c of fl.cracks) {
          if (c.s < tail + 0.03 || c.s > head - 0.03) continue;
          const i = Math.min(seg.length - 2, Math.max(0, seg.findIndex((q) => q.s >= c.s) - 1));
          const a = seg[i];
          const b = seg[i + 1];
          let tx = b.p[0] - a.p[0];
          let ty = b.p[1] - a.p[1];
          const tl = Math.hypot(tx, ty) || 1;
          tx /= tl;
          ty /= tl;
          const hw = 0.5 * wid * (0.6 + 0.9 * Math.sqrt(c.s));
          const cx = (a.p[0] + b.p[0]) / 2 - ty * hw * c.lat;
          const cy = (a.p[1] + b.p[1]) / 2 + tx * hw * c.lat;
          const ca = Math.cos(c.ang);
          const sa = Math.sin(c.ang);
          const dx = (tx * ca - ty * sa) * c.len * 60;
          const dy = (tx * sa + ty * ca) * c.len * 60;
          const flick = 0.55 + 0.45 * Math.sin(t * 1.3 + c.ph);
          const { heat, cool } = heatAt(c.s);
          ctx.beginPath();
          ctx.moveTo(cx - dx, cy - dy);
          ctx.lineTo(cx + dx, cy + dy);
          ctx.lineWidth = c.w;
          ctx.strokeStyle = lava(Math.max(0.5, heat), (0.25 + 0.5 * flick) * cool * dim);
          ctx.stroke();
        }

        // Chenal central, très chaud, plus étroit que la coulée
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        seg.forEach(({ p }, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
        ctx.lineWidth = wid * (clean ? 0.62 : 0.36);
        ctx.strokeStyle = `rgba(${205 + 25 * boost | 0}, ${58 + 30 * boost | 0}, 12, ${(tail > 0 ? 0.5 : 0.85) * (0.55 + 0.45 * dim)})`;
        ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < seg.length - 1; i++) {
          const a = seg[i];
          const b = seg[i + 1];
          const s = (a.s + b.s) / 2;
          const { heat, cool } = heatAt(s);
          ctx.beginPath();
          ctx.moveTo(a.p[0], a.p[1]);
          ctx.lineTo(b.p[0], b.p[1]);
          ctx.lineWidth = wid * (clean ? 0.5 - 0.1 * s : 0.3 - 0.12 * s) * (0.85 + 0.3 * Math.sin(s * 17 - t * 0.9 + fl.seed));
          ctx.strokeStyle = lava(Math.max(0.5, heat), 0.34 * (0.3 + 0.7 * heat) * (0.2 + 0.8 * cool) * dim);
          ctx.stroke();
        }

        // Traînée de lave incandescente derrière le front + gouttes qui tombent
        if (head < 1) {
          const tailLen = fl.lin ? 0.13 : 0.07;
          for (let i = 0; i < seg.length - 1; i++) {
            const a = seg[i];
            const b = seg[i + 1];
            const q = 1 - (head - (a.s + b.s) / 2) / tailLen;
            if (q <= 0) continue;
            ctx.beginPath();
            ctx.moveTo(a.p[0], a.p[1]);
            ctx.lineTo(b.p[0], b.p[1]);
            ctx.lineWidth = wid * (0.35 + 0.6 * q);
            ctx.strokeStyle = `rgba(255, ${170 + 70 * q | 0}, ${70 + 110 * q | 0}, ${0.55 * q * q * dim})`;
            ctx.stroke();
          }
          const tipP = seg[seg.length - 1].p;
          dripAcc += dt * (fl.lin ? 70 : 26);
          while (dripAcc >= 1 && drips.length < 160) {
            dripAcc -= 1;
            drips.push({ x: tipP[0] + rand(-0.5, 0.5), y: tipP[1], px: tipP[0], py: tipP[1], vx: rand(-5, 5), vy: rand(-6, 6), age: 0, max: rand(0.35, 0.95), size: rand(0.28, 0.7) });
          }
          dripAcc = Math.min(dripAcc, 1);
        }

        // Le front qui avance
        if (head < 1) {
          const tip = seg[seg.length - 1].p;
          const R2 = wid * 1.7;
          const g = ctx.createRadialGradient(tip[0], tip[1], 0, tip[0], tip[1], R2);
          g.addColorStop(0, `rgba(255, 200, 110, ${0.55 * dim})`);
          g.addColorStop(1, 'rgba(255, 90, 20, 0)');
          ctx.fillStyle = g;
          ctx.fillRect(tip[0] - R2, tip[1] - R2, R2 * 2, R2 * 2);
        }
      }
      // Gouttes de lave : elles s'échappent du front et retombent
      ctx.globalCompositeOperation = 'lighter';
      for (let i = drips.length - 1; i >= 0; i--) {
        const d = drips[i];
        d.age += dt;
        if (d.age >= d.max) {
          drips.splice(i, 1);
          continue;
        }
        d.px = d.x;
        d.py = d.y;
        d.vy += 46 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        const life = d.age / d.max;
        const a = 1 - life;
        ctx.strokeStyle = `rgba(255, ${150 + 90 * a | 0}, ${50 + 90 * a | 0}, ${0.85 * a})`;
        ctx.lineWidth = d.size * (1 - 0.5 * life);
        ctx.beginPath();
        ctx.moveTo(d.px, d.py);
        ctx.lineTo(d.x + 0.01, d.y);
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
    }

    function draw(dt: number, t: number) {
      if (!ctx || !sil) return;
      const boost = envelope(eruptAge) * eruptScale;
      const surge = surgeRef.current;
      const f = volcanoFrame(w, h);
      const c = craterPoint(w, h);
      const shimmer = 0.5 + 0.5 * Math.sin(t * 1.3);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, w, h);

      // Chaleur dans le ciel : une nappe large et plate sur l'horizon, un faisceau vertical et des rayons de lumière
      ctx.globalCompositeOperation = 'lighter';
      {
        const rx = Math.max(w * 0.95, 280);
        ctx.save();
        ctx.translate(c.x, f.y(100));
        ctx.scale(1, 0.4);
        const hz = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        hz.addColorStop(0, `rgba(255, 106, 19, ${0.2 + 0.06 * shimmer + 0.3 * boost})`);
        hz.addColorStop(0.5, `rgba(255, 90, 20, ${0.07 + 0.1 * boost})`);
        hz.addColorStop(1, 'rgba(255, 90, 20, 0)');
        ctx.fillStyle = hz;
        ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
        ctx.restore();

        // Rayons de lumière qui montent du cratère et se balancent lentement
        const BEAMS = 7;
        for (let i = 0; i < BEAMS; i++) {
          const ang = (i - (BEAMS - 1) / 2) * 0.21 + 0.05 * Math.sin(t * 0.25 + i * 1.3);
          const len = h * (0.5 + 0.2 * Math.sin(t * 0.4 + i * 2) + 0.35 * boost) * (i === 3 ? 1.15 : 1);
          const half = (i === 3 ? 0.07 : 0.03 + 0.012 * (i % 3));
          const a = 0.06 + 0.035 * Math.sin(t * 0.7 + i) + 0.1 * boost + (i === 3 ? 0.03 : 0);
          const x1 = c.x + Math.sin(ang - half) * len;
          const y1 = c.y - Math.cos(ang - half) * len;
          const x2 = c.x + Math.sin(ang + half) * len;
          const y2 = c.y - Math.cos(ang + half) * len;
          const g = ctx.createLinearGradient(c.x, c.y, c.x + Math.sin(ang) * len, c.y - Math.cos(ang) * len);
          g.addColorStop(0, `rgba(255, 150, 60, ${a})`);
          g.addColorStop(1, 'rgba(255, 110, 30, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';

      // Météorites : elles passent dans le ciel, derrière la montagne
      meteorIn -= dt;
      if (meteorIn <= 0 && !reduce) {
        spawnMeteor();
        meteorIn = rand(4, 9) * (1 - 0.6 * boost);
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.age += dt;
        if (m.age >= m.max) {
          meteors.splice(i, 1);
          continue;
        }
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        const life = m.age / m.max;
        const a = Math.pow(Math.sin(Math.PI * life), 0.7) * 0.7;
        const sp = Math.hypot(m.vx, m.vy);
        const ux = m.vx / sp;
        const uy = m.vy / sp;
        const g = ctx.createLinearGradient(m.x, m.y, m.x - ux * m.len, m.y - uy * m.len);
        g.addColorStop(0, `rgba(255, 236, 205, ${a})`);
        g.addColorStop(0.35, `rgba(255, 160, 80, ${a * 0.45})`);
        g.addColorStop(1, 'rgba(255, 100, 30, 0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = m.size;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - ux * m.len, m.y - uy * m.len);
        ctx.stroke();
        ctx.fillStyle = `rgba(255, 225, 190, ${a * 0.35})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size * 2.6, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      ctx.drawImage(sil, 0, 0, w, h);

      // Brume chaude qui dérive entre les montagnes
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const bw = (170 + i * 26) * f.u;
        const x = ((t * (3.2 + i * 1.1) * f.u * 0.5 + (i * (w + 2 * bw)) / 5) % (w + 2 * bw)) - bw;
        const y = f.y(204 + (i % 3) * 9);
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, 0.1);
        const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, bw);
        fg.addColorStop(0, `rgba(255, 120, 50, ${0.045 + 0.02 * Math.sin(t * 0.3 + i) + 0.03 * boost})`);
        fg.addColorStop(1, 'rgba(255, 110, 40, 0)');
        ctx.fillStyle = fg;
        ctx.fillRect(-bw, -bw, bw * 2, bw * 2);
        ctx.restore();
      }
      ctx.globalCompositeOperation = 'source-over';

      // La lueur éclaire les pentes près du sommet (limitée à la forme du volcan)
      ctx.save();
      ctx.beginPath();
      MAIN_R.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(f.x(px), f.y(py)) : ctx.lineTo(f.x(px), f.y(py))));
      ctx.closePath();
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(c.x, f.y(104));
      ctx.scale(1, 0.85);
      const lit = ctx.createRadialGradient(0, 0, 0, 0, 0, 105 * f.u);
      lit.addColorStop(0, `rgba(255, 120, 40, ${0.3 + 0.05 * shimmer + 0.25 * boost})`);
      lit.addColorStop(0.5, `rgba(255, 90, 20, ${0.1 + 0.12 * boost})`);
      lit.addColorStop(1, 'rgba(255, 90, 20, 0)');
      ctx.fillStyle = lit;
      ctx.fillRect(-105 * f.u, -105 * f.u, 210 * f.u, 210 * f.u);
      ctx.restore();

      // Coulées de lave (certaines dessinent JDED en descendant)
      drawFlows(dt, t, boost, surge);

      // Lac de lave au sommet + lueur du cratère
      ctx.globalCompositeOperation = 'lighter';
      ctx.save();
      ctx.translate(f.ox, f.oy);
      ctx.scale(f.u, f.u);
      const pool = ctx.createRadialGradient(POOL.cx, POOL.cy, 0, POOL.cx, POOL.cy, POOL.rx);
      pool.addColorStop(0, `rgba(255, 215, 140, ${0.8 + 0.15 * shimmer})`);
      pool.addColorStop(0.6, `rgba(255, 120, 30, ${0.6 + 0.2 * boost})`);
      pool.addColorStop(1, 'rgba(255, 90, 20, 0)');
      ctx.fillStyle = pool;
      ctx.beginPath();
      ctx.ellipse(POOL.cx, POOL.cy, POOL.rx, POOL.ry * (1 + 0.15 * shimmer), 0, 0, 6.2832);
      ctx.fill();
      ctx.restore();

      const R = (34 + 46 * boost) * f.u;
      const glow = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, R);
      glow.addColorStop(0, `rgba(255, 175, 90, ${0.6 + 0.12 * shimmer + 0.3 * boost})`);
      glow.addColorStop(0.4, `rgba(255, 106, 19, ${0.24 + 0.4 * boost})`);
      glow.addColorStop(1, 'rgba(255, 106, 19, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(c.x - R, c.y - R, R * 2, R * 2);
      ctx.globalCompositeOperation = 'source-over';

      // Fumée : de gros nuages sombres, à peine visibles, qui montent et s'étirent
      smokeAcc += dt * (0.9 + 5 * boost);
      while (smokeAcc >= 1) {
        smokeAcc -= 1;
        spawnSmoke(boost);
      }
      for (let i = smokes.length - 1; i >= 0; i--) {
        const s = smokes[i];
        s.age += dt;
        if (s.age >= s.max) {
          smokes.splice(i, 1);
          continue;
        }
        s.x += (s.vx + Math.sin(t * 0.5 + i) * 4) * dt;
        s.y += s.vy * dt;
        const life = s.age / s.max;
        const r = s.r0 + (s.r1 - s.r0) * Math.sqrt(life);
        const a = Math.pow(Math.sin(Math.PI * life), 1.3) * (0.15 + 0.12 * boost);
        const warm = Math.max(0, 1 - life * 2.2);
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
        g.addColorStop(0, `rgba(${46 + 90 * warm | 0}, ${28 + 32 * warm | 0}, ${22 + 8 * warm | 0}, ${a})`);
        g.addColorStop(1, 'rgba(24, 16, 14, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
      }

      // Braises
      ctx.globalCompositeOperation = 'lighter';
      spawnAcc += dt * (5 + 55 * boost);
      while (spawnAcc >= 1) {
        spawnAcc -= 1;
        spawn(boost);
      }
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.age += dt;
        if (e.age >= e.max) {
          embers.splice(i, 1);
          continue;
        }
        e.x += (e.vx + Math.sin(t * 1.4 + e.ph) * 16) * dt;
        e.y += e.vy * dt;
        e.vy *= 1 - 0.06 * dt;
        const life = e.age / e.max;
        const a = Math.pow(Math.sin(Math.PI * life), 0.8) * (0.72 + 0.28 * Math.sin(t * 8 + e.ph));
        ctx.fillStyle = `rgba(255, ${150 + e.hot * 80}, ${50 + e.hot * 110}, ${0.22 * a})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * 3, 0, 6.2832);
        ctx.fill();
        ctx.fillStyle = `rgba(255, ${190 + e.hot * 50}, ${90 + e.hot * 110}, ${0.95 * a})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, 6.2832);
        ctx.fill();
      }
      // Bombes de lave projetées par une secousse
      for (let i = bombs.length - 1; i >= 0; i--) {
        const b = bombs[i];
        b.age += dt;
        if (b.age >= b.max) {
          bombs.splice(i, 1);
          continue;
        }
        b.px = b.x;
        b.py = b.y;
        b.vy += 520 * f.u / 1.9 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        const life = b.age / b.max;
        const a = 1 - life * life;
        ctx.lineCap = 'round';
        ctx.strokeStyle = `rgba(255, ${140 + b.hot * 90 | 0}, ${40 + b.hot * 100 | 0}, ${0.75 * a})`;
        ctx.lineWidth = b.size * (1 - 0.4 * life);
        ctx.beginPath();
        ctx.moveTo(b.px, b.py);
        ctx.lineTo(b.x + 0.01, b.y);
        ctx.stroke();
        ctx.fillStyle = `rgba(255, 200, 120, ${0.2 * a})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size * 2.2, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    function loop(now: number) {
      raf = requestAnimationFrame(loop);
      if (document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      acc += dt;
      const erupting = eruptAge < 4.5 || bombs.length > 0;
      // Calme : environ 30 images par seconde, pour ménager la batterie.
      if (!erupting && acc < 0.032) return;
      const step = acc;
      acc = 0;
      time += step;
      eruptAge += step;
      surgeRef.current = Math.max(0, surgeRef.current - step / 3.2);
      draw(step, time);
    }

    function onShake(e: Event) {
      const power = Math.min(1, Math.max(0.05, (e as CustomEvent<ShakeDetail>).detail?.power ?? 0.3));
      const cur = envelope(eruptAge) * eruptScale;
      const next = 0.18 + 0.82 * power;
      if (next >= cur) {
        eruptScale = next;
        eruptAge = 0;
      }
      const f = volcanoFrame(w, h);
      const k = f.u / 1.9;
      const n = Math.round(5 + 34 * power);
      for (let i = 0; i < n && bombs.length < 90; i++) {
        const a = -Math.PI / 2 + rand(-0.5, 0.5);
        const sp = rand(120, 230 + 330 * power) * k;
        bombs.push({
          x: f.x(207) + rand(-8, 8) * f.u,
          y: f.y(92),
          px: 0,
          py: 0,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          age: 0,
          max: rand(0.9, 1.5) + power * 0.6,
          size: rand(1.2, 2.6) * (0.8 + power * 0.6),
          hot: Math.random(),
        });
      }
      surgeRef.current = Math.min(1, surgeRef.current + 0.3 * power);
    }
    function onCelebrate() {
      eruptScale = 1;
      eruptAge = 0;
    }
    function onNavigate() {
      surgeRef.current = 1;
      if (meteors.length < 2 && Math.random() < 0.6) spawnMeteor();
    }

    resize();
    window.addEventListener('resize', resize);
    if (!reduce) {
      window.addEventListener(CELEBRATE_EVENT, onCelebrate);
      window.addEventListener(NAVIGATE_EVENT, onNavigate);
      window.addEventListener(SHAKE_EVENT, onShake);
      raf = requestAnimationFrame((t) => {
        last = t;
        loop(t);
      });
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener(CELEBRATE_EVENT, onCelebrate);
      window.removeEventListener(NAVIGATE_EVENT, onNavigate);
      window.removeEventListener(SHAKE_EVENT, onShake);
    };
  }, []);

  return <canvas ref={ref} className="volcano-bg" aria-hidden="true" />;
}
