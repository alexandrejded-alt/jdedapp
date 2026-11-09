import type { ReactNode } from 'react';
import { ProfileAvatar } from './ProfileAvatar';

export type TopBandUser = { userId: string; name: string; avatarPath: string | null; isAdmin: boolean };

/**
 * En-tête de chaque écran : photo de profil et nom de l'app.
 * Connecté, la photo est celle de la personne (on peut la changer en appuyant dessus).
 * Sur les pages d'accueil et d'attente, c'est la photo JDED, sans bouton.
 */
export function TopBand({ hello, action, user }: { hello?: string; action?: ReactNode; user?: TopBandUser }) {
  return (
    <header className="top">
      <div className="pad">
        <div className="idrow">
          {user ? (
            <ProfileAvatar userId={user.userId} name={user.name} avatarPath={user.avatarPath} isAdmin={user.isAdmin} />
          ) : (
            <div className="avatar" role="img" aria-label="JDED">
              <span className="avatar-brand" />
            </div>
          )}
          <div className="idtext">
            <div className="brand">JDED APP</div>
            {hello && <div className="hello">{hello}</div>}
          </div>
          {action}
        </div>
      </div>
    </header>
  );
}
