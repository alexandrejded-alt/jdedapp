import { createBrowserClient } from '@supabase/ssr';
import { supabaseEnv } from '../env';

let client: ReturnType<typeof createBrowserClient> | null = null;

/** Connexion Supabase côté navigateur (une seule instance). La session reste ouverte et se renouvelle toute seule. */
export function createClient() {
  if (!client) {
    const { url, anonKey } = supabaseEnv();
    client = createBrowserClient(url, anonKey);
  }
  return client;
}
