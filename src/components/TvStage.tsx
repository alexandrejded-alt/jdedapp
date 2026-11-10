'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Décor « JDED TV SHOW » : plateau télé (rideaux, projecteurs, mur LED, sol brillant)
 * affiché derrière l'onglet Showtime. L'attribut data-stage="tv" sur <html> pilote
 * tout le thème en CSS. À l'entrée et à la sortie, un « zap » de vieille télé
 * (la ligne lumineuse qui s'ouvre) fait la transition.
 */
export function TvStage() {
  const pathname = usePathname();
  const first = useRef(true);
  const zap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = pathname.startsWith('/showtime');
    const root = document.documentElement;
    const was = root.dataset.stage === 'tv';
    if (on) root.dataset.stage = 'tv';
    else delete root.dataset.stage;

    // Pas de zap au tout premier affichage, ni si rien ne change.
    if (first.current) {
      first.current = false;
      return;
    }
    // Le zap n'est joué qu'à l'entrée sur le plateau, pas à la sortie.
    if (!on || was) return;
    const el = zap.current;
    if (!el) return;
    el.classList.remove('go');
    void el.offsetWidth; // relance l'animation
    el.classList.add('go');
  }, [pathname]);

  return (
    <>
      <div className="tv-studio" aria-hidden="true">
        <div className="tv-wall" />
        <div className="tv-beam b1" />
        <div className="tv-beam b2" />
        <div className="tv-beam b3" />
        <div className="tv-curtain l" />
        <div className="tv-curtain r" />
        <div className="tv-floor" />
        <div className="tv-scan" />
        <div className="tv-vignette" />
      </div>
      <div className="tv-zap" ref={zap} aria-hidden="true">
        <i className="z-dark" />
        <i className="z-line" />
        <i className="z-open" />
        <i className="z-bars" />
        <i className="z-noise" />
        <b>CH 01</b>
      </div>
    </>
  );
}
