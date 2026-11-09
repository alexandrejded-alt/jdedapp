'use client';

import { useEffect, useRef, useState } from 'react';
import { celebrate, prefersReducedMotion } from '@/lib/celebrate';
import { craterPoint } from '@/lib/volcano';

export const VOLCANO_JOURNEY_EVENT = 'jded:volcano-journey';
const DURATION = 10.8;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const x = clamp(n); return x * x * (3 - 2 * x); };

/** Heads are isolated here so profile portraits can replace the circles later. */
function fighter(g: CanvasRenderingContext2D, x: number, y: number, facing: number, pose: number, color: string, name: string, rotation = 0) {
  g.save(); g.translate(x, y); g.rotate(rotation); g.scale(facing, 1);
  g.strokeStyle = color; g.lineWidth = 5; g.lineCap = 'round';
  g.shadowColor = color; g.shadowBlur = 12;
  g.beginPath(); g.arc(0, -82, 13, 0, Math.PI * 2); g.stroke();
  const punch = Math.sin(pose) * 20;
  g.beginPath();
  g.moveTo(0, -68); g.lineTo(0, -34);
  g.moveTo(0, -34); g.lineTo(-19, 0); g.moveTo(0, -34); g.lineTo(22, -3);
  g.moveTo(0, -59); g.lineTo(18, -49); g.lineTo(35 + punch, -65);
  g.moveTo(0, -57); g.lineTo(-19, -46); g.lineTo(-9, -28);
  g.stroke(); g.shadowBlur = 0; g.scale(facing, 1);
  g.font = '700 12px sans-serif'; g.textAlign = 'center'; g.fillStyle = color; g.fillText(name, 0, -111);
  g.restore();
}

export function VolcanoJourney() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finishRef = useRef<() => void>(() => {});
  const [active, setActive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const g = canvas?.getContext('2d');
    if (!canvas || !g) return;
    let raf = 0, elapsed = 0, last = 0, running = false, w = 0, h = 0, dpr = 1;
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr; canvas.height = h * dpr;
    };
    const finish = () => {
      if (!running) return;
      running = false; cancelAnimationFrame(raf); setActive(false);
      g.clearRect(0, 0, w, h);
      celebrate({ ...craterPoint(w, h), banner: 'Bravo pour ta réservation' });
    };
    finishRef.current = finish;
    function warp(t: number, reverse: boolean) {
      const c = craterPoint(w, h);
      const progress = ease(t / 1.6);
      const cx = c.x + (w / 2 - c.x) * progress;
      const cy = c.y + (h * .46 - c.y) * progress;
      g!.fillStyle = `rgba(4, 6, 15, ${Math.sin(Math.PI * clamp(t / 1.6)) * .96})`;
      g!.fillRect(0, 0, w, h);
      g!.save(); g!.globalAlpha = Math.sin(Math.PI * clamp(t / 1.6));
      for (let i = 0; i < 170; i++) {
        const angle = i * 2.39996;
        const cycle = ((i * .071 + (reverse ? -t : t) * 1.8) % 1 + 1) % 1;
        const r = (0.025 + cycle * cycle) * Math.max(w, h);
        const length = (20 + cycle * 230) * Math.sin(Math.PI * clamp(t / 1.6));
        g!.strokeStyle = i % 4 ? '#bddfff' : '#ffb779'; g!.lineWidth = .5 + cycle * 2;
        g!.beginPath(); g!.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        g!.lineTo(cx + Math.cos(angle) * (r + length), cy + Math.sin(angle) * (r + length)); g!.stroke();
      }
      g!.restore();
    }
    function summit(t: number) {
      const scale = Math.min(w / 800, h / 650);
      g!.save(); g!.translate(w / 2, h * .53); g!.scale(scale, scale);
      const sky = g!.createLinearGradient(0, -500, 0, 500);
      sky.addColorStop(0, '#070910'); sky.addColorStop(.55, '#351414'); sky.addColorStop(1, '#f66016');
      g!.fillStyle = sky; g!.fillRect(-w / scale, -h / scale, 2 * w / scale, 2 * h / scale);
      // Close-up lava lake and its dark islands, in a stable responsive stage.
      g!.fillStyle = '#ff631b'; g!.shadowColor = '#ff420b'; g!.shadowBlur = 55;
      g!.beginPath(); g!.ellipse(0, 125, 620, 165, 0, 0, Math.PI * 2); g!.fill(); g!.shadowBlur = 0;
      for (let i = 0; i < 32; i++) {
        const x = Math.sin(i * 47.3) * 570, y = 60 + ((i * 43) % 170);
        g!.strokeStyle = i % 3 ? '#ffb83e' : '#93280d'; g!.lineWidth = 2 + i % 4;
        g!.beginPath(); g!.ellipse(x, y, 12 + i % 27, 3 + Math.sin(t * 2 + i) * 2, 0, 0, Math.PI * 2); g!.stroke();
      }
      for (const side of [-1, 1]) {
        g!.fillStyle = '#170f12'; g!.strokeStyle = '#90402a'; g!.lineWidth = 3;
        g!.beginPath(); g!.moveTo(side * 600, -35); g!.lineTo(side * 270, -12); g!.lineTo(side * 153, 16);
        g!.lineTo(side * 120, 53); g!.lineTo(side * 270, 230); g!.lineTo(side * 600, 360); g!.closePath(); g!.fill(); g!.stroke();
      }
      const jump = ease((t - 2.5) / .85);
      const leftX = -245 + jump * 195;
      const rightX = 245 - jump * 195;
      const jumpY = -Math.sin(jump * Math.PI) * 145;
      const fight = t > 3.4 && t < 5.9;
      const shake = fight ? Math.sin(t * 43) * 9 : 0;
      fighter(g!, leftX + shake, jumpY, 1, fight ? t * 23 : 0, '#8fe8ff', 'JDED');
      const fall = ease((t - 5.9) / 1);
      if (fall < 1) fighter(g!, rightX + fall * 25 - shake, jumpY + fall * 200, -1, t * 19, '#ffbc7a', 'ADVERSAIRE', fall * 4);
      if (fight) {
        const impact = Math.pow(Math.max(0, Math.sin(t * 25)), 8);
        g!.strokeStyle = `rgba(255,238,171,${impact})`; g!.lineWidth = 3;
        for (let i = 0; i < 12; i++) {
          const a = i * Math.PI / 6;
          g!.beginPath(); g!.moveTo(Math.cos(a) * 10, -60 + Math.sin(a) * 10);
          g!.lineTo(Math.cos(a) * 50, -60 + Math.sin(a) * 50); g!.stroke();
        }
      }
      if (t > 6.65) {
        const p = clamp((t - 6.65) / .95);
        const blast = g!.createRadialGradient(0, 90, 0, 0, 90, 40 + p * 850);
        blast.addColorStop(0, '#fff2b8'); blast.addColorStop(.25, '#ffbd3b'); blast.addColorStop(.65, '#f54b0e'); blast.addColorStop(1, '#f54b0e00');
        g!.fillStyle = blast; g!.fillRect(-900, -900, 1800, 1800);
        for (let i = 0; i < 60; i++) {
          const a = i * 2.39996, r = p * (170 + i * 8);
          g!.fillStyle = '#ffe39a'; g!.beginPath(); g!.arc(Math.cos(a) * r, 90 + Math.sin(a) * r - p * 160, 2 + i % 5, 0, Math.PI * 2); g!.fill();
        }
      }
      g!.restore();
    }
    function frame(now: number) {
      if (!running) return;
      // Pause the cinematic in hidden tabs rather than skipping the duel.
      if (!document.hidden) elapsed += Math.min((now - last) / 1000, .05);
      last = now;
      if (elapsed >= DURATION) { finish(); return; }
      g!.setTransform(dpr, 0, 0, dpr, 0, 0); g!.clearRect(0, 0, w, h);
      if (elapsed >= 1.2 && elapsed < 9.3) {
        g!.save(); g!.globalAlpha = ease((elapsed - 1.2) / .4) * (1 - ease((elapsed - 8.9) / .4));
        summit(elapsed); g!.restore();
      }
      if (elapsed < 1.6) warp(elapsed, false);
      if (elapsed > 9.2) warp(elapsed - 9.2, true);
      g!.fillStyle = '#fff0d9'; g!.font = '700 13px sans-serif'; g!.textAlign = 'center';
      const caption = elapsed < 1.6 ? 'DIRECTION : LE CRATÈRE' : elapsed < 3.4 ? 'JDED · LE DUEL DU CRATÈRE' : elapsed < 5.9 ? 'LA COUPE SE MÉRITE' : elapsed < 8.1 ? 'FINISH.' : 'RETOUR À LA RÉALITÉ';
      g!.fillText(caption, w / 2, Math.max(65, h * .13));
      raf = requestAnimationFrame(frame);
    }
    const start = () => {
      if (running) return;
      if (prefersReducedMotion()) return;
      resize(); running = true; elapsed = 0; last = performance.now(); setActive(true); raf = requestAnimationFrame(frame);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(); };
    window.addEventListener(VOLCANO_JOURNEY_EVENT, start); window.addEventListener('resize', resize); window.addEventListener('keydown', onKey);
    return () => { running = false; cancelAnimationFrame(raf); window.removeEventListener(VOLCANO_JOURNEY_EVENT, start); window.removeEventListener('resize', resize); window.removeEventListener('keydown', onKey); };
  }, []);

  return <div className="volcano-journey" hidden={!active}>
    <canvas ref={canvasRef} aria-hidden="true" />
    <span className="sr-only" role="status">Coupe réservée ! Duel au sommet du volcan.</span>
    <button type="button" onClick={() => finishRef.current()}>Passer la séquence <span aria-hidden="true">↗</span></button>
  </div>;
}
