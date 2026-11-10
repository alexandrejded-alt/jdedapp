import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { LogoutButton } from '@/components/LogoutButton';
import { SoundToggle } from '@/components/SoundToggle';
import { TabBar } from '@/components/TabBar';
import { TopBand } from '@/components/TopBand';
import { EmberOnMount } from '@/components/ui/EmberOnMount';
import { createClient } from '@/lib/supabase/server';

/**
 * Cadre de l'app pour les comptes validés : en-tête, contenu, onglets du bas.
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
    .select('first_name, last_name, status, role, avatar_path')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || profile.status === 'pending') redirect('/attente');
  if (profile.status === 'refused') redirect('/refuse');

  const isAdmin = profile.role === 'admin';

  return (
    <div className="shell">
      <TopBand
        hello={isAdmin ? 'Espace admin' : `Salut ${profile.first_name}`}
        action={
          <>
            <SoundToggle />
            <LogoutButton />
          </>
        }
        user={{
          userId: user.id,
          name: `${profile.first_name} ${profile.last_name}`.trim(),
          avatarPath: profile.avatar_path ?? null,
          isAdmin,
        }}
      />
      <EmberOnMount flag="jded_ember_welcome" message="Bienvenue dans la jded family." />
      <main id="page" className="pad">{children}</main>
      <TabBar isAdmin={isAdmin} />
    </div>
  );
}
