'use client';

import { useEffect, useRef, useState } from 'react';
import { startFlames } from '@/lib/flames';

/** Écran de chargement : flammes, photo JDED, nom. Visible environ 2 secondes à l'ouverture du site. */
export function Splash() {
  const [phase, setPhase] = useState<'show' | 'fade' | 'gone'>('show');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stop = canvasRef.current ? startFlames(canvasRef.current) : () => {};
    const wait = reduce ? 900 : 2300;
    const t1 = window.setTimeout(() => setPhase('fade'), wait);
    const t2 = window.setTimeout(() => {
      setPhase('gone');
      stop();
    }, wait + 700);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      stop();
    };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div id="splash" className={phase === 'fade' ? 'gone' : ''} aria-label="Chargement">
      <canvas id="flames" ref={canvasRef} aria-hidden="true" />
      <div className="splash-in">
        <div className="splash-avatar" role="img" aria-label="JDED" />
        <div className="wordmark">
          JDED<small>APP</small>
        </div>
        <div className="by">by @jdedcut</div>
        <div className="loadbar">
          <i />
        </div>
      </div>
    </div>
  );
}
