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

    const OUT = '#2a120a';

    /** Petite flamme stylisée (dans un carré de 10 x 14, pointe en haut). */
    function flame(g: CanvasRenderingContext2D, x: number, y: number, k: number, hot = '#ff6a13', core = '#ffd27a') {
      g.save();
      g.translate(x, y);
      g.scale(k, k);
      g.fillStyle = hot;
      g.beginPath();
      g.moveTo(5, 0);
      g.bezierCurveTo(6, 4, 10, 6, 10, 10);
      g.bezierCurveTo(10, 13, 7.6, 14, 5, 14);
      g.bezierCurveTo(2.4, 14, 0, 13, 0, 10);
      g.bezierCurveTo(0, 7.5, 2, 6.5, 2.6, 3.6);
      g.bezierCurveTo(3.8, 4.6, 4.4, 5.6, 4.6, 6.6);
      g.bezierCurveTo(5.6, 4.6, 5.8, 2.4, 5, 0);
      g.closePath();
      g.fill();
      g.fillStyle = core;
      g.beginPath();
      g.moveTo(5, 6.5);
      g.bezierCurveTo(5.6, 8.4, 7.4, 9, 7.4, 11);
      g.bezierCurveTo(7.4, 12.6, 6.2, 13.2, 5, 13.2);
      g.bezierCurveTo(3.8, 13.2, 2.6, 12.6, 2.6, 11);
      g.bezierCurveTo(2.6, 9.4, 4.4, 8.6, 5, 6.5);
      g.closePath();
      g.fill();
      g.restore();
    }

    function drawPlane(g: CanvasRenderingContext2D, cx: number, cy: number, L: number, t: number, rot: number) {
      g.save();
      g.translate(cx, cy);
      g.rotate(rot);
      g.scale(L / 100, L / 100);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      const edge = (w = 1.5) => {
        g.lineWidth = w;
        g.strokeStyle = OUT;
        g.stroke();
      };

      // Lueur douce autour de l'avion
      const halo = g.createRadialGradient(0, -2, 6, 0, -2, 70);
      halo.addColorStop(0, 'rgba(255, 160, 70, 0.22)');
      halo.addColorStop(1, 'rgba(255, 106, 19, 0)');
      g.fillStyle = halo;
      g.fillRect(-80, -70, 160, 140);

      // Train d'atterrissage
      g.strokeStyle = OUT;
      g.lineWidth = 2.4;
      g.beginPath();
      g.moveTo(-14, 8);
      g.lineTo(-22, 17);
      g.moveTo(-3, 8);
      g.lineTo(-22, 17);
      g.stroke();
      g.fillStyle = '#1d1511';
      g.beginPath();
      g.arc(-22, 18.6, 4.4, 0, 6.2832);
      g.fill();
      edge(1.2);
      g.fillStyle = '#ffd27a';
      g.beginPath();
      g.arc(-22, 18.6, 1.6, 0, 6.2832);
      g.fill();
      g.fillStyle = OUT;
      g.beginPath();
      g.arc(45, 5.5, 1.8, 0, 6.2832);
      g.fill();

      // Stabilisateur et dérive
      g.fillStyle = '#e2540a';
      g.beginPath();
      g.moveTo(32, -1);
      g.lineTo(53, -3);
      g.lineTo(54, 2.2);
      g.lineTo(32, 3.6);
      g.closePath();
      g.fill();
      edge(1.2);
      const fin = g.createLinearGradient(0, -26, 0, -4);
      fin.addColorStop(0, '#ff8a2a');
      fin.addColorStop(1, '#e2540a');
      g.fillStyle = fin;
      g.beginPath();
      g.moveTo(30, -5);
      g.lineTo(43, -25);
      g.quadraticCurveTo(46.5, -27.5, 50, -25);
      g.lineTo(53, -3);
      g.closePath();
      g.fill();
      edge(1.4);
      g.fillStyle = 'rgba(255, 246, 225, 0.9)';
      g.beginPath();
      g.moveTo(41, -14);
      g.lineTo(50.6, -14.8);
      g.lineTo(51.2, -10.4);
      g.lineTo(39.2, -9.4);
      g.closePath();
      g.fill();

      // Fuselage
      const bodyPath = () => {
        g.beginPath();
        g.moveTo(-47, -1);
        g.bezierCurveTo(-47, -9, -36, -12, -22, -12.6);
        g.lineTo(10, -12);
        g.bezierCurveTo(28, -11, 40, -6, 53, -3);
        g.lineTo(53, 2);
        g.bezierCurveTo(40, 5, 28, 8, 10, 9.6);
        g.lineTo(-22, 10.4);
        g.bezierCurveTo(-38, 10.4, -47, 7, -47, -1);
        g.closePath();
      };
      const body = g.createLinearGradient(0, -12, 0, 10);
      body.addColorStop(0, '#fffaf0');
      body.addColorStop(0.55, '#ffe6bd');
      body.addColorStop(1, '#f0a458');
      g.fillStyle = body;
      bodyPath();
      g.fill();
      g.save();
      bodyPath();
      g.clip();
      g.fillStyle = '#ff6a13';
      g.fillRect(-50, 2.2, 110, 3.2);
      g.fillStyle = '#ffc15a';
      g.fillRect(-50, 1.4, 110, 0.9);
      g.restore();
      bodyPath();
      edge(1.6);
      flame(g, 16, -8, 0.95);

      // Capot moteur
      g.fillStyle = OUT;
      g.beginPath();
      g.moveTo(-47, -1);
      g.bezierCurveTo(-47, -6, -44.5, -9.4, -39, -10.8);
      g.lineTo(-39, 9);
      g.bezierCurveTo(-44.5, 7.6, -47, 4.4, -47, -1);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(255, 196, 120, 0.55)';
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(-43.5, -6);
      g.lineTo(-43.5, 4);
      g.stroke();

      // Verrière
      g.fillStyle = '#1f3550';
      g.beginPath();
      g.moveTo(-19, -11.8);
      g.lineTo(-6, -11.8);
      g.bezierCurveTo(-2.4, -11.6, -0.4, -8.4, 1, -4.6);
      g.lineTo(-21.4, -4.6);
      g.bezierCurveTo(-21.6, -8, -20.8, -10.6, -19, -11.8);
      g.closePath();
      g.fill();
      edge(1.2);
      g.fillStyle = 'rgba(255, 255, 255, 0.38)';
      g.beginPath();
      g.moveTo(-17.6, -10.6);
      g.lineTo(-12, -10.6);
      g.lineTo(-15.6, -5.6);
      g.lineTo(-19.4, -5.6);
      g.closePath();
      g.fill();

      // Mâts qui tiennent l'aile
      g.strokeStyle = OUT;
      g.lineWidth = 1.8;
      g.beginPath();
      g.moveTo(-8, -12.4);
      g.lineTo(-15, -21);
      g.moveTo(-1, -12.2);
      g.lineTo(7, -21);
      g.stroke();

      // Aile haute
      const wing = g.createLinearGradient(0, -25.5, 0, -19.5);
      wing.addColorStop(0, '#ff9230');
      wing.addColorStop(1, '#e2540a');
      g.fillStyle = wing;
      g.beginPath();
      g.moveTo(-26, -22.5);
      g.quadraticCurveTo(-25, -25.8, -20, -25.8);
      g.lineTo(14, -25.2);
      g.quadraticCurveTo(21, -24.6, 21, -22);
      g.quadraticCurveTo(21, -19.6, 14, -19.6);
      g.lineTo(-20, -19.4);
      g.quadraticCurveTo(-26, -19.4, -26, -22.5);
      g.closePath();
      g.fill();
      edge(1.5);
      g.strokeStyle = 'rgba(255, 246, 225, 0.9)';
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(-20, -22.6);
      g.lineTo(15, -22.4);
      g.stroke();

      // Hélice floue + ogive
      const blur = 0.3 + 0.14 * Math.sin(t * 70);
      g.fillStyle = `rgba(255, 244, 225, ${blur})`;
      g.beginPath();
      g.ellipse(-52, -1, 2.2, 17 + 2.5 * Math.sin(t * 50), 0, 0, 6.2832);
      g.fill();
      g.fillStyle = `rgba(255, 196, 120, ${blur * 0.8})`;
      g.beginPath();
      g.ellipse(-52, -1, 1, 17, 0, 0, 6.2832);
      g.fill();
      g.fillStyle = '#ffd27a';
      g.beginPath();
      g.moveTo(-47, -4.4);
      g.lineTo(-55.5, -1);
      g.lineTo(-47, 2.4);
      g.closePath();
      g.fill();
      edge(1.2);
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

      // La banderole est dessinée une fois (tissu crème, bandes orange, queue d'hirondelle),
      // puis tranchée en fines bandes pour la faire onduler.
      const fs = clamp(Math.round(w * 0.06), 20, 32);
      const font = `800 ${fs}px "Barlow Condensed", "Arial Narrow", Impact, sans-serif`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = font;
      const padL = fs * 1.55;
      const padR = fs * 2.1;
      const BH = Math.round(fs * 2.1);
      const BL = Math.ceil(ctx.measureText(text).width + padL + padR);
      const off = document.createElement('canvas');
      off.width = Math.round(BL * dpr);
      off.height = Math.round(BH * dpr);
      const g = off.getContext('2d');
      if (!g) {
        running = false;
        return;
      }
      g.scale(dpr, dpr);
      const cloth = g.createLinearGradient(0, 0, 0, BH);
      cloth.addColorStop(0, '#fffaf0');
      cloth.addColorStop(1, '#ffe9c8');
      g.fillStyle = cloth;
      g.fillRect(0, 0, BL, BH);
      const band = Math.round(BH * 0.17);
      const bandFill = g.createLinearGradient(0, 0, 0, band);
      bandFill.addColorStop(0, '#ff9230');
      bandFill.addColorStop(1, '#e2540a');
      g.fillStyle = bandFill;
      g.fillRect(0, 0, BL, band);
      g.fillRect(0, BH - band, BL, band);
      g.fillStyle = '#ffd27a';
      g.fillRect(0, band, BL, 1.4);
      g.fillRect(0, BH - band - 1.4, BL, 1.4);
      g.strokeStyle = OUT;
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(0, 0.8);
      g.lineTo(BL, 0.8);
      g.moveTo(0, BH - 0.8);
      g.lineTo(BL, BH - 0.8);
      g.stroke();
      // Flammes aux deux bouts
      flame(g, fs * 0.42, BH / 2 - fs * 0.5, fs / 22);
      flame(g, BL - padR + fs * 0.1, BH / 2 - fs * 0.5, fs / 22);
      // Texte : brun profond, avec un petit relief orange
      g.font = font;
      g.textBaseline = 'middle';
      g.textAlign = 'left';
      g.fillStyle = '#ff9230';
      g.fillText(text, padL + 1.2, BH / 2 + 2.2);
      g.fillStyle = OUT;
      g.fillText(text, padL, BH / 2 + 1);
      // Queue d'hirondelle
      g.globalCompositeOperation = 'destination-out';
      g.beginPath();
      g.moveTo(BL + 1, -1);
      g.lineTo(BL - BH * 0.5, BH / 2);
      g.lineTo(BL + 1, BH + 1);
      g.closePath();
      g.fill();
      g.globalCompositeOperation = 'source-over';

      const planeL = fs * 4.4;
      const rope = fs * 1.5;
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
        const rot = Math.cos(t * 1.5) * 0.035;
        const tailX = px + planeL / 2 - 1;
        const tailY = py - planeL * 0.012;
        const bx = px + planeL / 2 + rope;
        const bCy = py + 4 + Math.sin(t * 2.2) * 1.5;
        const by = bCy - BH / 2;

        // Brides : deux cordes en V entre l'avion et la barre de la banderole
        ctx.strokeStyle = 'rgba(255, 236, 205, 0.9)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.quadraticCurveTo((tailX + bx) / 2, tailY - 1, bx, by - 3);
        ctx.moveTo(tailX, tailY);
        ctx.quadraticCurveTo((tailX + bx) / 2, tailY + 5, bx, by + BH + 3);
        ctx.stroke();

        // Banderole : une tranche de 3 px à la fois, qui ondule de plus en plus vers le bout
        const step = 3;
        for (let sx = 0; sx < BL; sx += step) {
          const u = sx / BL;
          const phase = t * 5 - sx * 0.045;
          const dy = Math.sin(phase) * (0.5 + 6.5 * Math.pow(u, 1.1)) * wave;
          const slope = Math.cos(phase) * u;
          const sw = Math.min(step, BL - sx);
          ctx.drawImage(off, sx * dpr, 0, sw * dpr, BH * dpr, bx + sx, by + dy, sw + 0.4, BH);
          // Plis du tissu : ombre et lumière selon la pente
          ctx.fillStyle = slope < 0 ? `rgba(90, 30, 5, ${-slope * 0.26})` : `rgba(255, 255, 255, ${slope * 0.2})`;
          ctx.fillRect(bx + sx, by + dy, sw + 0.4, BH);
        }

        // Barre rigide au bout de la banderole
        ctx.fillStyle = OUT;
        ctx.fillRect(bx - 2.4, by - 5, 3.6, BH + 10);
        ctx.fillStyle = '#ffd27a';
        ctx.fillRect(bx - 2.4, by - 5, 3.6, 2);
        ctx.fillRect(bx - 2.4, by + BH + 3, 3.6, 2);

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
