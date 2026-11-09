'use client';

import { useState } from 'react';
import { usePendingCount } from '../TabBar';
import { BookingsPanel } from './BookingsPanel';
import { EventsPanel } from './EventsPanel';
import { RequestsPanel } from './RequestsPanel';
import { SlotsPanel } from './SlotsPanel';

type Section = 'req' | 'res' | 'slots' | 'events';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'req', label: 'Demandes' },
  { id: 'res', label: 'Réservations' },
  { id: 'slots', label: 'Créneaux' },
  { id: 'events', label: 'Évènements' },
];

/** Espace de JDED : quatre sections, un sélecteur en haut. */
export function AdminView() {
  const [section, setSection] = useState<Section>('req');
  const pending = usePendingCount(true);

  return (
    <section className="panel">
      <div className="seg" role="tablist" aria-label="Sections admin">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={section === s.id}
            className={section === s.id ? 'on' : ''}
            onClick={() => setSection(s.id)}
          >
            {s.label}
            {s.id === 'req' && pending > 0 && <b className="badge">{pending}</b>}
          </button>
        ))}
      </div>

      <div key={section} className="view-enter panel">
        {section === 'req' && <RequestsPanel />}
        {section === 'res' && <BookingsPanel />}
        {section === 'slots' && <SlotsPanel />}
        {section === 'events' && <EventsPanel />}
      </div>
    </section>
  );
}
