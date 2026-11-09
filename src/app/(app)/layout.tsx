import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { LogoutButton } from '@/components/LogoutButton';
import { TabBar } from '@/components/TabBar';
import { TopBand } from '@/components/TopBand';
import { createClient } from '@/lib/supabase/server';

/**
 * Cadre de l'app pour les comptes validés : bannière, contenu, onglets du bas.
 * Le middleware filtre déjà, mais on revérifie ici côté serveur (double sécurité).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, status, role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || profile.status === 'pending') redirect('/attente');
  if (profile.status === 'refused') redirect('/refuse');

  const isAdmin = profile.role === 'admin';

  return (
    <div className="shell">
      <TopBand hello={isAdmin ? 'Espace admin' : `Salut ${profile.first_name}`} action={<LogoutButton />} />
      <main className="pad">{children}</main>
      <TabBar isAdmin={isAdmin} />
    </div>
  );
}
