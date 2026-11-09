'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Bouton "deux touches" pour les actions sensibles : le premier appui demande
 * confirmation (le bouton devient rouge), le deuxième exécute. Sans second
 * appui au bout de 4 secondes, il revient à la normale.
 */
export function ConfirmButton({
  label,
  armedLabel = 'Confirmer',
  onConfirm,
  className = 'btn btn-sm btn-danger',
  armedClassName = 'btn btn-sm btn-armed',
  ariaLabel,
}: {
  label: ReactNode;
  armedLabel?: ReactNode;
  onConfirm: () => Promise<void> | void;
  className?: string;
  armedClassName?: string;
  ariaLabel?: string;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function click() {
    if (!armed) {
      setArmed(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setArmed(false), 4000);
      return;
    }
    window.clearTimeout(timer.current);
    setArmed(false);
    void onConfirm();
  }

  return (
    <button
      type="button"
      className={armed ? armedClassName : className}
      onClick={click}
      aria-label={ariaLabel}
    >
      {armed ? armedLabel : label}
    </button>
  );
}
