/** Transforme les erreurs de Supabase en phrases claires, en français. */
type AnyErr = { message?: string; code?: string } | null | undefined;

const text = (e: unknown): string => {
  const x = e as AnyErr;
  return (x && x.message ? x.message : String(e ?? '')).toLowerCase();
};

export function friendlyError(e: unknown): string {
  const m = text(e);
  if (m.includes('slot_taken')) return "Ce créneau vient d'être pris. Choisis-en un autre.";
  if (m.includes('already_booked')) return 'Tu as déjà une coupe de prévue. Annule-la avant d\'en prendre une autre.';
  if (m.includes('slot_past')) return 'Ce créneau est déjà passé.';
  if (m.includes('slot_not_found')) return "Ce créneau n'existe plus.";
  if (m.includes('event_full')) return 'Complet, la dernière place vient de partir.';
  if (m.includes('already_reserved')) return 'Tu as déjà ta place.';
  if (m.includes('event_past')) return 'Cet évènement est déjà passé.';
  if (m.includes('event_not_found')) return "Cet évènement n'existe plus.";
  if (m.includes('not_allowed') || m.includes('row-level security') || m.includes('permission denied'))
    return "Action refusée. Ton accès n'est peut-être pas encore validé.";
  if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('load failed'))
    return 'Pas de connexion internet.';
  if (m.includes('duplicate key')) return 'Ça existe déjà.';
  return 'Une erreur est survenue, réessaie.';
}

export function authError(e: unknown): string {
  const m = text(e);
  if (m.includes('invalid login credentials')) return 'E-mail ou mot de passe incorrect.';
  if (m.includes('email not confirmed')) return "Ton adresse e-mail n'est pas encore confirmée. Ouvre le mail reçu.";
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Cette adresse a déjà un compte. Passe sur « Se connecter ».';
  if (m.includes('rate limit') || m.includes('too many') || m.includes('seconds'))
    return 'Trop de tentatives. Patiente quelques minutes.';
  if (m.includes('should be different')) return "Choisis un mot de passe différent de l'ancien.";
  if (m.includes('password') && (m.includes('least') || m.includes('weak')))
    return 'Mot de passe trop faible : 8 caractères minimum, avec une lettre et un chiffre.';
  if (m.includes('invalid') && m.includes('email')) return 'Cette adresse e-mail ne semble pas valide.';
  if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('load failed'))
    return 'Pas de connexion internet.';
  return 'Une erreur est survenue, réessaie.';
}

/** Règles minimales du mot de passe : 8 caractères, une lettre, un chiffre. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'Mot de passe : 8 caractères minimum.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Mot de passe : il faut au moins une lettre et un chiffre.';
  return null;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
