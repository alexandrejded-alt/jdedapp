import { ShowtimeView } from '@/components/ShowtimeView';
import { createClient } from '@/lib/supabase/server';

export default async function ShowtimePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return <ShowtimeView userId={user?.id ?? ''} />;
}
