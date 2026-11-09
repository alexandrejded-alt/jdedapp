'use client';

import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRealtimeRefresh } from '@/lib/useRealtimeRefresh';
import { FlameIcon } from './ui/Icons';
import { LogoutButton } from './LogoutButton';

/**
 * « Demande envoyée, JDED doit te valider ».
 * Dès que JDED accepte (ou refuse), la page change toute seule.
 */
export function WaitScreen({ userId, name, email }: { userId: string; name: string; email: string }) {
  const check = useCallback(async () => {
    const { data } = await createClient().from('profiles').select('status').eq('id', userId).maybeSingle();
    if (data && data.status !== 'pending') window.location.href = '/';
  }, [userId]);

  useRealtimeRefresh(['profiles'], check);

  return (
    <section className="gate pad">
      <div className="gate-card">
        <FlameIcon />
        <div className="eyebrow">Demande envoyée</div>
        <h1>JDED doit te valider</h1>
        <p>Dès que c&apos;est fait, l&apos;app s&apos;ouvre toute seule. Tu peux fermer cette page, ta demande est gardée.</p>
        <div className="recap">
          <b>{name || 'Ton compte'}</b>
          <span className="dim">{email}</span>
        </div>
        <LogoutButton variant="button" />
      </div>
    </section>
  );
}
