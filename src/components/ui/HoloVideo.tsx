'use client';

import { useEffect, useRef, useState } from 'react';
import { CELEBRATE_EVENT, type CelebrateDetail } from '@/lib/celebrate';
import { holoSound, isMuted, quietFor } from '@/lib/sound';

const SRC = '/holo/resa.mp4';
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Hologramme de réservation Showtime : quand une place est confirmée, la vidéo de JDED apparaît au centre,
 * détourée en direct (le noir devient transparent, image par image) pour flotter directement sur le site.
 * Un toucher la ferme ; sinon elle disparaît toute seule à la fin.
 */
export function HoloVideo() {
  const [phase, setPhase] = useState<'off' | 'in' | 'out'>('off');
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const timer = useRef(0);
  const playTimer = useRef(0);
  const phaseRef = useRef<'off' | 'in' | 'out'>('off');

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const off = document.createElement('canvas');
    const octx = off.getContext('2d', { willReadFrequently: true });

    const paint = () => {
      const c = canvas.current;
      const ctx = c?.getContext('2d');
      if (c && ctx && octx && v.readyState >= 2 && v.videoWidth) {
        if (off.width !== v.videoWidth) {
          off.width = c.width = v.videoWidth;
          off.height = c.height = v.videoHeight;
        }
        octx.drawImage(v, 0, 0);
        const img = octx.getImageData(0, 0, off.width, off.height);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          // Le fond est noir : plus un pixel est sombre, plus il devient transparent.
          const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
          d[i + 3] = smooth(0.03, 0.09, lum) * 255;
          // Un peu de lumière en plus : l'image brille comme une projection.
          d[i] = Math.min(255, d[i] * 1.3);
          d[i + 1] = Math.min(255, d[i + 1] * 1.22);
          d[i + 2] = Math.min(255, d[i + 2] * 1.1);
        }
        ctx.putImageData(img, 0, 0);
      }
      raf.current = requestAnimationFrame(paint);
    };

    const show = (p: 'off' | 'in' | 'out') => {
      phaseRef.current = p;
      setPhase(p);
    };

    const close = () => {
      if (phaseRef.current !== 'in') return;
      window.clearTimeout(timer.current);
      window.clearTimeout(playTimer.current);
      quietFor(0);
      holoSound('end');
      show('out');
      timer.current = window.setTimeout(() => {
        cancelAnimationFrame(raf.current);
        v.pause();
        show('off');
      }, 800);
    };

    const onCelebrate = (e: Event) => {
      // Seulement pour une réservation Showtime (les coupes gardent leur propre animation).
      if (!(e as CustomEvent<CelebrateDetail>).detail?.holo) return;
      window.clearTimeout(timer.current);
      cancelAnimationFrame(raf.current);
      holoSound('start');
      show('in');
      v.currentTime = 0;
      // Pendant l'hologramme, seul le son de la vidéo reste (sauf si le son du site est coupé) ;
      // les autres sons sont mis en pause par celebrate() → quietFor().
      v.muted = isMuted();
      v.volume = 1;
      // La vidéo démarre quand l'hologramme a fini de se former (le petit son de départ accompagne l'apparition).
      window.clearTimeout(playTimer.current);
      playTimer.current = window.setTimeout(() => {
        const go = v.play();
        // Si le navigateur refuse le son, on joue quand même l'image.
        if (go) go.catch(() => { v.muted = true; v.play().catch(() => {}); });
      }, 550);
      raf.current = requestAnimationFrame(paint);
    };

    v.addEventListener('ended', close);
    window.addEventListener(CELEBRATE_EVENT, onCelebrate);
    (window as unknown as { __holoClose?: () => void }).__holoClose = close;
    return () => {
      v.removeEventListener('ended', close);
      window.removeEventListener(CELEBRATE_EVENT, onCelebrate);
      cancelAnimationFrame(raf.current);
      window.clearTimeout(timer.current);
      window.clearTimeout(playTimer.current);
    };
  }, []);

  return (
    <div
      className={`holo ${phase === 'off' ? '' : phase}`}
      aria-hidden="true"
      onClick={() => (window as unknown as { __holoClose?: () => void }).__holoClose?.()}
    >
      <div className="holo-stage">
        <div className="holo-beam" />
        <canvas ref={canvas} className="holo-canvas" />
        <div className="holo-base" />
        <div className="holo-scan" />
        <div className="holo-edge" />
      </div>
      <video ref={video} src={SRC} className="holo-src" playsInline preload="auto" />
    </div>
  );
}
