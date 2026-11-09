import { initials } from '@/lib/avatar';

/** Petite photo ronde d'un client (ou ses initiales s'il n'en a pas). */
export function PersonAvatar({ name, url }: { name: string; url?: string | null }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="p-avatar" src={url} alt="" loading="lazy" />
  ) : (
    <span className="p-avatar p-avatar-initials" aria-hidden="true">
      {initials(name)}
    </span>
  );
}
