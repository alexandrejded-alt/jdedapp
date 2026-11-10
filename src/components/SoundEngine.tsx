'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { CELEBRATE_EVENT, SHAKE_EVENT, type ShakeDetail } from '@/lib/celebrate';
import { clic, eruption, playWhenReady, prefetch, setSuspended, unlock } from '@/lib/sound';

const CLICKABLE = 'button, a[href], [role="tab"], summary, input[type="submit"], .btn, .time, .chip';

/** Branche les sons : réveil au premier toucher, clic aléatoire sur les boutons, ambiance selon l'écran. */
export function SoundEngine() {
  const pathname = usePathname();

  useEffect(() => {
    prefetch(['clic_1', 'clic_2', 'clic_3', 'volcan', 'radio', 'confirme', 'fire_1', 'fire_2', 'fire_3']);
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
    // Le grondement du volcan ne retentit que quand il explose : réservation confirmée ou secousse du téléphone.
    const onCelebrate = () => eruption(0.38, 6.5);
    const onShake = (e: Event) => {
      // Sur le plateau Showtime et l'espace admin le volcan est caché : pas de bruit pour rien.
      if (document.documentElement.dataset.stage) return;
      const power = Math.max(0, Math.min(1, (e as CustomEvent<ShakeDetail>).detail?.power ?? 0));
      eruption(0.22 + 0.3 * power, 2.2 + 3 * power);
    };
    window.addEventListener(CELEBRATE_EVENT, onCelebrate);
    window.addEventListener(SHAKE_EVENT, onShake);
    return () => {
      window.removeEventListener('pointerdown', wake, { capture: true });
      window.removeEventListener('keydown', wake, { capture: true });
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener(CELEBRATE_EVENT, onCelebrate);
      window.removeEventListener(SHAKE_EVENT, onShake);
    };
  }, []);

  // Showtime = la radio du plateau, jouée une seule fois à l'arrivée (pas en boucle). Ailleurs : silence.
  useEffect(() => {
    if (pathname.startsWith('/showtime')) playWhenReady('radio', 0.5);
  }, [pathname]);

  return null;
}
