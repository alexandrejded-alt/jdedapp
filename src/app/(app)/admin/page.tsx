import { redirect } from 'next/navigation';
import { AdminView } from '@/components/admin/AdminView';
import { createClient } from '@/lib/supabase/server';

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role, status').eq('id', user.id).maybeSingle();
  // Double sécurité : le middleware bloque déjà, et la base refuse de toute façon.
  if (!profile || profile.status !== 'approved' || profile.role !== 'admin') redirect('/cut');
  return <AdminView />;
}
