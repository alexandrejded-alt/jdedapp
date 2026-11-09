import { AuthScreen } from '@/components/AuthScreen';
import { TopBand } from '@/components/TopBand';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const message =
    error === 'lien'
      ? "Ce lien n'a pas marché. Demande-en un nouveau, et ouvre-le dans le même navigateur que celui où tu as commencé."
      : '';
  return (
    <div className="shell">
      <TopBand />
      <AuthScreen initialError={message} />
    </div>
  );
}
