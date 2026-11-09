'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSlideDir } from '@/lib/useSlideDir';
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
  const index = SECTIONS.findIndex((s) => s.id === section);
  const dir = useSlideDir(index);

  const segRef = useRef<HTMLDivElement>(null);
  const [moving, setMoving] = useState(false);

  // Le carré orange se place sur le bouton choisi (mesuré, donc juste quelle que soit la mise en page).
  useLayoutEffect(() => {
    const seg = segRef.current;
    if (!seg) return;
    const place = () => {
      const btn = seg.querySelector<HTMLElement>('button.on');
      if (!btn) return;
      seg.style.setProperty('--gx', `${btn.offsetLeft}px`);
      seg.style.setProperty('--gy', `${btn.offsetTop}px`);
      seg.style.setProperty('--gw', `${btn.offsetWidth}px`);
      seg.style.setProperty('--gh', `${btn.offsetHeight}px`);
    };
    place();
    const ro = new ResizeObserver(() => {
      // Pas d'animation quand c'est la fenêtre qui change de taille.
      seg.removeAttribute('data-ready');
      place();
      requestAnimationFrame(() => seg.setAttribute('data-ready', ''));
    });
    ro.observe(seg);
    const raf = requestAnimationFrame(() => seg.setAttribute('data-ready', ''));
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [section]);

  useEffect(() => {
    if (dir === '') return;
    setMoving(true);
    const id = window.setTimeout(() => setMoving(false), 320);
    return () => window.clearTimeout(id);
  }, [section, dir]);

  return (
    <section className="panel">
      <div className="seg" role="tablist" aria-label="Sections admin" ref={segRef}>
        <span className={`seg-glass${moving ? ' moving' : ''}`} aria-hidden="true" />
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

      <div key={section} className={`view-enter panel${dir ? ` sect-${dir}` : ''}`}>
        {section === 'req' && <RequestsPanel />}
        {section === 'res' && <BookingsPanel />}
        {section === 'slots' && <SlotsPanel />}
        {section === 'events' && <EventsPanel />}
      </div>
    </section>
  );
}
