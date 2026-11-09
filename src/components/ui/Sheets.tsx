'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Feuille qui monte du bas de l'écran. Fermeture : fond sombre ou touche Échap. */
export function BottomSheet({
  label,
  onClose,
  className = '',
  children,
}: {
  label: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={`sheet ${className}`.trim()}>
      <div className="sheet-bg" onClick={onClose} />
      <div className="sheet-card" role="dialog" aria-modal="true" aria-label={label}>
        <div className="grab" />
        {children}
      </div>
    </div>
  );
}

/** Feuille de confirmation : un titre, le détail, un gros bouton. */
export function ConfirmSheet({
  eyebrow,
  title,
  detail,
  note,
  okLabel,
  busyLabel = 'Un instant…',
  onConfirm,
  onClose,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  note?: string;
  okLabel: string;
  busyLabel?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    okRef.current?.focus();
  }, []);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      onClose();
    }
  }

  return (
    <BottomSheet label={title} onClose={onClose}>
      <div className="eyebrow">{eyebrow}</div>
      <h2>{title}</h2>
      <div className="sheet-detail">{detail}</div>
      {note && <p className="hint">{note}</p>}
      <button ref={okRef} className="btn btn-primary btn-block" onClick={confirm} disabled={busy}>
        {busy ? busyLabel : okLabel}
      </button>
      <button className="btn btn-ghost btn-block" onClick={onClose} disabled={busy}>
        Retour
      </button>
    </BottomSheet>
  );
}
