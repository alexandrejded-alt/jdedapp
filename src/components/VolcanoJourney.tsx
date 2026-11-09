'use client';

import { useEffect, useRef, useState } from 'react';
import { celebrate, prefersReducedMotion } from '@/lib/celebrate';
import { craterPoint } from '@/lib/volcano';
import { drawJourney, JOURNEY_DURATION, JOURNEY_EVENT, loadPortrait, type JourneyGuest, type JourneyPortraits } from '@/lib/volcanoJourney';

export const VOLCANO_JOURNEY_EVENT = JOURNEY_EVENT;

export function VolcanoJourney() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finishRef = useRef<() => void>(() => {});
  const skipRef = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const g = canvas?.getContext('2d');
    if (!canvas || !g) return;
    let raf = 0, elapsed = 0, last = 0, running = false, w = 0, h = 0, dpr = 1, session = 0;
    let snapshot: HTMLCanvasElement | null = null;
    let previousFocus: HTMLElement | null = null;
    let portraits: JourneyPortraits = { barber: null, guest: null, name: 'TOI' };
    const barber = loadPortrait('/avatar.jpg');
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    };
    const finish = () => {
      if (!running) return;
      running = false; session++; cancelAnimationFrame(raf); setActive(false);
      g.clearRect(0, 0, w, h); snapshot = null;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      celebrate({ ...craterPoint(w, h), banner: 'Bravo pour ta réservation' });
    };
    finishRef.current = finish;
    function frame(now: number) {
      if (!running) return;
      if (!document.hidden) elapsed += Math.min((now - last) / 1000, .05);
      last = now;
      if (elapsed >= JOURNEY_DURATION) { finish(); return; }
      g!.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawJourney(g!, w, h, elapsed, portraits, snapshot);
      raf = requestAnimationFrame(frame);
    }
    const start = (event: Event) => {
      if (running || prefersReducedMotion()) return;
      const guest = (event as CustomEvent<JourneyGuest>).detail;
      const current = ++session;
      portraits = { barber: null, guest: null, name: guest?.name?.trim() || 'TOI' };
      void Promise.all([barber, loadPortrait(guest?.avatarUrl)]).then(([barberPhoto, guestPhoto]) => {
        if (current === session) portraits = { ...portraits, barber: barberPhoto, guest: guestPhoto };
      });
      // Photograph the real background so the camera flies into this exact volcano.
      const background = document.querySelector<HTMLCanvasElement>('.volcano-bg');
      snapshot = document.createElement('canvas');
      snapshot.width = background?.width || window.innerWidth;
      snapshot.height = background?.height || window.innerHeight;
      if (background) snapshot.getContext('2d')?.drawImage(background, 0, 0);
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      resize(); running = true; elapsed = 0; last = performance.now(); setActive(true);
      raf = requestAnimationFrame(frame);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!running) return;
      if (e.key === 'Escape') finish();
      if (e.key === 'Tab') { e.preventDefault(); skipRef.current?.focus(); }
    };
    window.addEventListener(JOURNEY_EVENT, start); window.addEventListener('resize', resize); window.addEventListener('keydown', onKey);
    return () => {
      running = false; session++; cancelAnimationFrame(raf);
      window.removeEventListener(JOURNEY_EVENT, start); window.removeEventListener('resize', resize); window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => { if (active) skipRef.current?.focus({ preventScroll: true }); }, [active]);

  return <div className="volcano-journey" hidden={!active} role="dialog" aria-modal="true" aria-label="Coupe réservée : le duel du volcan">
    <canvas ref={canvasRef} aria-hidden="true" />
    <span className="sr-only" role="status">Coupe réservée ! JDED, ton coiffeur, est à gauche. Tu es à droite, au sommet du volcan.</span>
    <button ref={skipRef} type="button" onClick={() => finishRef.current()}>Passer la séquence <span aria-hidden="true">↗</span></button>
  </div>;
}
