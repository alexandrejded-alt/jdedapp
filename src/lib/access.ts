import type { AccountRole, AccountStatus } from './types';

/**
 * Règle d'accès unique, utilisée par le middleware (côté serveur).
 * Renvoie l'adresse vers laquelle rediriger, ou null si la page est autorisée.
 *
 *  - pas connecté            -> seulement /login (et le retour des mails)
 *  - connecté, "pending"     -> seulement /attente
 *  - connecté, "refused"     -> seulement /refuse
 *  - connecté, "approved"    -> l'app ; /admin seulement si role = admin
 *
 * Le vrai verrou reste la base de données (RLS) : ceci empêche juste d'afficher
 * des pages à ceux qui n'y ont pas droit.
 */
export type AccessProfile = { status: AccountStatus; role: AccountRole } | null;

const ALWAYS_OPEN_WHEN_SIGNED_IN = ['/auth/callback', '/auth/reset'];

export function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

export function decideRoute(rawPath: string, signedIn: boolean, profile: AccessProfile): string | null {
  const path = normalizePath(rawPath);

  if (!signedIn) {
    if (path === '/login' || path === '/auth/callback') return null;
    return '/login';
  }

  if (ALWAYS_OPEN_WHEN_SIGNED_IN.includes(path)) return null;

  // Connecté mais sans profil lisible : on le traite comme "en attente".
  const status: AccountStatus = profile?.status ?? 'pending';

  if (status === 'pending') return path === '/attente' ? null : '/attente';
  if (status === 'refused') return path === '/refuse' ? null : '/refuse';

  // approved
  if (path === '/' || path === '/login' || path === '/attente' || path === '/refuse') return '/cut';
  if (path === '/admin' || path.startsWith('/admin/')) {
    return profile?.role === 'admin' ? null : '/cut';
  }
  return null;
}
