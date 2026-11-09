'use client';

import { useCallback, useMemo, useState } from 'react';
import { friendlyError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/client';
import { dayLong, dayParts, hhmm, todayParis } from '@/lib/time';
import type { EventRow } from '@/lib/types';
import { useRealtimeRefresh } from '@/lib/useRealtimeRefresh';
import { FlameIcon, Icon } from './ui/Icons';
import { ConfirmButton } from './ui/ConfirmButton';
import { ConfirmSheet } from './ui/Sheets';
import { useEmbers } from './ui/Embers';
import { useToast } from './ui/Toast';

type MySeat = { id: string; event_id: string };

/** Onglet Showtime : évènements à venir, places restantes, réservation d'une place. */
export function ShowtimeView({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const burst = useEmbers();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [seats, setSeats] = useState<MySeat[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [picked, setPicked] = useState<EventRow | null>(null);

  const load = useCallback(async () => {
    const [e, s] = await Promise.all([
      supabase
        .from('events')
        .select('id, title, date, start_time, end_time, place, capacity, rules, seats_taken')
        .gte('date', todayParis())
        .order('date')
        .order('start_time'),
      supabase.from('event_seats').select('id, event_id').eq('user_id', userId),
    ]);
    if (e.error || s.error) {
      toast(friendlyError(e.error ?? s.error), true);
      setLoaded(true);
      return;
    }
    setEvents((e.data ?? []) as EventRow[]);
    setSeats((s.data ?? []) as MySeat[]);
    setLoaded(true);
  }, [supabase, userId, toast]);

  useRealtimeRefresh(['events', 'event_seats'], load);

  async function reserve(ev: EventRow) {
    const { error } = await supabase.rpc('reserve_event_seat', { p_event_id: ev.id });
    if (error) toast(friendlyError(error), true);
    else {
      burst(undefined, 'Bravo pour ta réservation');
      toast('Ta place est réservée.');
    }
    await load();
  }

  async function cancel(seat: MySeat) {
    const { error } = await supabase.from('event_seats').delete().eq('id', seat.id);
    if (error) toast(friendlyError(error), true);
    else toast('Place annulée.');
    await load();
  }

  return (
    <section>
      <div className="view-head">
        <div className="eyebrow">Évènements</div>
        <h1>Showtime</h1>
        <p>Prends ta place pour les prochains évènements.</p>
      </div>

      <div className="evs" style={{ marginTop: 20 }}>
        {loaded && events.length === 0 && (
          <div className="empty">
            <FlameIcon />
            <b>Pas d&apos;évènement prévu</b>
            <span>Les prochaines dates de JDED apparaissent ici, avec le nombre de places.</span>
          </div>
        )}

        {events.map((ev) => {
          const p = dayParts(ev.date);
          const left = Math.max(0, ev.capacity - ev.seats_taken);
          const mine = seats.find((s) => s.event_id === ev.id);
          const cls = left === 0 ? 'full' : left <= Math.max(3, Math.ceil(ev.capacity * 0.15)) ? 'low' : '';
          const label =
            left === 0
              ? 'Complet'
              : left === 1
                ? 'Dernière place'
                : cls === 'low'
                  ? `Presque complet, plus que ${left} places`
                  : `Il reste ${left} places sur ${ev.capacity}`;
          const pct = ev.capacity ? Math.min(100, Math.round((ev.seats_taken / ev.capacity) * 100)) : 100;

          return (
            <article className="ev" key={ev.id}>
              <div className="stub">
                <span className="mo">{p.mo}</span>
                <span className="dn">{p.dn}</span>
                <span className="wd">{p.wd}</span>
              </div>
              <div className="ev-main">
                <h3>{ev.title}</h3>
                <div className="meta">
                  <span>
                    <Icon name="clock" />
                    {hhmm(ev.start_time)}
                    {ev.end_time ? ` à ${hhmm(ev.end_time)}` : ''}
                  </span>
                  {ev.place && (
                    <span>
                      <Icon name="pin" />
                      {ev.place}
                    </span>
                  )}
                </div>
                <div className="meter" aria-hidden="true">
                  <i style={{ width: `${pct}%` }} />
                </div>
                <div className={`left ${cls}`}>{label}</div>
                {ev.rules && (
                  <details>
                    <summary>Consignes</summary>
                    <p className="rules">{ev.rules}</p>
                  </details>
                )}
                {mine ? (
                  <div className="reserved">
                    <span className="tag">
                      <Icon name="check" />
                      Ta place est réservée
                    </span>
                    <ConfirmButton
                      label="Annuler"
                      armedLabel="Confirmer"
                      className="btn btn-sm btn-ghost"
                      onConfirm={() => cancel(mine)}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    disabled={left === 0}
                    onClick={() => setPicked(ev)}
                  >
                    {left === 0 ? 'Complet' : 'Réserver ma place'}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {picked && (
        <ConfirmSheet
          eyebrow="Showtime"
          title="Réserver ta place ?"
          detail={`${picked.title}, ${dayLong(picked.date)} à ${hhmm(picked.start_time)}`}
          note={picked.rules ? 'Lis bien les consignes de l\'évènement.' : undefined}
          okLabel="Je prends ma place"
          busyLabel="Réservation…"
          onConfirm={() => reserve(picked)}
          onClose={() => setPicked(null)}
        />
      )}
    </section>
  );
}
