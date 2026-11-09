'use client';

import { useEffect, useRef, useState } from 'react';
import { addDays, dayLong, fromMinutes, monthLabel, toMinutes, todayParis } from '@/lib/time';
import { BottomSheet } from './Sheets';
import { Icon } from './Icons';

const pad2 = (n: number) => String(n).padStart(2, '0');

/* ------------------------------------------------------------------ */
/* Calendrier                                                          */
/* ------------------------------------------------------------------ */

function CalendarSheet({
  value,
  min,
  optional,
  onPick,
  onClose,
}: {
  value: string;
  min?: string;
  optional?: boolean;
  onPick: (v: string) => void;
  onClose: () => void;
}) {
  const today = todayParis();
  const base = value || today;
  const [year, setYear] = useState(parseInt(base.slice(0, 4), 10));
  const [month, setMonth] = useState(parseInt(base.slice(5, 7), 10) - 1);

  const lead = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const minDate = min ?? '';
  const atMin =
    !!minDate &&
    (year < parseInt(minDate.slice(0, 4), 10) ||
      (year === parseInt(minDate.slice(0, 4), 10) && month <= parseInt(minDate.slice(5, 7), 10) - 1));

  function go(delta: number) {
    const d = new Date(Date.UTC(year, month + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth());
  }

  return (
    <BottomSheet label="Choisir une date" onClose={onClose} className="picker">
      <div style={{ display: 'grid', gap: 10 }}>
        <div className="cal-head">
          <button type="button" className="cal-nav" onClick={() => go(-1)} disabled={atMin} aria-label="Mois précédent">
            ‹
          </button>
          <div className="cal-title">{monthLabel(year, month)}</div>
          <button type="button" className="cal-nav" onClick={() => go(1)} aria-label="Mois suivant">
            ›
          </button>
        </div>
        <div className="cal-dow">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="cal-grid">
          {Array.from({ length: lead }, (_, i) => (
            <span key={`b${i}`} className="cal-blank" />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const ds = `${year}-${pad2(month + 1)}-${pad2(i + 1)}`;
            const off = !!minDate && ds < minDate && ds !== value;
            return (
              <button
                key={ds}
                type="button"
                className={`cal-day${ds === today ? ' today' : ''}${ds === value ? ' sel' : ''}`}
                disabled={off}
                onClick={() => onPick(ds)}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <div className="pk-actions">
          <button type="button" className="btn btn-ghost" onClick={() => onPick(today > minDate ? today : minDate || today)}>
            Aujourd&apos;hui
          </button>
          {optional ? (
            <button type="button" className="btn btn-ghost" onClick={() => onPick('')}>
              Effacer
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Fermer
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

export function DateField({
  id,
  value,
  onChange,
  min,
  placeholder = 'Choisir un jour',
  optional,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  placeholder?: string;
  optional?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" id={id} className="input pick" onClick={() => setOpen(true)}>
        <span className={`pv${value ? '' : ' ph'}`}>{value ? dayLong(value) : placeholder}</span>
        <Icon name="cal" />
      </button>
      {open && (
        <CalendarSheet
          value={value}
          min={min}
          optional={optional}
          onPick={(v) => {
            onChange(v);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Heure : deux molettes (heures, quarts d'heure)                      */
/* ------------------------------------------------------------------ */

const ROW = 44;
const HOURS = Array.from({ length: 24 }, (_, i) => pad2(i));
const MINUTES = ['00', '15', '30', '45'];

function Wheel({
  items,
  index,
  onIndex,
  label,
}: {
  items: string[];
  index: number;
  onIndex: (i: number) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = index * ROW;
    // On positionne la molette une seule fois, à l'ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  function onScroll() {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ROW)));
      onIndex(i);
    });
  }

  return (
    <div className="wheel" ref={ref} role="listbox" aria-label={label} onScroll={onScroll}>
      {items.map((t, i) => (
        <div
          key={t}
          role="option"
          aria-selected={i === index}
          className={i === index ? 'sel' : ''}
          onClick={() => ref.current?.scrollTo({ top: i * ROW, behavior: 'smooth' })}
        >
          {t}
        </div>
      ))}
    </div>
  );
}

function TimeSheet({
  value,
  fallback,
  optional,
  onPick,
  onClose,
}: {
  value: string;
  fallback: string;
  optional?: boolean;
  onPick: (v: string) => void;
  onClose: () => void;
}) {
  const start = toMinutes(value || fallback);
  const [h, setH] = useState(Math.floor(start / 60));
  const [q, setQ] = useState(Math.min(3, Math.round((start % 60) / 15)));

  return (
    <BottomSheet label="Choisir une heure" onClose={onClose} className="picker">
      <div className="eyebrow">Heure</div>
      <div className="wheels">
        <Wheel items={HOURS} index={h} onIndex={setH} label="Heures" />
        <div className="wheel-sep">:</div>
        <Wheel items={MINUTES} index={q} onIndex={setQ} label="Minutes" />
      </div>
      <div className="pk-actions">
        <button type="button" className="btn btn-primary" onClick={() => onPick(fromMinutes(h * 60 + q * 15))}>
          Valider
        </button>
        {optional ? (
          <button type="button" className="btn btn-ghost" onClick={() => onPick('')}>
            Effacer
          </button>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
        )}
      </div>
    </BottomSheet>
  );
}

export function TimeField({
  id,
  value,
  onChange,
  fallback = '10:00',
  placeholder = 'Heure',
  optional,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  /** Heure proposée à l'ouverture quand le champ est vide. */
  fallback?: string;
  placeholder?: string;
  optional?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" id={id} className="input pick" onClick={() => setOpen(true)}>
        <span className={`pv${value ? '' : ' ph'}`}>{value || placeholder}</span>
        <Icon name="clock" />
      </button>
      {open && (
        <TimeSheet
          value={value}
          fallback={fallback}
          optional={optional}
          onPick={(v) => {
            onChange(v);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export { addDays };
