import { useRef } from 'react';

/**
 * Sens du dernier changement d'index : 'r' si on avance (le contenu arrive de la droite),
 * 'l' si on recule, '' tant que rien n'a bougé.
 */
export function useSlideDir(index: number): '' | 'r' | 'l' {
  const prev = useRef(index);
  const dir = useRef<'' | 'r' | 'l'>('');
  if (prev.current !== index) {
    dir.current = index > prev.current ? 'r' : 'l';
    prev.current = index;
  }
  return dir.current;
}
