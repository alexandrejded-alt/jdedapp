'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRealtimeRefresh } from '@/lib/useRealtimeRefresh';
import { Icon, type IconName } from './ui/Icons';

/** Compteur de demandes d'accès en attente (visible sur l'onglet Admin). */
export function usePendingCount(enabled: boolean): number {
  const [count, setCount] = useState(0);
  const load = useCallback(async () => {
    const { count: n } = await createClient()
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    setCount(n ?? 0);
  }, []);
  useRealtimeRefresh(['profiles'], load, enabled);
  return enabled ? count : 0;
}

/** Barre d'onglets en bas : Cut, Showtime et (pour JDED seulement) Admin. */
export function TabBar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const pending = usePendingCount(isAdmin);

  const tabs: { href: string; label: string; icon: IconName }[] = [
    { href: '/cut', label: 'Cut', icon: 'cut' },
    { href: '/showtime', label: 'Showtime', icon: 'show' },
  ];
  if (isAdmin) tabs.push({ href: '/admin', label: 'Admin', icon: 'admin' });

  return (
    <nav className="tabbar" aria-label="Navigation">
      {tabs.map((t) => {
        const on = pathname === t.href || pathname.startsWith(t.href + '/');
        return (
          <Link key={t.href} href={t.href} className={`tab${on ? ' on' : ''}`} aria-current={on ? 'page' : undefined}>
            <Icon name={t.icon} />
            <span>{t.label}</span>
            {t.href === '/admin' && pending > 0 && <b className="badge">{pending}</b>}
          </Link>
        );
      })}
    </nav>
  );
}
