/** Message envoyé au volcan et aux feux d'artifice quand quelque chose est validé. */
export const CELEBRATE_EVENT = 'jded:celebrate';
/** Changement de page : le volcan laisse couler un peu plus de lave. */
export const NAVIGATE_EVENT = 'jded:navigate';
export type CelebrateDetail = { x: number; y: number; banner?: string };

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Éruption + feux d'artifice. Ne fait rien si le système demande moins d'animations. */
/** Avec `banner`, un avion traverse aussi l'écran avec une banderole portant ce message. */
export function celebrate(origin: CelebrateDetail): void {
  if (prefersReducedMotion()) return;
  window.dispatchEvent(new CustomEvent<CelebrateDetail>(CELEBRATE_EVENT, { detail: origin }));
  try {
    navigator.vibrate?.([24, 40, 24]);
  } catch {
    /* pas de vibration sur cet appareil */
  }
}
