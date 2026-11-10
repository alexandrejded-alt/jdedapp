'use client';

import { useEffect, useRef, useState } from 'react';
import { SHAKE_EVENT, prefersReducedMotion, type ShakeDetail } from '@/lib/celebrate';

type MotionCtor = typeof DeviceMotionEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };

/**
 * Secouer le téléphone déclenche une petite éruption, proportionnelle à la force de la secousse.
 * Android : ça marche directement. iPhone : iOS demande une autorisation, d'où le petit bouton
 * (affiché seulement si le téléphone n'envoie encore aucun mouvement). Rien sur ordinateur.
 */
export function ShakeEruption() {
  const [ask, setAsk] = useState(false);
  const live = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let lastFire = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.acceleration;
      let m = 0;
      if (a && (a.x != null || a.y != null || a.z != null)) {
        m = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      } else {
        const g = e.accelerationIncludingGravity;
        if (!g) return;
        m = Math.abs(Math.hypot(g.x ?? 0, g.y ?? 0, g.z ?? 0) - 9.81);
      }
      if (!live.current) {
        live.current = true;
        setAsk(false);
      }
      const now = performance.now();
      if (m < 11 || now - lastFire < 420) return;
      lastFire = now;
      const power = Math.min(1, Math.max(0.08, (m - 11) / 24));
      window.dispatchEvent(new CustomEvent<ShakeDetail>(SHAKE_EVENT, { detail: { power } }));
      try {
        navigator.vibrate?.(Math.round(18 + 50 * power));
      } catch {
        /* pas de vibration */
      }
    };
    window.addEventListener('devicemotion', onMotion);
    // Si aucun mouvement n'arrive et qu'iOS demande une autorisation, on propose le bouton.
    const t = window.setTimeout(() => {
      const C = window.DeviceMotionEvent as MotionCtor | undefined;
      if (!live.current && C && typeof C.requestPermission === 'function') setAsk(true);
    }, 1800);
    return () => {
      window.removeEventListener('devicemotion', onMotion);
      window.clearTimeout(t);
    };
  }, []);

  if (!ask) return null;
  return (
    <button
      type="button"
      className="shake-ask"
      onClick={async () => {
        try {
          const C = window.DeviceMotionEvent as MotionCtor;
          const r = await C.requestPermission?.();
          if (r === 'granted') setAsk(false);
        } catch {
          setAsk(false);
        }
      }}
    >
      Activer la secousse
    </button>
  );
}
