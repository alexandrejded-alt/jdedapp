'use client';

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { CELEBRATE_EVENT, celebrate, type CelebrateDetail } from '@/lib/celebrate';
import { fire } from '@/lib/sound';
import { craterPoint } from '@/lib/volcano';
import { PlaneBanner } from './PlaneBanner';

type Origin = { x: number; y: number };
const EmberContext = createContext<(origin?: Origin, banner?: string) => void>(() => {});

/**
 * Célébration : quand quelque chose est validé (coupe, place, compte...),
 * le volcan entre en éruption et des feux d'artifice partent du cratère.
 * Sans position, la gerbe de braises part de là où la personne vient d'appuyer.
 */
export function EmberProvider({ children }: { children: ReactNode }) {
  const last = useRef<Origin | null>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      last.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, []);

  const burst = useCallback((origin?: Origin, banner?: string) => {
    const at = origin ?? last.current ?? { x: window.innerWidth / 2, y: window.innerHeight * 0.45 };
    celebrate(banner ? { ...at, banner } : at);
  }, []);

  return (
    <EmberContext.Provider value={burst}>
      {children}
      <FireworksLayer />
      <PlaneBanner />
    </EmberContext.Provider>
  );
}

export const useEmbers = () => useContext(EmberContext);

/* ------------------------------------------------------------------ */

type P = {
  x: number; y: number; px: number; py: number; vx: number; vy: number;
  age: number; max: number; size: number; r: number; g: number; b: number;
  grav: number; drag: number; kind: 'spark' | 'rocket';
  pop?: boolean;
};
type Job = { at: number; run: () => void };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const PALETTES: [number, number, number][][] = [
  [[244, 189, 79], [255, 242, 207]], // or et blanc chaud
  [[255, 106, 19], [255, 154, 46]], // braise
  [[255, 90, 58], [255, 154, 46]], // rouge feu
  [[255, 154, 46], [244, 189, 79]], // orange doré
  [[255, 242, 207], [255, 255, 255]], // blanc
];

/** Calque plein écran, au-dessus de tout, qui ne gêne aucun clic. S'éteint tout seul. */
function FireworksLayer() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let last = 0;
    let running = false;
    let flash = 0;
    const parts: P[] = [];
    const jobs: Job[] = [];
    const fountains: { until: number; carry: number }[] = [];
    let clock = 0;

    function resize() {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    const add = (p: Partial<P> & Pick<P, 'x' | 'y' | 'vx' | 'vy' | 'max' | 'size' | 'r' | 'g' | 'b'>) => {
      if (parts.length > 1400) return;
      parts.push({ px: p.x, py: p.y, age: 0, grav: 260, drag: 0.4, kind: 'spark', ...p } as P);
    };

    /** Petite gerbe là où on a appuyé. */
    function tapBurst(o: Origin) {
      for (let i = 0; i < 26; i++) {
        const a = rand(-Math.PI * 0.95, -Math.PI * 0.05);
        const s = rand(90, 330) * (h / 800);
        const hot = Math.random();
        add({ x: o.x, y: o.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, max: rand(0.9, 1.7), size: rand(1.6, 3.4), r: 255, g: 130 + hot * 100, b: 40 + hot * 120, grav: 380 });
      }
    }

    /** Explosion d'un feu d'artifice. */
    function explode(x: number, y: number, big = false) {
      flash = Math.min(1, flash + (big ? 0.55 : 0.3));
      fire(big);
      const pal = PALETTES[Math.floor(Math.random() * PALETTES.length)];
      const kinds = ['peony', 'willow', 'ring', 'crackle'] as const;
      const kind = big ? 'willow' : kinds[Math.floor(Math.random() * kinds.length)];
      const k = Math.min(w, 560) / 400;
      const n = kind === 'ring' ? 64 : kind === 'willow' ? (big ? 100 : 60) : 70;
      for (let i = 0; i < n; i++) {
        const a = kind === 'ring' ? (i / n) * Math.PI * 2 : rand(0, Math.PI * 2);
        const sp = (kind === 'ring' ? 190 : kind === 'willow' ? rand(90, 250) : rand(50, 270)) * k * (big ? 1.3 : 1);
        const col = pal[Math.floor(Math.random() * pal.length)];
        add({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          max: kind === 'willow' ? rand(1.0, 1.5) : rand(0.6, 1.0),
          size: rand(1.4, 2.8), r: col[0], g: col[1], b: col[2],
          grav: kind === 'willow' ? 150 : 80, drag: kind === 'willow' ? 1.3 : 1.7,
          pop: kind === 'crackle' && Math.random() < 0.35,
        });
      }
    }

    function rocket(from: Origin, toX: number, toY: number, dur: number, big = false) {
      const dx = (toX - from.x) / dur;
      const dy = (toY - from.y) / dur;
      add({ x: from.x, y: from.y, vx: dx, vy: dy, max: dur, size: 2.6, r: 255, g: 220, b: 150, grav: 0, drag: 0, kind: 'rocket', pop: big });
    }

    function schedule(o: Origin) {
      const c = craterPoint(w, h);
      const at = (s: number, run: () => void) => jobs.push({ at: clock + s, run });
      at(0, () => {
        tapBurst(o);
        fountains.push({ until: clock + 0.7, carry: 0 });
      });
      [0.15, 0.45, 0.75].forEach((s, i) =>
        at(s, () =>
          rocket(
            { x: c.x + rand(-30, 30), y: c.y },
            w * (i % 2 ? rand(0.5, 0.88) : rand(0.12, 0.5)),
            h * rand(0.12, 0.42),
            rand(0.5, 0.65),
          ),
        ),
      );
      at(1.05, () => rocket({ x: c.x, y: c.y }, w / 2, h * 0.24, 0.7, true));
    }

    function step(dt: number) {
      clock += dt;
      for (let i = jobs.length - 1; i >= 0; i--) {
        if (jobs[i].at <= clock) {
          const j = jobs.splice(i, 1)[0];
          j.run();
        }
      }
      // Fontaine de lave
      const c = craterPoint(w, h);
      for (let i = fountains.length - 1; i >= 0; i--) {
        const f = fountains[i];
        if (clock >= f.until) {
          fountains.splice(i, 1);
          continue;
        }
        f.carry += dt * 190;
        while (f.carry >= 1) {
          f.carry -= 1;
          const a = -Math.PI / 2 + rand(-0.42, 0.42);
          const s = rand(330, 860) * (h / 800);
          const hot = Math.random();
          add({
            x: c.x + rand(-10, 10), y: c.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            max: rand(1.1, 2.1), size: rand(1.6, 3.8), r: 255, g: 120 + hot * 120, b: 30 + hot * 110, grav: 560, drag: 0.15,
          });
        }
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.age += dt;
        p.px = p.x;
        p.py = p.y;
        if (p.kind === 'rocket') {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          // traînée d'étincelles
          add({ x: p.x, y: p.y, vx: rand(-20, 20), vy: rand(10, 60), max: rand(0.35, 0.7), size: rand(1, 1.8), r: 255, g: 190, b: 100, grav: 60, drag: 1 });
          if (p.age >= p.max) {
            explode(p.x, p.y, !!p.pop);
            parts.splice(i, 1);
          }
          continue;
        }
        const damp = Math.max(0, 1 - p.drag * dt);
        p.vx *= damp;
        p.vy = p.vy * damp + p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.age >= p.max) {
          if (p.pop) explode(p.x, p.y);
          parts.splice(i, 1);
        }
      }
      flash = Math.max(0, flash - dt * 2.6);
    }

    function render(dt: number) {
      if (!ctx) return;
      // Tout est calculé selon le temps écoulé : même rendu à 30 ou à 120 images par seconde.
      const fr = Math.min(dt * 60, 3);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // On estompe l'image précédente : ça laisse des traînées lumineuses.
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - Math.exp(-dt * 17)})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      if (flash > 0.01) {
        const g = ctx.createRadialGradient(w / 2, h * 0.3, 0, w / 2, h * 0.3, Math.max(w, h) * 0.8);
        g.addColorStop(0, `rgba(255, 190, 110, ${0.03 * flash * fr})`);
        g.addColorStop(1, 'rgba(255, 120, 30, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.lineCap = 'round';
      for (const p of parts) {
        const life = p.age / p.max;
        const a = p.kind === 'rocket' ? 1 : Math.max(0, 1 - life * life);
        ctx.strokeStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${a})`;
        ctx.lineWidth = p.size * (p.kind === 'rocket' ? 1 : 1 - life * 0.5);
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x + 0.01, p.y);
        ctx.stroke();
        if (p.size > 2.2 && a > 0.2) {
          ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${a * 0.05 * fr})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.6, 0, 6.2832);
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    function loop(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      step(dt);
      render(dt);
      if (parts.length === 0 && jobs.length === 0 && fountains.length === 0 && flash < 0.01) {
        ctx!.setTransform(1, 0, 0, 1, 0, 0);
        ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
        running = false;
        return;
      }
      raf = requestAnimationFrame(loop);
    }

    function onCelebrate(e: Event) {
      const d = (e as CustomEvent<CelebrateDetail>).detail;
      schedule(d);
      if (!running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener(CELEBRATE_EVENT, onCelebrate);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener(CELEBRATE_EVENT, onCelebrate);
    };
  }, []);

  return <canvas ref={ref} className="fx-canvas" aria-hidden="true" />;
}
