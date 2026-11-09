import { TopBand } from '@/components/TopBand';
import { WaitScreen } from '@/components/WaitScreen';
import { createClient } from '@/lib/supabase/server';

export default async function WaitingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('first_name, last_name, email').eq('id', user.id).maybeSingle()
    : { data: null };
  const name = profile ? `${profile.first_name} ${profile.last_name}`.trim() : '';

  return (
    <div className="shell">
      <TopBand />
      <WaitScreen userId={user?.id ?? ''} name={name} email={profile?.email ?? user?.email ?? ''} />
    </div>
  );
}
