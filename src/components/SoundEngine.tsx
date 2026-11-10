'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { clic, prefetch, setLoop, setSuspended, unlock } from '@/lib/sound';

const CLICKABLE = 'button, a[href], [role="tab"], summary, input[type="submit"], .btn, .time, .chip';

/** Branche les sons : réveil au premier toucher, clic aléatoire sur les boutons, ambiance selon l'écran. */
export function SoundEngine() {
  const pathname = usePathname();

  useEffect(() => {
    prefetch(['clic_1', 'clic_2', 'clic_3', 'volcan', 'radio', 'confirme', 'fire_1', 'fire_2', 'fire_3', 'avion']);
    const wake = () => unlock();
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.(CLICKABLE);
      if (!el || (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return;
      clic();
    };
    const onVis = () => setSuspended(document.hidden);
    window.addEventListener('pointerdown', wake, { capture: true });
    window.addEventListener('keydown', wake, { capture: true });
    document.addEventListener('click', onClick, true);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pointerdown', wake, { capture: true });
      window.removeEventListener('keydown', wake, { capture: true });
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // Showtime = la radio du plateau ; l'espace admin reste silencieux ; partout ailleurs, le volcan.
  useEffect(() => {
    if (pathname.startsWith('/showtime')) setLoop('radio');
    else if (pathname.startsWith('/admin')) setLoop(null);
    else setLoop('volcan');
  }, [pathname]);

  return null;
}
