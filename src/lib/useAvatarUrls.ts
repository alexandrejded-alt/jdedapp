'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Entry = { url: string; until: number };
const cache = new Map<string, Entry>();
const TTL = 3600; // secondes
const KEEP = 50 * 60 * 1000; // on réutilise un lien pendant 50 min

/**
 * Liens temporaires vers les photos de profil (le dossier est privé).
 * Une seule requête pour toute la liste, puis un cache en mémoire.
 */
export function useAvatarUrls(paths: (string | null | undefined)[]): Record<string, string> {
  const supabase = useMemo(() => createClient(), []);
  const wanted = useMemo(() => [...new Set(paths.filter((p): p is string => !!p))].sort(), [paths]);
  const key = wanted.join('|');
  const [urls, setUrls] = useState<Record<string, string>>(() => fromCache(wanted));

  useEffect(() => {
    let alive = true;
    const missing = wanted.filter((p) => !(cache.get(p) && cache.get(p)!.until > Date.now()));
    if (missing.length === 0) {
      setUrls(fromCache(wanted));
      return;
    }
    void (async () => {
      const { data } = await supabase.storage.from('avatars').createSignedUrls(missing, TTL);
      for (const d of data ?? []) {
        if (d.path && d.signedUrl) cache.set(d.path, { url: d.signedUrl, until: Date.now() + KEEP });
      }
      if (alive) setUrls(fromCache(wanted));
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, supabase]);

  return urls;
}

function fromCache(paths: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of paths) {
    const e = cache.get(p);
    if (e && e.until > Date.now()) out[p] = e.url;
  }
  return out;
}
