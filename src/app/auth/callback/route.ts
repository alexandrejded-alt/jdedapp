import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Retour des liens reçus par mail (confirmation d'adresse, mot de passe oublié).
 * Échange le code contre une session, puis renvoie vers la bonne page.
 */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=lien`);
}
