'use client';

import { useEffect, useRef } from 'react';
import { play } from '@/lib/sound';
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

    /** Avion de profil, très simple : un fuselage, une aile, une dérive, une hélice. Il vole vers la gauche. */
    function drawPlane(g: CanvasRenderingContext2D, cx: number, cy: number, L: number, t: number, rot: number) {
      g.save();
      g.translate(cx, cy);
      g.rotate(rot);
      g.scale(L / 100, L / 100);
      g.lineJoin = 'round';
      g.lineCap = 'round';

      // Dérive et stabilisateur (orange braise)
      g.fillStyle = '#ff6a13';
      g.beginPath();
      g.moveTo(30, -4);
      g.lineTo(42, -23);
      g.lineTo(50, -23);
      g.lineTo(52, -3);
      g.closePath();
      g.fill();
      g.beginPath();
      g.moveTo(36, 0);
      g.lineTo(54, -1);
      g.lineTo(54, 3);
      g.lineTo(36, 3.4);
      g.closePath();
      g.fill();

      // Fuselage crème, ligne fuselée
      const body = g.createLinearGradient(0, -11, 0, 9);
      body.addColorStop(0, '#fffaf0');
      body.addColorStop(1, '#f6d9aa');
      g.fillStyle = body;
      g.beginPath();
      g.moveTo(-48, 0);
      g.bezierCurveTo(-48, -8, -36, -11, -20, -11.5);
      g.bezierCurveTo(8, -11.5, 34, -7, 54, -2.5);
      g.lineTo(54, 1.6);
      g.bezierCurveTo(34, 5.5, 8, 9, -20, 9);
      g.bezierCurveTo(-36, 9, -48, 7, -48, 0);
      g.closePath();
      g.fill();

      // Une seule bande orange, fine
      g.strokeStyle = '#ff6a13';
      g.lineWidth = 1.8;
      g.beginPath();
      g.moveTo(-40, 3);
      g.bezierCurveTo(-10, 4.6, 20, 2.6, 50, -0.4);
      g.stroke();

      // Verrière
      g.fillStyle = '#1b2733';
      g.beginPath();
      g.moveTo(-20, -10.6);
      g.lineTo(-7, -10.6);
      g.bezierCurveTo(-3.5, -10.4, -1.5, -7.6, -0.5, -4.8);
      g.lineTo(-22, -4.8);
      g.bezierCurveTo(-22.4, -7.4, -21.6, -9.6, -20, -10.6);
      g.closePath();
      g.fill();

      // Aile : une seule lame, orange
      g.fillStyle = '#e2540a';
      g.beginPath();
      g.moveTo(-12, 1);
      g.lineTo(10, 1);
      g.lineTo(0, 14);
      g.lineTo(-7, 14);
      g.closePath();
      g.fill();

      // Hélice floue
      g.fillStyle = `rgba(255, 243, 220, ${0.26 + 0.12 * Math.sin(t * 70)})`;
      g.beginPath();
      g.ellipse(-52, 0, 1.6, 15 + 2 * Math.sin(t * 50), 0, 0, 6.2832);
      g.fill();
      g.fillStyle = '#ffc15a';
      g.beginPath();
      g.moveTo(-48, -3.4);
      g.lineTo(-54.5, 0);
      g.lineTo(-48, 3.4);
      g.closePath();
      g.fill();
      g.restore();
    }

    function start(text: string) {
      if (!canvas || !ctx) return;
      running = true;
      play('avion', 0.5);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      // Banderole sobre : un ruban noir bordé de braise, le texte dans le dégradé de la marque.
      // Dessinée une fois, puis tranchée en fines bandes pour la faire onduler.
      const label = text.toUpperCase();
      const fs = clamp(Math.round(w * 0.048), 16, 26);
      const font = `700 ${fs}px "Barlow Condensed", "Arial Narrow", Impact, sans-serif`;
      const track = fs * 0.14;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = font;
      const letterSpacing = 'letterSpacing' in ctx;
      if (letterSpacing) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${track}px`;
      const textW = ctx.measureText(label).width + (letterSpacing ? 0 : track * label.length);
      if (letterSpacing) (ctx as unknown as { letterSpacing: string }).letterSpacing = '0px';
      const BH = Math.round(fs * 1.9);
      const padL = fs * 1.2;
      const padR = fs * 1.6;
      const BL = Math.ceil(textW + padL + padR);
      const notch = BH * 0.42;
      const off = document.createElement('canvas');
      off.width = Math.round(BL * dpr);
      off.height = Math.round(BH * dpr);
      const g = off.getContext('2d');
      if (!g) {
        running = false;
        return;
      }
      g.scale(dpr, dpr);
      const shape = () => {
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(BL, 0);
        g.lineTo(BL - notch, BH / 2);
        g.lineTo(BL, BH);
        g.lineTo(0, BH);
        g.closePath();
      };
      const cloth = g.createLinearGradient(0, 0, 0, BH);
      cloth.addColorStop(0, '#1d120b');
      cloth.addColorStop(1, '#0d0806');
      g.fillStyle = cloth;
      shape();
      g.fill();
      const rim = g.createLinearGradient(0, 0, BL, 0);
      rim.addColorStop(0, '#ff6a13');
      rim.addColorStop(1, '#ffc15a');
      g.strokeStyle = rim;
      g.lineWidth = 2;
      g.save();
      shape();
      g.clip();
      g.lineWidth = 3.4; // la moitié dépasse du clip : il reste un trait de 1,7 px bien net
      shape();
      g.stroke();
      g.restore();
      // Texte dans le dégradé du logo
      const ink = g.createLinearGradient(padL, 0, padL + textW, 0);
      ink.addColorStop(0, '#ffc15a');
      ink.addColorStop(0.55, '#ff8a1f');
      ink.addColorStop(1, '#ff6a13');
      g.font = font;
      g.textBaseline = 'middle';
      g.textAlign = 'left';
      if (letterSpacing) (g as unknown as { letterSpacing: string }).letterSpacing = `${track}px`;
      g.fillStyle = ink;
      g.fillText(label, padL, BH / 2 + 1);

      const planeL = fs * 4.6;
      const rope = fs * 1.7;
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
        ctx.globalAlpha = Math.min(1, t / 0.5, (T - t) / 0.5);

        const px = x0 - speed * t;
        const py = baseY + Math.sin(t * 1.5) * 6;
        const rot = Math.cos(t * 1.5) * 0.03;
        const tailX = px + planeL / 2 - 1;
        const tailY = py - planeL * 0.01;
        const bx = px + planeL / 2 + rope;
        const bCy = tailY + 2 + Math.sin(t * 2.2) * 1.5;
        const by = bCy - BH / 2;

        // Une seule corde, fine
        ctx.strokeStyle = 'rgba(255, 243, 220, 0.75)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.quadraticCurveTo((tailX + bx) / 2, (tailY + bCy) / 2 + 3, bx, bCy);
        ctx.stroke();

        // Banderole : une tranche de 3 px à la fois, qui ondule de plus en plus vers le bout
        const step = 3;
        for (let sx = 0; sx < BL; sx += step) {
          const u = sx / BL;
          const phase = t * 5 - sx * 0.045;
          const dy = Math.sin(phase) * (0.5 + 6 * Math.pow(u, 1.1)) * wave;
          const slope = Math.cos(phase) * u;
          const sw = Math.min(step, BL - sx);
          ctx.drawImage(off, sx * dpr, 0, sw * dpr, BH * dpr, bx + sx, by + dy, sw + 0.4, BH);
          if (slope > 0) {
            ctx.fillStyle = `rgba(255, 200, 140, ${slope * 0.1})`;
            ctx.fillRect(bx + sx, by + dy, sw + 0.4, BH);
          }
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
