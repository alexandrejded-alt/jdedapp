-- =====================================================================
-- Faire de JDED l'administrateur
--
-- 1) Crée d'abord ton compte sur le site (bouton "Créer un compte").
-- 2) Remplace l'adresse ci-dessous par la tienne (garde les guillemets).
-- 3) Supabase > SQL Editor > New query > colle > Run.
-- =====================================================================

update public.profiles
   set role = 'admin',
       status = 'approved'
 where lower(email) = lower('COLLE-TON-EMAIL-ICI');

-- Vérification : cette requête doit afficher une ligne avec role = admin.
select email, role, status from public.profiles where role = 'admin';
