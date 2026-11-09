import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { decideRoute, type AccessProfile } from '@/lib/access';
import { supabaseEnv } from '@/lib/env';

/**
 * Garde d'entrée du site, exécutée côté serveur avant chaque page.
 * 1. Renouvelle la session de connexion (le client reste connecté).
 * 2. Lit le statut du compte (pending / approved / refused) et le rôle.
 * 3. Redirige vers la bonne page (voir lib/access.ts).
 */
export async function middleware(request: NextRequest) {
  const { url, anonKey } = supabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: AccessProfile = null;
  if (user) {
    const { data } = await supabase.from('profiles').select('status, role').eq('id', user.id).maybeSingle();
    if (data) profile = { status: data.status, role: data.role };
  }

  const target = decideRoute(request.nextUrl.pathname, !!user, profile);
  if (target) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = target;
    redirectUrl.search = '';
    const redirect = NextResponse.redirect(redirectUrl);
    // On garde les cookies de session renouvelés.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    // Tout sauf les fichiers statiques (images, icônes, scripts Next).
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
