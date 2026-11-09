# JDED APP (by @jdedcut)

Le site privé de JDED. Deux choses dedans :

- **Cut** : les clients réservent un créneau de coupe.
- **Showtime** : les clients réservent une place pour un évènement au garage.

Personne ne voit rien sans compte. Chaque nouvelle personne crée un compte, et c'est JDED qui accepte ou refuse dans l'onglet **Admin**.

Ce guide est écrit pour quelqu'un qui n'a jamais fait de développement. Suis les étapes dans l'ordre, sans en sauter.

---

## Ce qu'il te faut

1. Un ordinateur (Windows ou Mac).
2. **Node.js** (version 20 ou plus). Télécharge la version "LTS" sur https://nodejs.org et installe-la comme n'importe quel logiciel.
3. Un compte gratuit **Supabase** : https://supabase.com (c'est la base de données et les comptes).
4. Un compte gratuit **Vercel** : https://vercel.com (c'est ce qui met le site en ligne).
5. Un compte **GitHub** gratuit : https://github.com (Vercel s'en sert pour récupérer ton site).

---

## Étape 1. Créer la base de données (Supabase)

1. Va sur https://supabase.com, connecte-toi, clique sur **New project**.
2. Donne un nom (par exemple `jded-app`), choisis un mot de passe pour la base (note-le quelque part, tu n'en auras pas besoin tout le temps), et une région proche : **West EU (Paris)** si elle est proposée.
3. Clique sur **Create new project** et attends 1 à 2 minutes.

### Mettre les tables en place (le fichier SQL)

1. Dans Supabase, menu de gauche : **SQL Editor**, puis **New query**.
2. Ouvre le fichier `supabase/schema.sql` de ce dossier avec le Bloc-notes (ou n'importe quel éditeur de texte).
3. Sélectionne tout (Ctrl+A), copie (Ctrl+C), colle dans Supabase (Ctrl+V).
4. Clique sur **Run**. Tu dois voir "Success. No rows returned".

Tu peux relancer ce fichier sans risque si tu as un doute, il est fait pour ça.

### Récupérer les deux clés

1. Dans Supabase : **Project Settings** (la roue dentée, en bas à gauche), puis **API**.
2. Note ces deux valeurs :
   - **Project URL** (ça ressemble à `https://abcdefgh.supabase.co`)
   - **anon public** (une longue suite de caractères)
3. N'utilise jamais la clé **service_role** dans ce site. Elle donne tous les droits.

### Régler les comptes (Authentication)

1. Menu **Authentication**, puis **Sign In / Providers** (ou **Providers**), puis **Email**.
2. **Désactive "Confirm email"**. Comme ça, la personne n'a pas à cliquer sur un mail : elle crée son compte, tombe sur "Demande envoyée" et attend que tu la valides. C'est toi le filtre.
3. Laisse "Enable Email provider" activé et enregistre.

Les adresses du site (à faire **après** l'étape 4, quand tu auras ton lien Vercel) :

1. **Authentication**, puis **URL Configuration**.
2. **Site URL** : ton adresse finale, par exemple `https://jded-app.vercel.app` (ou ton nom de domaine).
3. **Redirect URLs** : ajoute ces deux lignes (avec ton adresse) :
   - `https://jded-app.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (pour tester sur ton ordinateur)
4. Enregistre.

Ça sert pour le lien "Mot de passe oublié".

### Vérifier que l'actualisation automatique est bien en place

Le fichier SQL l'active déjà. Pour vérifier : **Database**, puis **Publications**, puis `supabase_realtime`. Tu dois y voir `profiles`, `slots` et `events`. Quand quelqu'un prend un créneau, il disparaît chez les autres sans qu'ils aient à recharger.

---

## Étape 2. Lancer le site sur ton ordinateur (pour tester)

1. Ouvre le dossier `jdedapp`. Dans la barre d'adresse de l'Explorateur Windows, tape `cmd` et appuie sur Entrée : une fenêtre noire s'ouvre dans le bon dossier. (Sur Mac : clic droit sur le dossier, "Nouveau terminal au dossier".)
2. Copie le fichier `.env.example` et nomme la copie `.env.local` (avec le point devant). Ouvre-le et remplace :
   - `https://TON-PROJET.supabase.co` par ton **Project URL**
   - `ta-cle-anon-ici` par ta clé **anon public**
3. Dans la fenêtre noire, tape ces deux commandes, une par une, avec Entrée :

```
npm install
npm run dev
```

4. Ouvre http://localhost:3000 dans ton navigateur. Tu dois voir l'écran de chargement avec les flammes, puis la page d'accueil.

Pour arrêter : Ctrl+C dans la fenêtre noire.

Si tu vois un message rouge qui parle de `NEXT_PUBLIC_SUPABASE_URL`, c'est que le fichier `.env.local` est mal rempli.

---

## Étape 3. Créer le compte admin de JDED

Il n'y a qu'un seul admin : toi. Ça se fait en deux temps.

1. Sur le site (en local ou en ligne), clique sur **Créer un compte** avec **ton** adresse e-mail. Tu arrives sur "Demande envoyée".
2. Dans Supabase : **SQL Editor**, **New query**. Ouvre `supabase/make-admin.sql`, remplace `COLLE-TON-EMAIL-ICI` par ton adresse (garde les guillemets), colle le tout dans Supabase et clique sur **Run**.
3. Le tableau du bas doit afficher ta ligne avec `role = admin`.
4. Retourne sur le site : tu es dedans automatiquement (ou recharge la page). L'onglet **Admin** apparaît, visible uniquement pour toi.

Ensuite, tu fais tout depuis l'onglet Admin, plus besoin de SQL.

---

## Étape 4. Mettre le site en ligne (Vercel)

### 4.1 Mettre le dossier sur GitHub

1. Sur https://github.com, clique sur **New repository**, nom `jded-app`, choisis **Private**, clique sur **Create repository**.
2. Le plus simple : installe **GitHub Desktop** (https://desktop.github.com), choisis **Add an existing repository** avec le dossier `jdedapp`, puis **Publish repository** (garde "Keep this code private" coché).

Le fichier `.env.local` n'est pas envoyé (il est dans `.gitignore`). Tes clés restent chez toi.

### 4.2 Brancher Vercel

1. Va sur https://vercel.com, connecte-toi avec GitHub.
2. **Add New**, puis **Project**, choisis `jded-app`, clique sur **Import**.
3. Ouvre la partie **Environment Variables** et ajoute ces deux lignes (les mêmes valeurs que dans `.env.local`) :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique sur **Deploy**. Après 1 à 2 minutes, tu as une adresse du type `https://jded-app.vercel.app`.
5. Retourne dans Supabase (**Authentication**, **URL Configuration**) et mets cette adresse dans **Site URL** et **Redirect URLs** (voir l'étape 1).

Ce lien, c'est celui que tu donnes à tes clients. Ne leur envoie jamais le dossier du projet.

À chaque fois que tu changes quelque chose dans le projet et que tu l'envoies sur GitHub, Vercel remet le site à jour tout seul.

### 4.3 Brancher un nom de domaine (facultatif)

1. Achète un nom de domaine (par exemple chez OVH, Gandi ou Namecheap).
2. Dans Vercel : ton projet, **Settings**, **Domains**, tape ton domaine, clique sur **Add**.
3. Vercel affiche les réglages à copier chez ton vendeur de domaine (un enregistrement `A` ou `CNAME`). Colle-les dans la zone DNS du vendeur. Ça peut prendre de quelques minutes à quelques heures.
4. Quand c'est bon, retourne dans Supabase et remplace **Site URL** et **Redirect URLs** par le nouveau domaine (garde l'ancienne adresse Vercel aussi dans Redirect URLs, ça ne gêne pas).

---

## Étape 5. Premiers pas dans l'admin

L'onglet **Admin** a quatre sections :

- **Demandes** : les nouvelles personnes en attente. Boutons Accepter / Refuser. Tu peux aussi retirer l'accès à quelqu'un ou accepter finalement une personne refusée. Après avoir accepté, un petit encadré te propose de lui envoyer un message pour la prévenir.
- **Réservations** : qui a pris quelle coupe, avec annulation possible, et la liste des inscrits à chaque évènement.
- **Créneaux** : choisis les jours (tu peux en cocher plusieurs), l'heure de début, l'heure de fin et la durée d'une coupe. Le site découpe tout seul et te montre un aperçu avant de valider. Il y a aussi un bouton pour recopier la semaine d'avant.
- **Évènements** : nom, date, heure, lieu, nombre de places, consignes. Tu peux publier, modifier, supprimer.

### Données de démo (facultatif)

Pour tester avec de faux créneaux et un faux évènement : ouvre `supabase/seed-demo.sql`, colle dans le SQL Editor, **Run**. Pour tout effacer ensuite : `delete from public.slots; delete from public.events;`.

---

## Comment les accès sont protégés

Trois barrières, jamais une seule :

1. **La base de données (RLS)** : même avec les clés du site, une personne qui n'est pas validée ne peut rien lire. Une personne validée ne peut lire que les créneaux, les évènements, et ses propres réservations. Personne ne peut se donner le statut "approved" ni le rôle "admin" tout seul.
2. **Le serveur (middleware)** : à chaque page, il vérifie la session et le statut. Visiteur : renvoyé vers la connexion. En attente : écran d'attente. Refusé : écran "Accès non accordé". Client normal qui tape `/admin` : renvoyé vers Cut.
3. **L'interface** : l'onglet Admin n'apparaît que pour toi (mais ce n'est jamais la seule protection).

Les réservations passent par des fonctions de la base qui verrouillent la ligne avant d'écrire : deux personnes ne peuvent pas prendre le même créneau, et un évènement ne dépasse jamais son nombre de places, même si deux clics arrivent en même temps.

---

## Si quelque chose ne marche pas

| Problème | Cause probable |
| --- | --- |
| Message rouge sur `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` absent ou pas rempli (en local), ou variables oubliées dans Vercel |
| Après "Créer un compte", message sur la confirmation de mail | "Confirm email" est encore activé dans Supabase (étape 1) |
| Je ne vois pas l'onglet Admin | Le SQL de `make-admin.sql` n'a pas été lancé, ou l'adresse ne correspond pas à celle du compte |
| Le lien "Mot de passe oublié" ne mène nulle part | Redirect URLs pas remplies dans Supabase |
| Les mails (mot de passe oublié) n'arrivent pas | Le service mail gratuit de Supabase est très limité. Pour un vrai usage, branche ton propre service d'envoi (Authentication, puis SMTP Settings, par exemple avec Resend) |
| `npm` n'est pas reconnu | Node.js n'est pas installé, ou ferme et rouvre la fenêtre noire après l'installation |

---

## Pour les curieux : le dossier

```
supabase/schema.sql       tables, règles de sécurité, réservations atomiques
supabase/make-admin.sql   passer ton compte en admin
supabase/seed-demo.sql    données de démo
src/middleware.ts         protège toutes les pages côté serveur
src/lib/access.ts         la règle "qui a le droit d'aller où"
src/lib/time.ts           dates et heures en heure de Paris
src/app/                  les pages (login, attente, refuse, cut, showtime, admin)
src/components/           les écrans et les petits composants
src/app/globals.css       tout le design (couleurs, polices, flammes)
public/                   avatar, bannière, icônes
```

Couleurs : `--bg #0a0705`, `--surface #15100b`, `--line #35230f`, `--ink #f8ecdd`, `--ink-dim #b39d84`, `--flame #ff6a13`, `--flame-hot #ff9a2e`, `--gold #f4bd4f`, `--ok #86d993`, `--bad #ff7466`. Polices : Rozha One, Barlow, Barlow Condensed (chargées depuis Google Fonts).

---

## Ce qui reste à décider

- **Les e-mails automatiques** : pour l'instant, c'est toi qui préviens la personne après l'avoir acceptée (un encadré t'aide). On peut brancher Resend plus tard pour qu'elle reçoive un mail toute seule, et que toi tu en reçoives un à chaque nouvelle demande.
- **Un acompte** pour les coupes ou les places : pas prévu pour l'instant. À voir si tu veux, avec Stripe par exemple.
- **Une coupe à la fois par client** : c'est la règle actuelle (un client ne peut pas empiler dix créneaux). Si tu veux l'enlever, c'est un petit bloc dans `book_slot`, dans `schema.sql`, à supprimer.
- **Polices Google** : le site les charge depuis Google. Si tu veux être strict sur la vie privée, on peut les héberger sur le site.
