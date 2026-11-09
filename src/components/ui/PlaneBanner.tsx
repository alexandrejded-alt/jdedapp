'use client';

import { useEffect, useRef } from 'react';
import { CELEBRATE_EVENT, type CelebrateDetail } from '@/lib/celebrate';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Un petit avion à hélice traverse l'écran de droite à gauche en tirant une banderole
 * (comme sur une plage). Il ne part que si la célébration porte un message (réservation d'un client).
 * Les prénoms/textes sont dessinés tels quels dans le canvas : rien n'est interprété comme du HTML.
 */
export function PlaneBanner() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let raf = 0;
    let running = false;

    function drawPlane(g: CanvasRenderingContext2D, cx: number, cy: number, L: number, t: number, rot: number) {
      g.save();
      g.translate(cx, cy);
      g.rotate(rot);
      g.scale(L / 100, L / 100);
      g.lineJoin = 'round';
      g.lineCap = 'round';

      // Train d'atterrissage
      g.strokeStyle = '#3a2a22';
      g.lineWidth = 1.8;
      g.beginPath();
      g.moveTo(-20, 9);
      g.lineTo(-24, 18);
      g.moveTo(6, 9);
      g.lineTo(4, 18);
      g.stroke();
      g.fillStyle = '#1d1511';
      g.beginPath();
      g.arc(-24, 19, 3.2, 0, 6.2832);
      g.arc(4, 19, 3.2, 0, 6.2832);
      g.fill();

      // Aile (côté caméra)
      g.fillStyle = '#d4500f';
      g.beginPath();
      g.moveTo(-14, 1);
      g.lineTo(14, 1);
      g.lineTo(9, 15);
      g.lineTo(-6, 15);
      g.closePath();
      g.fill();

      // Dérive et stabilisateur
      g.fillStyle = '#ff6a13';
      g.beginPath();
      g.moveTo(34, -5);
      g.lineTo(48, -24);
      g.lineTo(54, -24);
      g.lineTo(50, -3);
      g.closePath();
      g.fill();
      g.fillStyle = '#d4500f';
      g.beginPath();
      g.moveTo(36, 0);
      g.lineTo(53, -1);
      g.lineTo(52, 5);
      g.lineTo(36, 4);
      g.closePath();
      g.fill();

      // Fuselage
      const body = g.createLinearGradient(0, -12, 0, 10);
      body.addColorStop(0, '#fff7e8');
      body.addColorStop(1, '#efc79a');
      g.fillStyle = body;
      g.beginPath();
      g.moveTo(-51, 0);
      g.bezierCurveTo(-51, -9, -38, -12, -22, -12);
      g.lineTo(26, -8);
      g.lineTo(50, -3);
      g.lineTo(50, 2);
      g.lineTo(26, 6);
      g.lineTo(-22, 10);
      g.bezierCurveTo(-38, 10, -51, 8, -51, 0);
      g.closePath();
      g.fill();
      // Bande orange
      g.strokeStyle = '#ff6a13';
      g.lineWidth = 2.6;
      g.beginPath();
      g.moveTo(-47, 1.5);
      g.lineTo(46, -1);
      g.stroke();
      // Verrière
      g.fillStyle = '#26384a';
      g.beginPath();
      g.ellipse(-13, -7.5, 9, 4.2, -0.06, 0, 6.2832);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.beginPath();
      g.ellipse(-16, -9, 4, 1.2, -0.06, 0, 6.2832);
      g.fill();

      // Hélice qui tourne (floue)
      const flick = 0.28 + 0.14 * Math.sin(t * 70);
      g.fillStyle = `rgba(255, 240, 215, ${flick})`;
      g.beginPath();
      g.ellipse(-53, 0, 1.8, 15 + 2 * Math.sin(t * 50), 0, 0, 6.2832);
      g.fill();
      g.fillStyle = '#ffd27a';
      g.beginPath();
      g.arc(-52, 0, 2.6, 0, 6.2832);
      g.fill();
      g.restore();
    }

    function start(text: string) {
      if (!canvas || !ctx) return;
      running = true;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      // La banderole est dessinée une fois, puis tranchée en fines bandes pour la faire onduler.
      const fs = clamp(Math.round(w * 0.058), 19, 30);
      const font = `700 ${fs}px "Barlow Condensed", "Arial Narrow", Impact, sans-serif`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = font;
      const pad = fs * 0.9;
      const BL = Math.ceil(ctx.measureText(text).width + pad * 2);
      const BH = Math.round(fs * 1.75);
      const off = document.createElement('canvas');
      off.width = Math.round(BL * dpr);
      off.height = Math.round(BH * dpr);
      const g = off.getContext('2d');
      if (!g) {
        running = false;
        return;
      }
      g.scale(dpr, dpr);
      const bg = g.createLinearGradient(0, 0, 0, BH);
      bg.addColorStop(0, '#ff9230');
      bg.addColorStop(1, '#e24a08');
      g.fillStyle = bg;
      g.fillRect(0, 0, BL, BH);
      g.strokeStyle = '#ffd27a';
      g.lineWidth = 2;
      g.strokeRect(1, 1, BL - 2, BH - 2);
      g.font = font;
      g.textBaseline = 'middle';
      g.textAlign = 'left';
      g.shadowColor = 'rgba(90, 20, 0, 0.55)';
      g.shadowBlur = 2;
      g.shadowOffsetY = 1;
      g.fillStyle = '#fff6e6';
      g.fillText(text, pad, BH / 2 + 1);

      const planeL = fs * 3.5;
      const rope = fs * 1.4;
      const speed = clamp(w * 0.24, 85, 170); // px par seconde : assez lent pour lire
      const x0 = w + planeL / 2 + 12;
      const x1 = -(planeL / 2 + rope + BL + 24);
      const T = (x0 - x1) / speed;
      const baseY = clamp(h * 0.2, 110, 210);
      const wave = fs / 22;
      const started = performance.now();

      const frame = (now: number) => {
        const t = (now - started) / 1000;
        if (t >= T) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          canvas.width = 0;
          running = false;
          return;
        }
        raf = requestAnimationFrame(frame);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        // Fondu à l'entrée et à la sortie de l'écran
        const edge = Math.min(1, t / 0.5, (T - t) / 0.5);
        ctx.globalAlpha = edge;

        const px = x0 - speed * t;
        const py = baseY + Math.sin(t * 1.5) * 6;
        const rot = Math.cos(t * 1.5) * 0.035;
        const tailX = px + planeL / 2 - 2;
        const tailY = py + planeL * 0.01;
        const bx = px + planeL / 2 + rope;
        const by = py - BH / 2 + 2;

        // Corde
        ctx.strokeStyle = 'rgba(255, 235, 205, 0.85)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.quadraticCurveTo((tailX + bx) / 2, py + 5 + Math.sin(t * 3) * 1.5, bx, by + BH / 2);
        ctx.stroke();

        // Banderole : une tranche de 3 px à la fois, qui ondule de plus en plus vers le bout
        const step = 3;
        for (let sx = 0; sx < BL; sx += step) {
          const u = sx / BL;
          const phase = t * 5 - sx * 0.045;
          const dy = Math.sin(phase) * (0.6 + 6.5 * Math.pow(u, 1.1)) * wave;
          const slope = Math.cos(phase) * u;
          const sw = Math.min(step, BL - sx);
          ctx.drawImage(off, sx * dpr, 0, sw * dpr, BH * dpr, bx + sx, by + dy, sw + 0.4, BH);
          if (slope < 0) ctx.fillStyle = `rgba(70, 12, 0, ${-slope * 0.18})`;
          else ctx.fillStyle = `rgba(255, 240, 210, ${slope * 0.1})`;
          ctx.fillRect(bx + sx, by + dy, sw + 0.4, BH);
        }

        drawPlane(ctx, px, py, planeL, t, rot);
        ctx.globalAlpha = 1;
      };
      raf = requestAnimationFrame(frame);
    }

    function onCelebrate(e: Event) {
      const d = (e as CustomEvent<CelebrateDetail>).detail;
      if (d?.banner && !running) start(d.banner);
    }

    window.addEventListener(CELEBRATE_EVENT, onCelebrate);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener(CELEBRATE_EVENT, onCelebrate);
    };
  }, []);

  return <canvas ref={ref} className="plane-canvas" aria-hidden="true" />;
}
