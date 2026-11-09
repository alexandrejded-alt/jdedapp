'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { authError, passwordProblem } from '@/lib/errors';
import { FlameIcon } from './ui/Icons';

/** Choix d'un nouveau mot de passe, après le clic sur le lien « Mot de passe oublié ». */
export function ResetForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError('Les deux mots de passe ne sont pas identiques.');
    setBusy(true);
    const { error: err } = await createClient().auth.updateUser({ password });
    if (err) {
      setBusy(false);
      return setError(authError(err));
    }
    window.location.href = '/';
  }

  return (
    <section className="gate pad">
      <form className="gate-card" onSubmit={submit} noValidate>
        <FlameIcon />
        <div className="eyebrow">Nouveau mot de passe</div>
        <h1>Choisis-en un nouveau</h1>
        <div className="field">
          <label htmlFor="np">Mot de passe</label>
          <input id="np" className="input" type="password" autoComplete="new-password" placeholder="8 caractères minimum" value={password} onChange={(e) => setPassword(e.target.value)} />
          <span className="pwd-hint">Au moins 8 caractères, avec une lettre et un chiffre.</span>
        </div>
        <div className="field">
          <label htmlFor="np2">Confirme le mot de passe</label>
          <input id="np2" className="input" type="password" autoComplete="new-password" placeholder="Retape-le" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <div className="form-err" role="alert">
          {error}
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Un instant…' : 'Enregistrer'}
        </button>
      </form>
    </section>
  );
}
