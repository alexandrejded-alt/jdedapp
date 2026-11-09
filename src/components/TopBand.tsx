import type { ReactNode } from 'react';

/** Bannière JDED, photo de profil et nom de l'app, en haut de chaque écran. */
export function TopBand({ hello, action }: { hello?: string; action?: ReactNode }) {
  return (
    <header className="top">
      <div className="banner" role="img" aria-label="JDED" />
      <div className="pad">
        <div className="idrow">
          <div className="avatar" role="img" aria-label="Photo de JDED" />
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
