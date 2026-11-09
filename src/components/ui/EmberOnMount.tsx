'use client';

import { useEffect } from 'react';
import { useEmbers } from './Embers';
import { useToast } from './Toast';

/**
 * Petite gerbe de braises quand on arrive juste après une étape importante.
 * `flag` est une clé posée dans sessionStorage juste avant la redirection
 * (compte créé, compte validé). On attend que l'écran de chargement soit parti.
 */
export function EmberOnMount({ flag, message }: { flag: string; message?: string }) {
  const burst = useEmbers();
  const toast = useToast();

  useEffect(() => {
    let armed = false;
    try {
      armed = sessionStorage.getItem(flag) === '1';
      if (armed) sessionStorage.removeItem(flag);
    } catch {
      /* stockage indisponible : tant pis pour l'animation */
    }
    if (!armed) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      const splash = document.getElementById('splash');
      if (!splash || splash.classList.contains('gone') || ++tries > 40) {
        window.clearInterval(timer);
        window.setTimeout(() => {
          burst({ x: window.innerWidth / 2, y: window.innerHeight * 0.42 });
          if (message) toast(message);
        }, 250);
      }
    }, 150);
    return () => window.clearInterval(timer);
  }, [flag, message, burst, toast]);

  return null;
}

/** Pose la clé avant une redirection. */
export function armEmbers(flag: string) {
  try {
    sessionStorage.setItem(flag, '1');
  } catch {
    /* sans importance */
  }
}
