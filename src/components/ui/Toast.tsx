'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type Show = (message: string, bad?: boolean) => void;
const ToastContext = createContext<Show>(() => {});

/** Petit message qui apparaît en bas de l'écran puis disparaît. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; bad: boolean } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback<Show>((message, bad = false) => {
    setToast({ message, bad });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3600);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div role="status" aria-live="polite">
        {toast && <div className={`toast${toast.bad ? ' bad' : ''}`}>{toast.message}</div>}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
