import { CutView } from '@/components/CutView';
import { createClient } from '@/lib/supabase/server';

export default async function CutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return <CutView userId={user?.id ?? ''} />;
}
