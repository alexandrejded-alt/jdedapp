'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type CSSProperties, type MouseEvent } from 'react';
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

/**
 * Barre d'onglets en bas : Cut, Showtime et (pour JDED seulement) Admin.
 * Le carré de verre glisse d'un onglet à l'autre (avec un petit effet ressort),
 * et la page sort puis entre du bon côté, selon le sens du changement.
 */
export function TabBar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const pending = usePendingCount(isAdmin);

  const tabs: { href: string; label: string; icon: IconName }[] = [
    { href: '/cut', label: 'Cut', icon: 'cut' },
    { href: '/showtime', label: 'Showtime', icon: 'show' },
  ];
  if (isAdmin) tabs.push({ href: '/admin', label: 'Admin', icon: 'admin' });

  const current = Math.max(
    0,
    tabs.findIndex((t) => pathname === t.href || pathname.startsWith(t.href + '/')),
  );
  // On bouge le carré tout de suite, sans attendre que la page soit chargée.
  const [target, setTarget] = useState(current);
  const [moving, setMoving] = useState(false);
  useEffect(() => setTarget(current), [current]);

  function go(e: MouseEvent<HTMLAnchorElement>, index: number, href: string) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (index === target && index === current) return;
    e.preventDefault();
    const dir = index > current ? 1 : -1;
    const root = document.documentElement;
    root.dataset.dir = String(dir);
    document.querySelector('#page > .view-enter')?.setAttribute('data-leaving', '1');
    setTarget(index);
    setMoving(true);
    window.setTimeout(() => setMoving(false), 320);
    window.setTimeout(() => delete root.dataset.dir, 1100);
    try {
      navigator.vibrate?.(8);
    } catch {
      /* pas de vibration */
    }
    router.push(href);
  }

  return (
    <nav
      className="tabbar"
      aria-label="Navigation"
      data-moving={moving ? '1' : undefined}
      style={{ '--n': tabs.length, '--i': target } as CSSProperties}
    >
      <span className="tab-glass" aria-hidden="true" />
      {tabs.map((t, i) => {
        const on = i === target;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`tab${on ? ' on' : ''}`}
            aria-current={i === current ? 'page' : undefined}
            onClick={(e) => go(e, i, t.href)}
          >
            <Icon name={t.icon} />
            <span>{t.label}</span>
            {t.href === '/admin' && pending > 0 && <b className="badge">{pending}</b>}
          </Link>
        );
      })}
    </nav>
  );
}
