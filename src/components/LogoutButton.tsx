'use client';

import { createClient } from '@/lib/supabase/client';

/** Déconnexion. `variant="link"` = petit lien dans l'en-tête, `variant="button"` = bouton large. */
export function LogoutButton({ variant = 'link' }: { variant?: 'link' | 'button' }) {
  async function logout() {
    await createClient().auth.signOut();
    window.location.href = '/login';
  }
  if (variant === 'button') {
    return (
      <button type="button" className="btn btn-ghost btn-block" onClick={logout}>
        Me déconnecter
      </button>
    );
  }
  return (
    <button type="button" className="linkbtn" onClick={logout}>
      Déconnexion
    </button>
  );
}
