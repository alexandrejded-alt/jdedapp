'use client';

import { useEffect, useRef } from 'react';
import { createClient } from './supabase/client';

/**
 * Recharge les données quand quelque chose change dans la base (Supabase
 * Realtime), quand l'utilisateur revient sur l'onglet, et toutes les 45 s
 * par sécurité. Rien n'est affiché à l'écran à ce sujet : les listes se
 * mettent juste à jour toutes seules.
 */
export function useRealtimeRefresh(tables: string[], load: () => void | Promise<void>, enabled = true) {
  const loadRef = useRef(load);
  loadRef.current = load;
  const key = tables.join(',');

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    let timer: number | undefined;

    const run = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void loadRef.current(), 150);
    };

    void loadRef.current();

    const channel = supabase.channel(`rt-${key}-${Math.random().toString(36).slice(2)}`);
    key.split(',').forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, run);
    });
    channel.subscribe();

    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', onVisible);
    const interval = window.setInterval(run, 45000);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
    };
  }, [key, enabled]);
}
