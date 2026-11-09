import type { ReactNode } from 'react';

/** Se rejoue à chaque changement d'onglet : petit fondu de 0,2 s. */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="view-enter">{children}</div>;
}
