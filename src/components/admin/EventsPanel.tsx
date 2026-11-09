'use client';

import { useCallback, useMemo, useState } from 'react';
import { friendlyError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/client';
import { dayLong, hhmm, todayParis } from '@/lib/time';
import type { EventRow } from '@/lib/types';
import { useRealtimeRefresh } from '@/lib/useRealtimeRefresh';
import { ConfirmButton } from '../ui/ConfirmButton';
import { DateField, TimeField } from '../ui/pickers';
import { useToast } from '../ui/Toast';

const SELECT = 'id, title, date, start_time, end_time, place, capacity, rules, seats_taken';

/** Évènements : créer, modifier, supprimer. Chaque évènement montre ses inscrits sur le maximum. */
export function EventsPanel() {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const today = todayParis();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('20:00');
  const [end, setEnd] = useState('');
  const [place, setPlace] = useState('');
  const [capacity, setCapacity] = useState('');
  const [rules, setRules] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('events').select(SELECT).order('date', { ascending: false }).order('start_time');
    if (error) toast(friendlyError(error), true);
    else setEvents((data ?? []) as EventRow[]);
    setLoaded(true);
  }, [supabase, toast]);

  useRealtimeRefresh(['events', 'event_seats'], load);

  function reset() {
    setEditId(null);
    setTitle('');
    setDate('');
    setStart('20:00');
    setEnd('');
    setPlace('');
    setCapacity('');
    setRules('');
  }

  function edit(ev: EventRow) {
    setEditId(ev.id);
    setTitle(ev.title);
    setDate(ev.date);
    setStart(hhmm(ev.start_time));
    setEnd(hhmm(ev.end_time));
    setPlace(ev.place);
    setCapacity(String(ev.capacity));
    setRules(ev.rules);
    document.getElementById('ev-title')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function save() {
    const cap = parseInt(capacity, 10);
    const current = events.find((e) => e.id === editId);
    if (!title.trim()) return toast('Donne un nom à l\'évènement.', true);
    if (!date) return toast('Choisis une date.', true);
    if (!editId && date < today) return toast('Cette date est déjà passée.', true);
    if (!start) return toast('Indique l\'heure de début.', true);
    if (end && end <= start) return toast('La fin doit être après le début.', true);
    if (!(cap >= 1 && cap <= 5000)) return toast('Indique le nombre de places (de 1 à 5000).', true);
    if (current && cap < current.seats_taken)
      return toast(`Il y a déjà ${current.seats_taken} inscrits, mets au moins ${current.seats_taken} places.`, true);

    const payload = {
      title: title.trim(),
      date,
      start_time: start,
      end_time: end || null,
      place: place.trim(),
      capacity: cap,
      rules: rules.trim(),
    };
    setBusy(true);
    const { error } = editId
      ? await supabase.from('events').update(payload).eq('id', editId)
      : await supabase.from('events').insert(payload);
    setBusy(false);
    if (error) return toast(friendlyError(error), true);
    toast(editId ? 'Évènement mis à jour.' : 'Évènement publié.');
    reset();
    await load();
  }

  async function remove(ev: EventRow) {
    const { error } = await supabase.from('events').delete().eq('id', ev.id);
    toast(error ? friendlyError(error) : 'Évènement supprimé.', !!error);
    if (editId === ev.id) reset();
    await load();
  }

  const upcoming = events.filter((e) => e.date >= today).sort((a, b) => (a.date + a.start_time < b.date + b.start_time ? -1 : 1));
  const past = events.filter((e) => e.date < today).slice(0, 5);

  const item = (ev: EventRow, isPast: boolean) => (
    <div className="row" key={ev.id} style={isPast ? { opacity: 0.6 } : undefined}>
      <div className="row-main">
        <div>
          <div className="row-name">{ev.title}</div>
          <div className="row-sub">
            {dayLong(ev.date)} · {hhmm(ev.start_time)}
            {ev.end_time ? ` à ${hhmm(ev.end_time)}` : ''}
            {ev.place ? ` · ${ev.place}` : ''}
          </div>
        </div>
        <div className="status-mini ok">
          {ev.seats_taken} / {ev.capacity}
        </div>
      </div>
      <div className="row-actions">
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => edit(ev)}>
          Modifier
        </button>
        <ConfirmButton
          label="Supprimer"
          armedLabel={ev.seats_taken > 0 ? `Confirmer (${ev.seats_taken} inscrits perdus)` : 'Confirmer la suppression'}
          onConfirm={() => remove(ev)}
        />
      </div>
    </div>
  );

  return (
    <>
      <div className="view-head">
        <div className="eyebrow">Showtime</div>
        <h1>Évènements</h1>
        <p>Publie une date, le nombre de places et les consignes.</p>
      </div>

      <div className="card">
        <h2>{editId ? 'Modifier l\'évènement' : 'Nouvel évènement'}</h2>
        <div className="field">
          <label htmlFor="ev-title">Nom de l&apos;évènement</label>
          <input id="ev-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Soirée au garage" maxLength={120} />
        </div>
        <div className="field">
          <label htmlFor="ev-date">Date</label>
          <DateField id="ev-date" value={date} onChange={setDate} min={editId ? undefined : today} placeholder="Choisir une date" />
        </div>
        <div className="two">
          <div className="field">
            <label htmlFor="ev-start">Début</label>
            <TimeField id="ev-start" value={start} onChange={setStart} fallback="20:00" />
          </div>
          <div className="field">
            <label htmlFor="ev-end">Fin</label>
            <TimeField id="ev-end" value={end} onChange={setEnd} fallback="23:00" placeholder="Facultatif" optional />
          </div>
        </div>
        <div className="two">
          <div className="field">
            <label htmlFor="ev-place">Lieu</label>
            <input id="ev-place" className="input" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Adresse ou nom du lieu" />
          </div>
          <div className="field">
            <label htmlFor="ev-cap">Places</label>
            <input id="ev-cap" className="input" type="number" inputMode="numeric" min={1} max={5000} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="30" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="ev-rules">Consignes</label>
          <textarea id="ev-rules" className="input" value={rules} onChange={(e) => setRules(e.target.value)} placeholder="Dress code, ce qu'il faut apporter, où se garer…" />
        </div>
        <button type="button" className="btn btn-primary btn-block" onClick={save} disabled={busy}>
          {busy ? 'Un instant…' : editId ? 'Enregistrer les modifications' : 'Publier l\'évènement'}
        </button>
        {editId && (
          <button type="button" className="btn btn-ghost btn-block" onClick={reset}>
            Annuler la modification
          </button>
        )}
      </div>

      <div className="sub-title">
        Tes évènements <em>{upcoming.length}</em>
      </div>
      {loaded && upcoming.length === 0 ? (
        <div className="empty">
          <b>Aucun évènement</b>
          <span>Crée le premier avec le formulaire au-dessus.</span>
        </div>
      ) : (
        <div className="list">{upcoming.map((e) => item(e, false))}</div>
      )}
      {past.length > 0 && (
        <>
          <div className="sub-title">Passés</div>
          <div className="list">{past.map((e) => item(e, true))}</div>
        </>
      )}
    </>
  );
}
