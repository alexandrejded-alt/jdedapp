'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { friendlyError } from '@/lib/errors';
import { initials, prepareAvatar } from '@/lib/avatar';
import { createClient } from '@/lib/supabase/client';
import { Icon } from './ui/Icons';
import { BottomSheet } from './ui/Sheets';
import { useToast } from './ui/Toast';

/**
 * Photo de profil en haut de l'écran. On appuie dessus pour en choisir une autre.
 * Sans photo : les initiales (ou la photo JDED pour le compte admin).
 */
export function ProfileAvatar({
  userId,
  name,
  avatarPath,
  isAdmin,
}: {
  userId: string;
  name: string;
  avatarPath: string | null;
  isAdmin: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState<string | null>(avatarPath);
  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ blob: Blob; preview: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Le dossier de la photo est privé : on demande un lien temporaire.
  useEffect(() => {
    let alive = true;
    if (!path) {
      setUrl(null);
      return;
    }
    void (async () => {
      const { data } = await supabase.storage.from('avatars').createSignedUrl(path, 3600);
      if (alive) setUrl(data?.signedUrl ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [path, supabase]);

  useEffect(
    () => () => {
      if (draft) URL.revokeObjectURL(draft.preview);
    },
    [draft],
  );

  function close() {
    if (busy) return;
    setOpen(false);
    setDraft(null);
  }

  async function onPick(file: File | undefined) {
    if (!file) return;
    try {
      const blob = await prepareAvatar(file);
      setDraft({ blob, preview: URL.createObjectURL(blob) });
    } catch {
      toast("Cette image ne peut pas être lue. Essaie une photo en JPG ou PNG.", true);
    }
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    const next = `${userId}/${Date.now()}.jpg`;
    const up = await supabase.storage.from('avatars').upload(next, draft.blob, { contentType: 'image/jpeg', cacheControl: '3600' });
    if (up.error) {
      setBusy(false);
      toast(friendlyError(up.error), true);
      return;
    }
    const { error } = await supabase.rpc('set_my_avatar', { p_path: next });
    if (error) {
      await supabase.storage.from('avatars').remove([next]);
      setBusy(false);
      toast(friendlyError(error), true);
      return;
    }
    if (path) await supabase.storage.from('avatars').remove([path]);
    setPath(next);
    setBusy(false);
    setDraft(null);
    setOpen(false);
    toast('Ta photo est enregistrée.');
    router.refresh();
  }

  async function remove() {
    if (!path) return;
    setBusy(true);
    const { error } = await supabase.rpc('set_my_avatar', { p_path: null });
    if (error) {
      setBusy(false);
      toast(friendlyError(error), true);
      return;
    }
    await supabase.storage.from('avatars').remove([path]);
    setPath(null);
    setBusy(false);
    setOpen(false);
    toast('Photo retirée.');
    router.refresh();
  }

  const face = (src: string | null, cls = '') =>
    src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img className={`avatar-img ${cls}`.trim()} src={src} alt="" />
    ) : isAdmin ? (
      <span className={`avatar-brand ${cls}`.trim()} />
    ) : (
      <span className={`avatar-initials ${cls}`.trim()}>{initials(name)}</span>
    );

  return (
    <>
      <button type="button" className="avatar avatar-btn" onClick={() => setOpen(true)} aria-label="Changer ma photo de profil">
        {face(url)}
        <span className="avatar-cam" aria-hidden="true">
          <Icon name="camera" />
        </span>
      </button>

      {open && (
        <BottomSheet label="Ma photo de profil" onClose={close}>
          <div className="eyebrow">Ton profil</div>
          <h2>Ta photo</h2>
          <div className="avatar-preview">{face(draft?.preview ?? url, 'big')}</div>
          <p className="hint">
            {draft
              ? 'Elle sera recadrée en rond. Tu peux en choisir une autre avant d\'enregistrer.'
              : 'Choisis une photo dans ton téléphone ou ton ordinateur. Elle est visible par toi et par JDED.'}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void onPick(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          {draft ? (
            <button type="button" className="btn btn-primary btn-block" onClick={save} disabled={busy}>
              {busy ? 'Envoi…' : 'Enregistrer ma photo'}
            </button>
          ) : null}
          <button type="button" className={`btn btn-block ${draft ? 'btn-ghost' : 'btn-primary'}`} onClick={() => fileRef.current?.click()} disabled={busy}>
            {draft ? 'Choisir une autre photo' : 'Choisir une photo'}
          </button>
          {path && !draft && (
            <button type="button" className="btn btn-ghost btn-block" onClick={remove} disabled={busy}>
              Retirer ma photo
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-block" onClick={close} disabled={busy}>
            Retour
          </button>
        </BottomSheet>
      )}
    </>
  );
}
