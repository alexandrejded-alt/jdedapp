import { quietFor } from './sound';

/** Message envoyé au volcan et aux feux d'artifice quand quelque chose est validé. */
export const CELEBRATE_EVENT = 'jded:celebrate';
/** Changement de page : le volcan laisse couler un peu plus de lave. */
export const NAVIGATE_EVENT = 'jded:navigate';
/** Secousse du téléphone : petite éruption proportionnelle à la force (power de 0 à 1). */
export const SHAKE_EVENT = 'jded:shake';
export type ShakeDetail = { power: number };
/** `holo` : réservation Showtime → l'hologramme apparaît (et les autres sons se taisent). Pas pour les coupes. */
export type CelebrateDetail = { x: number; y: number; banner?: string; holo?: boolean };

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Éruption + feux d'artifice. Ne fait rien si le système demande moins d'animations. */
/** `banner` : le message de la réservation confirmée (sert à ne célébrer que les vraies réservations). */
export function celebrate(origin: CelebrateDetail): void {
  if (prefersReducedMotion()) return;
  // Pendant l'hologramme (Showtime seulement), seul le son de la vidéo reste : tous les autres sons se taisent.
  if (origin.holo) quietFor(9500);
  window.dispatchEvent(new CustomEvent<CelebrateDetail>(CELEBRATE_EVENT, { detail: origin }));
  try {
    navigator.vibrate?.([24, 40, 24]);
  } catch {
    /* pas de vibration sur cet appareil */
  }
}
