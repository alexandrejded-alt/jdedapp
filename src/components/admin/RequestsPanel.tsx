'use client';

import { useCallback, useMemo, useState } from 'react';
import { friendlyError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/client';
import { shortDate } from '@/lib/time';
import type { AccountStatus, Profile } from '@/lib/types';
import { useRealtimeRefresh } from '@/lib/useRealtimeRefresh';
import { ConfirmButton } from '../ui/ConfirmButton';
import { useToast } from '../ui/Toast';

const SELECT = 'id, first_name, last_name, email, status, role, created_at';
const nameOf = (p: Pick<Profile, 'first_name' | 'last_name'>) => `${p.first_name} ${p.last_name}`.trim() || 'Sans nom';

/** Demandes d'accès : accepter, refuser, retirer un accès. */
export function RequestsPanel() {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [rows, setRows] = useState<Profile[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notify, setNotify] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select(SELECT)
      .eq('role', 'user')
      .order('created_at', { ascending: false });
    if (error) toast(friendlyError(error), true);
    else setRows((data ?? []) as Profile[]);
    setLoaded(true);
  }, [supabase, toast]);

  useRealtimeRefresh(['profiles'], load);

  async function setStatus(p: Profile, status: AccountStatus, done: string) {
    const { data, error } = await supabase.from('profiles').update({ status }).eq('id', p.id).select('id');
    if (error || !data || data.length === 0) {
      toast(error ? friendlyError(error) : 'Modification refusée.', true);
      return;
    }
    toast(done);
    if (status === 'approved') setNotify(p);
    await load();
  }

  const pending = rows.filter((r) => r.status === 'pending');
  const approved = rows.filter((r) => r.status === 'approved');
  const refused = rows.filter((r) => r.status === 'refused');

  const row = (p: Profile, actions: React.ReactNode) => (
    <div className="row" key={p.id}>
      <div className="row-main">
        <div>
          <div className="row-name">{nameOf(p)}</div>
          <div className="row-sub">
            {p.email} · demandé le {shortDate(p.created_at)}
          </div>
        </div>
      </div>
      <div className="row-actions">{actions}</div>
    </div>
  );

  return (
    <>
      <div className="view-head">
        <div className="eyebrow">Accès</div>
        <h1>La jded family</h1>
        <p>Accepte les gens que tu connais. Ils entrent dans l&apos;app dès que tu valides.</p>
      </div>

      {notify && <NotifyCard person={notify} onDone={() => setNotify(null)} />}

      <div className="sub-title" style={{ marginTop: 6 }}>
        En attente <em>{pending.length}</em>
      </div>
      {loaded && pending.length === 0 ? (
        <div className="empty">
          <b>Aucune demande en attente</b>
          <span>Envoie le lien du site à ta clientèle. Les demandes arrivent ici.</span>
        </div>
      ) : (
        <div className="list">
          {pending.map((p) =>
            row(
              p,
              <>
                <button type="button" className="btn btn-sm btn-primary" onClick={() => setStatus(p, 'approved', `${p.first_name} est dans la family.`)}>
                  Accepter
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setStatus(p, 'refused', 'Demande refusée.')}>
                  Refuser
                </button>
              </>,
            ),
          )}
        </div>
      )}

      <div className="sub-title" style={{ marginTop: 6 }}>
        Dans la family <em>{approved.length}</em>
      </div>
      {approved.length === 0 ? (
        <p className="hint">Personne pour le moment.</p>
      ) : (
        <div className="list">
          {approved.map((p) =>
            row(
              p,
              <ConfirmButton
                label="Retirer l'accès"
                armedLabel="Confirmer"
                onConfirm={() => setStatus(p, 'refused', 'Accès retiré.')}
              />,
            ),
          )}
        </div>
      )}

      {refused.length > 0 && (
        <>
          <div className="sub-title" style={{ marginTop: 6 }}>
            Refusés <em>{refused.length}</em>
          </div>
          <div className="list">
            {refused.map((p) =>
              row(
                p,
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setStatus(p, 'approved', `${p.first_name} est dans la family.`)}>
                  Accepter finalement
                </button>,
              ),
            )}
          </div>
        </>
      )}
    </>
  );
}

/** Après une acceptation : un message tout prêt pour prévenir la personne. */
function NotifyCard({ person, onDone }: { person: Profile; onDone: () => void }) {
  const toast = useToast();
  const message = `Salut ${person.first_name} ! C'est bon, ta demande est acceptée, tu fais partie de la jded family. Ouvre ${window.location.origin} : tu peux réserver ta coupe et ta place aux évènements.`;

  async function copy(text: string, ok: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(ok);
    } catch {
      toast('Copie impossible, sélectionne le texte à la main.', true);
    }
  }

  return (
    <div className="card" style={{ borderColor: 'rgba(255,140,40,.5)' }}>
      <div className="eyebrow">Prévenir {person.first_name}</div>
      <h2>Envoie-lui un petit mot</h2>
      <p className="hint">Le site n&apos;envoie pas de mail tout seul. Il verra l&apos;accès s&apos;ouvrir dès qu&apos;il rouvre l&apos;app, ce message sert juste à le prévenir.</p>
      <div className="recap">
        <b>{person.email}</b>
      </div>
      <textarea className="input" readOnly rows={4} value={message} aria-label="Message à envoyer" />
      <div className="pk-actions">
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => copy(person.email, 'Adresse copiée.')}>
          Copier l&apos;adresse
        </button>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => copy(message, 'Message copié.')}>
          Copier le message
        </button>
      </div>
      <a
        className="btn btn-sm btn-ghost"
        href={`mailto:${person.email}?subject=${encodeURIComponent('Bienvenue dans la jded family')}&body=${encodeURIComponent(message)}`}
      >
        Ouvrir ma messagerie
      </a>
      <button type="button" className="btn btn-sm btn-ghost" onClick={onDone}>
        C&apos;est fait
      </button>
    </div>
  );
}
