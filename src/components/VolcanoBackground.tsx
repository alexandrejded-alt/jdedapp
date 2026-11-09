'use client';

import { useEffect, useRef } from 'react';
import { CELEBRATE_EVENT, prefersReducedMotion } from '@/lib/celebrate';
import { BACK, MAIN, RIM, VEINS, craterPoint, volcanoFrame, type Pt } from '@/lib/volcano';

type Ember = { x: number; y: number; vx: number; vy: number; age: number; max: number; size: number; ph: number; hot: number };
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Enveloppe de l'éruption : monte vite, tient un peu, redescend doucement (environ 4 s). */
const envelope = (age: number) => (age < 0.25 ? age / 0.25 : age < 1.8 ? 1 : Math.max(0, 1 - (age - 1.8) / 2.4));

/**
 * Fond animé : un volcan sombre en bas de l'écran, un cratère qui respire,
 * de petites braises qui montent. À chaque validation, il entre en éruption
 * (lueur, coulées de lave qui s'allument, braises en pagaille).
 */
export function VolcanoBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

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
    let eruptAge = 99;
    let time = 0;
    let last = 0;
    let acc = 0;
    let raf = 0;
    let spawnAcc = 0;

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

      const back = g.createLinearGradient(0, f.y(140), 0, f.y(260));
      back.addColorStop(0, '#24130a');
      back.addColorStop(1, '#0c0705');
      g.fillStyle = back;
      poly(g, BACK, f);
      g.fill();
      g.strokeStyle = 'rgba(255, 130, 50, 0.10)';
      g.lineWidth = 1;
      g.stroke();

      const main = g.createLinearGradient(0, f.y(88), 0, f.y(260));
      main.addColorStop(0, '#42220f');
      main.addColorStop(0.5, '#1b0e07');
      main.addColorStop(1, '#0a0705');
      g.fillStyle = main;
      poly(g, MAIN, f);
      g.fill();

      // Versant droit dans l'ombre
      g.fillStyle = 'rgba(0, 0, 0, 0.28)';
      poly(g, [[214, 96], [228, 93], [256, 124], [292, 164], [336, 156], [384, 190], [470, 200], [470, 260], [250, 260]], f);
      g.fill();

      // Contour discret
      g.strokeStyle = 'rgba(255, 140, 60, 0.2)';
      g.lineWidth = 1.1;
      poly(g, MAIN.slice(4, MAIN.length - 2), f);
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
        x: f.x(207) + rand(-13, 13) * f.u,
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

    function draw(dt: number, t: number) {
      if (!ctx || !sil) return;
      const boost = envelope(eruptAge);
      const f = volcanoFrame(w, h);
      const c = craterPoint(w, h);
      const shimmer = 0.5 + 0.5 * Math.sin(t * 1.3);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, w, h);

      // Chaleur dans le ciel
      const sky = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, h * 0.95);
      sky.addColorStop(0, `rgba(255, 106, 19, ${0.15 + 0.07 * shimmer + 0.3 * boost})`);
      sky.addColorStop(0.55, `rgba(255, 90, 20, ${0.035 + 0.1 * boost})`);
      sky.addColorStop(1, 'rgba(255, 90, 20, 0)');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      ctx.drawImage(sil, 0, 0, w, h);

      // Coulées de lave
      ctx.save();
      ctx.translate(f.ox, f.oy);
      ctx.scale(f.u, f.u);
      ctx.lineCap = 'round';
      VEINS.forEach((d, i) => {
        const p = new Path2D(d);
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.9 + i * 1.7);
        // Au calme : un filet continu et discret. En éruption : la lave coule par morceaux lumineux.
        ctx.setLineDash([9 + 70 * (1 - boost), 0.01 + 7 * boost]);
        ctx.lineDashOffset = -(t * (10 + 70 * boost) + i * 4);
        ctx.lineWidth = 0.9 + 1.9 * boost;
        ctx.strokeStyle = `rgba(255, ${115 + 70 * boost}, ${35 + 40 * boost}, ${0.1 + 0.08 * pulse + 0.7 * boost})`;
        ctx.stroke(p);
      });
      ctx.setLineDash([]);
      ctx.restore();

      // Cratère
      ctx.globalCompositeOperation = 'lighter';
      const R = (68 + 60 * boost) * f.u;
      const glow = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, R);
      glow.addColorStop(0, `rgba(255, 170, 80, ${0.6 + 0.12 * shimmer + 0.3 * boost})`);
      glow.addColorStop(0.35, `rgba(255, 106, 19, ${0.28 + 0.4 * boost})`);
      glow.addColorStop(1, 'rgba(255, 106, 19, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(c.x - R, c.y - R, R * 2, R * 2);

      ctx.save();
      ctx.translate(f.ox, f.oy);
      ctx.scale(f.u, f.u);
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.5 + boost;
      ctx.strokeStyle = `rgba(255, 196, 120, ${0.5 + 0.2 * shimmer + 0.3 * boost})`;
      ctx.stroke(new Path2D(RIM));
      ctx.restore();

      // Braises
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
      const erupting = eruptAge < 4.5;
      // Calme : environ 30 images par seconde, pour ménager la batterie.
      if (!erupting && acc < 0.032) return;
      const step = acc;
      acc = 0;
      time += step;
      eruptAge += step;
      draw(step, time);
    }

    function onCelebrate() {
      eruptAge = 0;
    }

    resize();
    window.addEventListener('resize', resize);
    if (!reduce) {
      window.addEventListener(CELEBRATE_EVENT, onCelebrate);
      raf = requestAnimationFrame((t) => {
        last = t;
        loop(t);
      });
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener(CELEBRATE_EVENT, onCelebrate);
    };
  }, []);

  return <canvas ref={ref} className="volcano-bg" aria-hidden="true" />;
}
