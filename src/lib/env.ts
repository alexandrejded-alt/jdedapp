/**
 * Lit les deux variables Supabase et dit clairement ce qui manque.
 * (Elles se règlent dans le fichier .env.local, ou dans Vercel.)
 */
export function supabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || url.includes('TON-PROJET') || anonKey === 'ta-cle-anon-ici') {
    throw new Error(
      'Configuration manquante : renseigne NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY (voir le README, étape 3).',
    );
  }
  return { url, anonKey };
}
