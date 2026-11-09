'use client';

import { useCallback, useMemo, useState } from 'react';
import { friendlyError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/client';
import { dateParis, dayLong, hhmm, timeParis, todayParis } from '@/lib/time';
import { fullName, type PersonName } from '@/lib/types';
import { useRealtimeRefresh } from '@/lib/useRealtimeRefresh';
import { ConfirmButton } from '../ui/ConfirmButton';
import { Icon } from '../ui/Icons';
import { useToast } from '../ui/Toast';

type BookingRow = { id: string; start_at: string; who: PersonName };
type EventSeats = {
  id: string;
  title: string;
  date: string;
  start_time: string;
  capacity: number;
  seats: { id: string; who: PersonName }[];
};

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

/** Réservations : qui a pris quelle coupe, et qui est inscrit à chaque évènement. */
export function BookingsPanel() {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [events, setEvents] = useState<EventSeats[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const nowIso = new Date().toISOString();
    const [b, e] = await Promise.all([
      supabase
        .from('bookings')
        .select('id, slots!inner(start_at), profiles(first_name, last_name, email)')
        .gt('slots.start_at', nowIso),
      supabase
        .from('events')
        .select('id, title, date, start_time, capacity, event_seats(id, profiles(first_name, last_name, email))')
        .gte('date', todayParis())
        .order('date')
        .order('start_time'),
    ]);
    if (b.error || e.error) {
      toast(friendlyError(b.error ?? e.error), true);
      setLoaded(true);
      return;
    }
    const rows: BookingRow[] = (b.data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      start_at: one(r.slots as { start_at: string } | { start_at: string }[])?.start_at ?? '',
      who: one(r.profiles as PersonName | PersonName[]),
    }));
    rows.sort((x, y) => (x.start_at < y.start_at ? -1 : 1));
    setBookings(rows);
    setEvents(
      (e.data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        title: r.title as string,
        date: r.date as string,
        start_time: r.start_time as string,
        capacity: r.capacity as number,
        seats: ((r.event_seats ?? []) as Record<string, unknown>[]).map((s) => ({
          id: s.id as string,
          who: one(s.profiles as PersonName | PersonName[]),
        })),
      })),
    );
    setLoaded(true);
  }, [supabase, toast]);

  useRealtimeRefresh(['bookings', 'event_seats', 'events', 'slots'], load);

  async function removeBooking(id: string) {
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    toast(error ? friendlyError(error) : 'Coupe annulée. Le créneau est libre.', !!error);
    await load();
  }
  async function removeSeat(id: string) {
    const { error } = await supabase.from('event_seats').delete().eq('id', id);
    toast(error ? friendlyError(error) : 'Inscription retirée.', !!error);
    await load();
  }

  const byDay = new Map<string, BookingRow[]>();
  for (const b of bookings) {
    const d = dateParis(b.start_at);
    byDay.set(d, [...(byDay.get(d) ?? []), b]);
  }

  return (
    <>
      <div className="view-head">
        <div className="eyebrow">À venir</div>
        <h1>Réservations</h1>
        <p>Les coupes prises et les inscrits à tes évènements.</p>
      </div>

      <div className="sub-title">
        Coupes réservées <em>{bookings.length}</em>
      </div>
      {loaded && bookings.length === 0 ? (
        <div className="empty">
          <b>Aucune coupe réservée</b>
          <span>Les réservations apparaissent ici dès qu&apos;un client prend un créneau.</span>
        </div>
      ) : (
        [...byDay.entries()].map(([d, list]) => (
          <div className="list" key={d}>
            <div className="day-title" style={{ fontSize: 19 }}>
              {dayLong(d)}
            </div>
            {list.map((b) => (
              <div className="slot-row" key={b.id}>
                <span className="t">{timeParis(b.start_at)}</span>
                <span className="s busy">
                  {fullName(b.who)}
                  {b.who?.email && <span className="row-sub"> {b.who.email}</span>}
                </span>
                <ConfirmButton label="Annuler la coupe" armedLabel="Confirmer" onConfirm={() => removeBooking(b.id)} />
              </div>
            ))}
          </div>
        ))
      )}

      <div className="sub-title" style={{ marginTop: 10 }}>
        Inscrits aux évènements
      </div>
      {loaded && events.length === 0 ? (
        <div className="empty">
          <b>Aucun évènement à venir</b>
          <span>Crée-en un dans la section Évènements.</span>
        </div>
      ) : (
        <div className="list">
          {events.map((ev) => (
            <div className="row" key={ev.id}>
              <div className="row-main">
                <div>
                  <div className="row-name">{ev.title}</div>
                  <div className="row-sub">
                    {dayLong(ev.date)} à {hhmm(ev.start_time)}
                  </div>
                </div>
                <div className="status-mini ok">
                  {ev.seats.length} / {ev.capacity}
                </div>
              </div>
              {ev.seats.length === 0 ? (
                <div className="row-sub">Personne d&apos;inscrit.</div>
              ) : (
                <div className="attendees">
                  {ev.seats.map((s) => (
                    <span className="pill" key={s.id}>
                      {fullName(s.who)}
                      <ConfirmButton
                        label={<Icon name="x" />}
                        armedLabel="Retirer ?"
                        className="pillx"
                        armedClassName="pillx armed"
                        ariaLabel={`Retirer ${fullName(s.who)}`}
                        onConfirm={() => removeSeat(s.id)}
                      />
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
