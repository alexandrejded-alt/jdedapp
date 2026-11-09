'use client';

import { useCallback, useMemo, useState } from 'react';
import { friendlyError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/client';
import {
  addDays,
  dateParis,
  dayLong,
  dayParts,
  fromMinutes,
  parisToIso,
  timeParis,
  toMinutes,
  todayParis,
  weekStart,
} from '@/lib/time';
import { fullName, type PersonName, type Slot } from '@/lib/types';
import { useAvatarUrls } from '@/lib/useAvatarUrls';
import { useRealtimeRefresh } from '@/lib/useRealtimeRefresh';
import { ConfirmButton } from '../ui/ConfirmButton';
import { Icon } from '../ui/Icons';
import { PersonAvatar } from '../ui/PersonAvatar';
import { TimeField } from '../ui/pickers';
import { useEmbers } from '../ui/Embers';
import { useToast } from '../ui/Toast';

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
const DURATIONS = [
  { v: '30', label: '30 min' },
  { v: '45', label: '45 min' },
  { v: '60', label: '1 h' },
  { v: '90', label: '1 h 30' },
];
type Generated = { date: string; start_at: string; end_at: string; time: string };

/** Créneaux : choisir des jours, des horaires, une durée. L'app découpe. */
export function SlotsPanel() {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const burst = useEmbers();
  const today = todayParis();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [who, setWho] = useState<Record<string, { id: string; who: PersonName }>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const [week, setWeek] = useState(weekStart(today));
  const [selected, setSelected] = useState<string[]>([]);
  const [from, setFrom] = useState('10:00');
  const [to, setTo] = useState('13:00');
  const [dur, setDur] = useState('45');

  const load = useCallback(async () => {
    const [s, b] = await Promise.all([
      supabase.from('slots').select('id, start_at, end_at, is_booked').gt('start_at', new Date().toISOString()).order('start_at'),
      supabase.from('bookings').select('id, slot_id, profiles(first_name, last_name, avatar_path)'),
    ]);
    if (s.error || b.error) {
      toast(friendlyError(s.error ?? b.error), true);
      setLoaded(true);
      return;
    }
    setSlots((s.data ?? []) as Slot[]);
    const map: Record<string, { id: string; who: PersonName }> = {};
    for (const r of (b.data ?? []) as Record<string, unknown>[]) {
      map[r.slot_id as string] = { id: r.id as string, who: one(r.profiles as PersonName | PersonName[]) };
    }
    setWho(map);
    setLoaded(true);
  }, [supabase, toast]);

  useRealtimeRefresh(['slots', 'bookings'], load);

  const avatarPaths = useMemo(() => Object.values(who).map((w) => w.who?.avatar_path), [who]);
  const avatars = useAvatarUrls(avatarPaths);

  const existing = useMemo(() => new Set(slots.map((s) => new Date(s.start_at).getTime())), [slots]);

  /** Les créneaux que donneraient les jours cochés et les horaires choisis. */
  const generated: Generated[] = useMemo(() => {
    const a = toMinutes(from);
    const b = toMinutes(to);
    const d = parseInt(dur, 10);
    const out: Generated[] = [];
    if (!(b > a)) return out;
    for (const date of [...selected].sort()) {
      for (let m = a; m + d <= b; m += d) {
        const t = fromMinutes(m);
        const start = parisToIso(date, t);
        if (new Date(start).getTime() <= Date.now()) continue;
        out.push({ date, time: t, start_at: start, end_at: parisToIso(date, fromMinutes(m + d)) });
      }
    }
    return out;
  }, [selected, from, to, dur]);

  const fresh = generated.filter((g) => !existing.has(new Date(g.start_at).getTime()));
  const dupes = generated.length - fresh.length;

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const toggle = (d: string) => setSelected((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  async function insert(rows: { start_at: string; end_at: string }[]): Promise<number | null> {
    const { data, error } = await supabase
      .from('slots')
      .upsert(rows, { onConflict: 'start_at', ignoreDuplicates: true })
      .select('id');
    if (error) {
      toast(friendlyError(error), true);
      return null;
    }
    return (data ?? []).length;
  }

  async function add() {
    if (fresh.length === 0) {
      toast(generated.length > 0 ? 'Ces créneaux existent déjà.' : 'Coche au moins un jour et vérifie les horaires.', true);
      return;
    }
    setBusy(true);
    const n = await insert(fresh.map((g) => ({ start_at: g.start_at, end_at: g.end_at })));
    setBusy(false);
    if (n !== null) {
      if (n > 0) burst();
      toast(`${n} créneau${n > 1 ? 'x' : ''} ajouté${n > 1 ? 's' : ''}.`);
      setSelected([]);
      await load();
    }
  }

  /** Recopie les créneaux de la semaine d'avant sur la semaine affichée. */
  async function duplicatePrevious() {
    const prev = addDays(week, -7);
    const prevEnd = addDays(week, -1);
    const source = slots.filter((s) => {
      const d = dateParis(s.start_at);
      return d >= prev && d <= prevEnd;
    });
    // La semaine précédente peut être dans le passé : on la relit en base.
    let list = source;
    if (list.length === 0) {
      const { data, error } = await supabase
        .from('slots')
        .select('id, start_at, end_at, is_booked')
        .gte('start_at', parisToIso(prev, '00:00'))
        .lt('start_at', parisToIso(week, '00:00'));
      if (error) return toast(friendlyError(error), true);
      list = (data ?? []) as Slot[];
    }
    const rows = list
      .map((s) => {
        const date = addDays(dateParis(s.start_at), 7);
        const startT = timeParis(s.start_at);
        const endT = timeParis(s.end_at);
        return { start_at: parisToIso(date, startT), end_at: parisToIso(date, endT) };
      })
      .filter((r) => new Date(r.start_at).getTime() > Date.now() && !existing.has(new Date(r.start_at).getTime()));
    if (list.length === 0) return toast('Pas de créneaux la semaine d\'avant.', true);
    if (rows.length === 0) return toast('Cette semaine a déjà tous ces créneaux.', true);
    setBusy(true);
    const n = await insert(rows);
    setBusy(false);
    if (n !== null) {
      toast(`${n} créneau${n > 1 ? 'x' : ''} copié${n > 1 ? 's' : ''} sur cette semaine.`);
      await load();
    }
  }

  async function removeSlot(s: Slot) {
    const { error } = await supabase.from('slots').delete().eq('id', s.id);
    toast(error ? friendlyError(error) : 'Créneau supprimé.', !!error);
    await load();
  }
  /** Supprime d'un coup tous les créneaux (à venir) d'une journée. */
  async function removeDay(day: string, list: Slot[]) {
    const { error } = await supabase.from('slots').delete().in('id', list.map((x) => x.id));
    toast(error ? friendlyError(error) : `Journée du ${dayLong(day)} supprimée.`, !!error);
    await load();
  }
  async function freeSlot(bookingId: string) {
    const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
    toast(error ? friendlyError(error) : 'Créneau libéré.', !!error);
    await load();
  }

  const byDay = new Map<string, Slot[]>();
  for (const s of slots) {
    const d = dateParis(s.start_at);
    byDay.set(d, [...(byDay.get(d) ?? []), s]);
  }

  const previewDays = [...new Set(generated.map((g) => g.date))];
  const weekLabel = `Semaine du ${dayParts(week).dn} ${dayParts(week).mo}`;

  return (
    <>
      <div className="view-head">
        <div className="eyebrow">Coupes</div>
        <h1>Créneaux</h1>
        <p>Coche tes jours, choisis tes horaires, l&apos;app découpe les créneaux.</p>
      </div>

      <div className="card">
        <h2>Ajouter des créneaux</h2>

        <div className="cal-head">
          <button type="button" className="cal-nav" onClick={() => setWeek(addDays(week, -7))} aria-label="Semaine précédente">
            ‹
          </button>
          <div className="cal-title" style={{ fontSize: 18 }}>
            {weekLabel}
          </div>
          <button type="button" className="cal-nav" onClick={() => setWeek(addDays(week, 7))} aria-label="Semaine suivante">
            ›
          </button>
        </div>

        <div className="days" role="group" aria-label="Jours à ouvrir" style={{ flexWrap: 'nowrap' }}>
          {weekDays.map((d) => {
            const p = dayParts(d);
            const on = selected.includes(d);
            const past = d < today;
            return (
              <button
                key={d}
                type="button"
                className={`chip${on ? ' on' : ''}`}
                aria-pressed={on}
                disabled={past}
                style={past ? { opacity: 0.35 } : undefined}
                onClick={() => toggle(d)}
              >
                <span className="wd">{p.wd}</span>
                <span className="dn">{p.dn}</span>
                <span className="mo">{p.mo}</span>
              </button>
            );
          })}
        </div>

        <div className="pk-actions">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setSelected(weekDays.filter((d, i) => i < 6 && d >= today))}
          >
            Lun à sam
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelected([])}>
            Tout décocher
          </button>
        </div>

        <div className="two">
          <div className="field">
            <label htmlFor="sl-from">De</label>
            <TimeField id="sl-from" value={from} onChange={setFrom} fallback="10:00" />
          </div>
          <div className="field">
            <label htmlFor="sl-to">À</label>
            <TimeField id="sl-to" value={to} onChange={setTo} fallback="13:00" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="sl-dur">Durée d&apos;une coupe</label>
          <select id="sl-dur" className="input" value={dur} onChange={(e) => setDur(e.target.value)}>
            {DURATIONS.map((d) => (
              <option key={d.v} value={d.v}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div className="hint" aria-live="polite">
          {generated.length === 0 ? (
            'Coche au moins un jour à venir et des horaires valides pour voir l\'aperçu.'
          ) : (
            <>
              <b>
                {fresh.length} créneau{fresh.length > 1 ? 'x' : ''}
              </b>{' '}
              sur {previewDays.length} jour{previewDays.length > 1 ? 's' : ''}
              {dupes > 0 ? ` (${dupes} existe${dupes > 1 ? 'nt' : ''} déjà, ignoré${dupes > 1 ? 's' : ''})` : ''}.
              {previewDays.map((d) => (
                <div key={d}>
                  {dayLong(d)} : {generated.filter((g) => g.date === d).map((g) => g.time).join(' · ')}
                </div>
              ))}
            </>
          )}
        </div>

        <button type="button" className="btn btn-primary btn-block" onClick={add} disabled={busy || fresh.length === 0}>
          {busy ? 'Un instant…' : 'Ajouter les créneaux'}
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={duplicatePrevious} disabled={busy}>
          Dupliquer la semaine précédente
        </button>
      </div>

      <div className="sub-title">
        Tes créneaux à venir <em>{slots.length}</em>
      </div>
      {loaded && byDay.size === 0 && (
        <div className="empty">
          <b>Aucun créneau</b>
          <span>Ajoute ta première journée juste au-dessus.</span>
        </div>
      )}
      {[...byDay.entries()].map(([d, list]) => (
        <div className="list" key={d}>
          <div className="day-head">
            <div className="day-title" style={{ fontSize: 19 }}>
              {dayLong(d)}
            </div>
            <ConfirmButton
              label="Supprimer la journée"
              armedLabel={
                list.some((x) => who[x.id])
                  ? `Confirmer : ${list.filter((x) => who[x.id]).length} coupe(s) réservée(s) seront annulées`
                  : `Confirmer : ${list.length} créneau${list.length > 1 ? 'x' : ''}`
              }
              ariaLabel={`Supprimer tous les créneaux du ${dayLong(d)}`}
              onConfirm={() => removeDay(d, list)}
            />
          </div>
          {list.map((s) => {
            const booking = who[s.id];
            const name = booking ? fullName(booking.who) : '';
            return (
              <div className="slot-row" key={s.id}>
                <span className="t">{timeParis(s.start_at)}</span>
                <span className={`s ${booking ? 'busy who' : 'free'}`}>
                  {booking ? (
                    <>
                      <PersonAvatar name={name} url={booking.who?.avatar_path ? avatars[booking.who.avatar_path] : null} />
                      <span className="who-text">{name}</span>
                    </>
                  ) : (
                    'Libre'
                  )}
                </span>
                {booking && (
                  <ConfirmButton
                    label="Libérer"
                    armedLabel="Confirmer"
                    className="btn btn-sm btn-ghost"
                    onConfirm={() => freeSlot(booking.id)}
                  />
                )}
                <ConfirmButton
                  label={<Icon name="x" />}
                  armedLabel={booking ? `Confirmer, la coupe de ${name} sera annulée` : 'Confirmer'}
                  ariaLabel={booking ? `Supprimer le créneau (réservé par ${name})` : 'Supprimer le créneau'}
                  onConfirm={() => removeSlot(s)}
                />
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
