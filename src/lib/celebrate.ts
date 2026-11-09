/** Message envoyé au volcan et aux feux d'artifice quand quelque chose est validé. */
export const CELEBRATE_EVENT = 'jded:celebrate';
export type CelebrateDetail = { x: number; y: number };

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Éruption + feux d'artifice. Ne fait rien si le système demande moins d'animations. */
export function celebrate(origin: CelebrateDetail): void {
  if (prefersReducedMotion()) return;
  window.dispatchEvent(new CustomEvent<CelebrateDetail>(CELEBRATE_EVENT, { detail: origin }));
  try {
    navigator.vibrate?.([24, 40, 24]);
  } catch {
    /* pas de vibration sur cet appareil */
  }
}
