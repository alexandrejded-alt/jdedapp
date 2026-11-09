import { CutView } from '@/components/CutView';
import { createClient } from '@/lib/supabase/server';

export default async function CutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('first_name, avatar_path').eq('id', user.id).single()
    : { data: null };
  return <CutView userId={user?.id ?? ''} guestName={profile?.first_name || 'TOI'} avatarPath={profile?.avatar_path ?? null} />;
}
