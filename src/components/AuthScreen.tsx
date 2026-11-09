'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { EMAIL_RE, authError, passwordProblem } from '@/lib/errors';
import { FlameIcon } from './ui/Icons';
import { armEmbers } from './ui/EmberOnMount';

type Mode = 'home' | 'signup' | 'login' | 'forgot';

/** Page d'entrée des visiteurs : créer un compte, se connecter, mot de passe oublié. */
export function AuthScreen({ initialError }: { initialError?: string }) {
  const [mode, setMode] = useState<Mode>('home');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(initialError ?? '');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [mailSent, setMailSent] = useState(false);

  function go(next: Mode) {
    setMode(next);
    setError('');
    setInfo('');
    setMailSent(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    const mail = email.trim();
    if (mode === 'signup' && (!first.trim() || !last.trim())) return setError('Indique ton prénom et ton nom.');
    if (!EMAIL_RE.test(mail)) return setError('Cette adresse e-mail ne semble pas valide.');

    const supabase = createClient();

    if (mode === 'signup') {
      const problem = passwordProblem(password);
      if (problem) return setError(problem);
      if (password !== confirm) return setError('Les deux mots de passe ne sont pas identiques.');
      setBusy(true);
      const { data, error: err } = await supabase.auth.signUp({
        email: mail,
        password,
        options: {
          data: { first_name: first.trim(), last_name: last.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (err) {
        setBusy(false);
        return setError(authError(err));
      }
      // Quand la confirmation par mail est activée, une adresse déjà inscrite renvoie un compte sans identité.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setBusy(false);
        return setError('Cette adresse a déjà un compte. Passe sur « Se connecter ».');
      }
      if (data.session) {
        armEmbers('jded_ember_signup');
        window.location.href = '/'; // le serveur t'envoie sur « Demande envoyée »
        return;
      }
      setBusy(false);
      setMailSent(true);
      return;
    }

    if (mode === 'login') {
      if (!password) return setError('Entre ton mot de passe.');
      setBusy(true);
      const { error: err } = await supabase.auth.signInWithPassword({ email: mail, password });
      if (err) {
        setBusy(false);
        return setError(authError(err));
      }
      window.location.href = '/';
      return;
    }

    if (mode === 'forgot') {
      setBusy(true);
      const { error: err } = await supabase.auth.resetPasswordForEmail(mail, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
      });
      setBusy(false);
      if (err) return setError(authError(err));
      setInfo('Si cette adresse a un compte, un mail vient de partir. Regarde aussi dans les spams.');
    }
  }

  if (mode === 'home') {
    return (
      <section className="gate pad">
        <div className="gate-card">
          <FlameIcon />
          <div className="eyebrow">Accès privé</div>
          <h1>Bienvenue dans la jded family</h1>
          <p>Les coupes et les soirées au garage se réservent ici. Crée ton compte, JDED valide ta demande, et tu peux réserver.</p>
          <div className="stack">
            <button type="button" className="btn btn-primary btn-block" onClick={() => go('signup')}>
              Créer un compte
            </button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => go('login')}>
              Se connecter
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (mailSent) {
    return (
      <section className="gate pad">
        <div className="gate-card">
          <FlameIcon />
          <div className="eyebrow">Dernière étape</div>
          <h1>Confirme ton adresse</h1>
          <p>
            On t&apos;a envoyé un mail à <b>{email.trim()}</b>. Ouvre le lien dedans pour confirmer ton adresse, sur ce même téléphone. Regarde aussi dans les spams.
          </p>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => go('login')}>
            J&apos;ai confirmé, me connecter
          </button>
        </div>
      </section>
    );
  }

  const titles: Record<Exclude<Mode, 'home'>, { eyebrow: string; title: string; text: string; cta: string }> = {
    signup: {
      eyebrow: 'Inscris-toi',
      title: 'Tu veux rejoindre la jded family ?',
      text: 'Remplis ça. JDED valide ta demande, et c\'est bon.',
      cta: 'Envoyer ma demande',
    },
    login: { eyebrow: 'Content de te revoir', title: 'Retrouve ton accès', text: 'Ton e-mail et ton mot de passe.', cta: 'Me connecter' },
    forgot: {
      eyebrow: 'Mot de passe oublié',
      title: 'On te le remplace',
      text: 'Entre ton adresse e-mail. Tu reçois un lien pour en choisir un nouveau.',
      cta: 'Recevoir le lien',
    },
  };
  const t = titles[mode];

  return (
    <section className="gate pad">
      <form className="gate-card" onSubmit={submit} noValidate>
        <FlameIcon />
        <div className="eyebrow">{t.eyebrow}</div>
        <h1>{t.title}</h1>
        <p>{t.text}</p>

        {mode === 'signup' && (
          <div className="two">
            <div className="field">
              <label htmlFor="first">Prénom</label>
              <input id="first" className="input" value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" placeholder="Prénom" />
            </div>
            <div className="field">
              <label htmlFor="last">Nom</label>
              <input id="last" className="input" value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" placeholder="Nom" />
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="email">Adresse e-mail</label>
          <input
            id="email"
            className="input"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="toi@exemple.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {mode !== 'forgot' && (
          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder={mode === 'signup' ? '8 caractères minimum' : 'Ton mot de passe'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === 'signup' && <span className="pwd-hint">Au moins 8 caractères, avec une lettre et un chiffre.</span>}
          </div>
        )}

        {mode === 'signup' && (
          <div className="field">
            <label htmlFor="confirm">Confirme le mot de passe</label>
            <input
              id="confirm"
              className="input"
              type="password"
              autoComplete="new-password"
              placeholder="Retape-le"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        )}

        {mode === 'login' && (
          <button type="button" className="linkbtn back" onClick={() => go('forgot')}>
            Mot de passe oublié ?
          </button>
        )}

        <div className="form-err" role="alert">
          {error}
        </div>
        {info && <div className="status-line" role="status">{info}</div>}

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Un instant…' : t.cta}
        </button>
        {mode === 'signup' && (
          <button type="button" className="btn btn-ghost btn-block" onClick={() => go('login')}>
            J&apos;ai déjà un compte
          </button>
        )}
        <button type="button" className="linkbtn back" onClick={() => go('home')}>
          Retour
        </button>
      </form>
    </section>
  );
}
