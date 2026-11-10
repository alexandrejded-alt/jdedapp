'use client';

import { useSyncExternalStore } from 'react';
import { isMuted, setMuted, subscribe, unlock } from '@/lib/sound';

/** Petit haut-parleur dans l'en-tête : coupe ou remet le son (le choix est gardé). */
export function SoundToggle() {
  const muted = useSyncExternalStore(subscribe, isMuted, () => false);
  return (
    <button
      type="button"
      className="sound-btn"
      aria-label={muted ? 'Activer le son' : 'Couper le son'}
      aria-pressed={!muted}
      onClick={() => {
        unlock();
        setMuted(!muted);
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
        {muted ? <path d="m16 9.5 5 5M21 9.5l-5 5" /> : <path d="M16 9a4.5 4.5 0 0 1 0 6M18.6 6.4a8.2 8.2 0 0 1 0 11.2" />}
      </svg>
    </button>
  );
}
