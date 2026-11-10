'use client';

import { useCallback, useMemo, useState } from 'react';
import { friendlyError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/client';
import { dateParis, dayLong, dayParts, timeParis } from '@/lib/time';
import type { Slot } from '@/lib/types';
import { useAvatarUrls } from '@/lib/useAvatarUrls';
import { useRealtimeRefresh } from '@/lib/useRealtimeRefresh';
import { play } from '@/lib/sound';
import { FlameIcon } from './ui/Icons';
import { useSlideDir } from '@/lib/useSlideDir';
import { ConfirmButton } from './ui/ConfirmButton';
import { ConfirmSheet } from './ui/Sheets';
import { VOLCANO_JOURNEY_EVENT } from './VolcanoJourney';
import { useToast } from './ui/Toast';

type MyBooking = { id: string; start_at: string };

/** Onglet Cut : le client choisit un jour, puis une heure, et confirme. */
export function CutView({ userId, guestName, avatarPath }: { userId: string; guestName: string; avatarPath: string | null }) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const avatarPaths = useMemo(() => [avatarPath], [avatarPath]);
  const avatarUrls = useAvatarUrls(avatarPaths);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [mine, setMine] = useState<MyBooking | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [picked, setPicked] = useState<Slot | null>(null);

  const load = useCallback(async () => {
    const nowIso = new Date().toISOString();
    const [s, b] = await Promise.all([
      supabase.from('slots').select('id, start_at, end_at, is_booked').gt('start_at', nowIso).order('start_at'),
      supabase.from('bookings').select('id, slots!inner(start_at)').eq('user_id', userId).gt('slots.start_at', nowIso),
    ]);
    if (s.error || b.error) {
      toast(friendlyError(s.error ?? b.error), true);
      setLoaded(true);
      return;
    }
    setSlots((s.data ?? []) as Slot[]);
    const row = (b.data ?? [])[0] as { id: string; slots: { start_at: string } | { start_at: string }[] } | undefined;
    if (row) {
      const sl = Array.isArray(row.slots) ? row.slots[0] : row.slots;
      setMine({ id: row.id, start_at: sl.start_at });
    } else {
      setMine(null);
    }
    setLoaded(true);
  }, [supabase, userId, toast]);

  useRealtimeRefresh(['slots', 'bookings'], load);

  const free = useMemo(() => slots.filter((s) => !s.is_booked), [slots]);
  const byDay = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of free) {
      const d = dateParis(s.start_at);
      m.set(d, [...(m.get(d) ?? []), s]);
    }
    return m;
  }, [free]);
  const days = useMemo(() => [...byDay.keys()].sort(), [byDay]);
  const activeDay = day && byDay.has(day) ? day : (days[0] ?? null);
  const dayDir = useSlideDir(activeDay ? days.indexOf(activeDay) : 0);

  async function book(slot: Slot) {
    const { error } = await supabase.rpc('book_slot', { p_slot_id: slot.id });
    if (error) toast(friendlyError(error), true);
    else {
      window.dispatchEvent(new CustomEvent(VOLCANO_JOURNEY_EVENT, {
        detail: { name: guestName, avatarUrl: avatarPath ? avatarUrls[avatarPath] : null },
      }));
      play('confirme', 0.8);
      toast('C\'est réservé !');
    }
    await load();
  }

  async function cancel() {
    if (!mine) return;
    const { error } = await supabase.from('bookings').delete().eq('id', mine.id);
    if (error) toast(friendlyError(error), true);
    else toast('Coupe annulée. Le créneau est de nouveau libre.');
    await load();
  }

  return (
    <section className="cut-view">
      <div className="view-head">
        <div className="eyebrow">Réserver</div>
        <h1 className="cut-word">Cut</h1>
        <p>Choisis ton jour, puis ton heure.</p>
      </div>

      <div style={{ display: 'grid', gap: 18, marginTop: 20 }}>
        {mine && (
          <div className="mine">
            <div className="eyebrow">Ta coupe</div>
            <div className="mine-row">
              <div className="mine-when">{dayLong(dateParis(mine.start_at))}</div>
              <div className="mine-time">{timeParis(mine.start_at)}</div>
            </div>
            <ConfirmButton
              label="Annuler ma coupe"
              armedLabel="Confirmer l'annulation"
              className="btn btn-sm btn-ghost"
              onConfirm={cancel}
            />
          </div>
        )}

        {loaded && mine && <p className="hint">Une coupe à la fois. Annule celle-ci si tu veux changer d&apos;heure.</p>}

        {loaded && !mine && days.length === 0 && (
          <div className="empty">
            <FlameIcon />
            <b>Aucun créneau pour le moment</b>
            <span>JDED ajoute ses disponibilités ici. Repasse bientôt.</span>
          </div>
        )}

        {loaded && !mine && days.length > 0 && activeDay && (
          <>
            <div className="days" role="tablist" aria-label="Jours">
              {days.map((d) => {
                const p = dayParts(d);
                const n = byDay.get(d)?.length ?? 0;
                return (
                  <button
                    key={d}
                    type="button"
                    role="tab"
                    aria-selected={d === activeDay}
                    className={`chip${d === activeDay ? ' on' : ''}`}
                    onClick={() => setDay(d)}
                  >
                    <span className="wd">{p.wd}</span>
                    <span className="dn">{p.dn}</span>
                    <span className="mo">{p.mo}</span>
                    <span className="ct">{n} dispo</span>
                  </button>
                );
              })}
            </div>
            <div key={activeDay} className={`day-pane${dayDir ? ` pane-${dayDir}` : ''}`}>
              <div className="day-title">{dayLong(activeDay)}</div>
              <div className="times">
                {(byDay.get(activeDay) ?? []).map((s) => (
                  <button key={s.id} type="button" className="time free" onClick={() => setPicked(s)}>
                    {timeParis(s.start_at)}
                    <small>Libre</small>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {picked && (
        <ConfirmSheet
          eyebrow="Ta coupe"
          title="Confirmer ce créneau ?"
          detail={`${dayLong(dateParis(picked.start_at))} à ${timeParis(picked.start_at)}`}
          note="Il est à toi dès que tu confirmes. Les autres ne le voient plus."
          okLabel="Confirmer ma coupe"
          busyLabel="Réservation…"
          onConfirm={() => book(picked)}
          onClose={() => setPicked(null)}
        />
      )}
    </section>
  );
}
