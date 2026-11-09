-- =====================================================================
-- JDED APP : schéma de la base de données (Supabase / Postgres)
--
-- Comment l'utiliser : Supabase > SQL Editor > New query > colle tout ce
-- fichier > Run. Tu peux le relancer sans risque, il ne casse rien.
--
-- Ce que ça met en place :
--   - profiles   : un profil par compte (statut pending/approved/refused, rôle user/admin)
--   - slots      : les créneaux de coupe publiés par JDED
--   - bookings   : les coupes réservées (un créneau = une seule réservation)
--   - events     : les évènements Showtime
--   - event_seats: les places réservées aux évènements
--   - des règles de sécurité (RLS) : rien n'est lisible sans compte validé
--   - des fonctions de réservation qui ne peuvent pas se marcher dessus
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  first_name  text not null default '',
  last_name   text not null default '',
  email       text not null default '',
  status      text not null default 'pending' check (status in ('pending', 'approved', 'refused')),
  role        text not null default 'user'    check (role in ('user', 'admin')),
  created_at  timestamptz not null default now()
);

create table if not exists public.slots (
  id          uuid primary key default gen_random_uuid(),
  start_at    timestamptz not null,
  end_at      timestamptz not null,
  -- is_booked est tenu à jour automatiquement (voir triggers plus bas).
  -- Il permet à tout le monde de voir qu'un créneau est pris, sans savoir par qui.
  is_booked   boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint slots_end_after_start check (end_at > start_at),
  constraint slots_start_unique unique (start_at)
);

create table if not exists public.bookings (
  id          uuid primary key default gen_random_uuid(),
  slot_id     uuid not null unique references public.slots (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists bookings_user_id_idx on public.bookings (user_id);

create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 1 and 120),
  date          date not null,
  start_time    time not null,
  end_time      time,
  place         text not null default '',
  capacity      integer not null check (capacity between 1 and 5000),
  rules         text not null default '',
  -- seats_taken est tenu à jour automatiquement (voir triggers plus bas).
  seats_taken   integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists events_date_idx on public.events (date);

create table if not exists public.event_seats (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (event_id, user_id)
);
create index if not exists event_seats_user_id_idx on public.event_seats (user_id);


-- ---------------------------------------------------------------------
-- 2. FONCTIONS OUTILS (qui es-tu ? es-tu validé ? es-tu admin ?)
-- ---------------------------------------------------------------------

create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'approved'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'approved' and p.role = 'admin'
  );
$$;


-- ---------------------------------------------------------------------
-- 3. CRÉATION AUTOMATIQUE DU PROFIL À L'INSCRIPTION
--    Toujours en "pending" et "user" : personne ne peut s'auto-valider.
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, email)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'first_name', ''), 60),
    left(coalesce(new.raw_user_meta_data ->> 'last_name', ''), 60),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------
-- 4. COMPTEURS AUTOMATIQUES (créneau pris, places prises)
--    Ils font aussi "bouger" la ligne du créneau ou de l'évènement, ce qui
--    prévient les autres téléphones en temps réel.
-- ---------------------------------------------------------------------

create or replace function public.sync_slot_booked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.slots set is_booked = true where id = new.slot_id;
  elsif tg_op = 'DELETE' then
    update public.slots set is_booked = false where id = old.slot_id;
  end if;
  return null;
end;
$$;

drop trigger if exists bookings_sync_slot on public.bookings;
create trigger bookings_sync_slot
  after insert or delete on public.bookings
  for each row execute function public.sync_slot_booked();

create or replace function public.sync_event_seats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event uuid;
begin
  v_event := case when tg_op = 'DELETE' then old.event_id else new.event_id end;
  update public.events
     set seats_taken = (select count(*) from public.event_seats where event_id = v_event)
   where id = v_event;
  return null;
end;
$$;

drop trigger if exists event_seats_sync_count on public.event_seats;
create trigger event_seats_sync_count
  after insert or delete on public.event_seats
  for each row execute function public.sync_event_seats();


-- ---------------------------------------------------------------------
-- 5. RÉSERVATIONS ATOMIQUES (fonctions appelées par le site)
--    Le "for update" bloque la ligne pendant la réservation : si deux
--    personnes cliquent en même temps, la deuxième attend, puis voit que
--    c'est pris. Impossible de réserver deux fois le même créneau ou de
--    dépasser le nombre de places.
-- ---------------------------------------------------------------------

create or replace function public.book_slot(p_slot_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.slots;
  v_id uuid;
begin
  if auth.uid() is null or not public.is_approved() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  -- Verrouille le profil pour qu'une même personne ne puisse pas
  -- réserver deux créneaux au même instant.
  perform 1 from public.profiles where id = auth.uid() for update;

  select * into v_slot from public.slots where id = p_slot_id for update;
  if not found then
    raise exception 'slot_not_found';
  end if;
  if v_slot.start_at <= now() then
    raise exception 'slot_past';
  end if;
  if exists (select 1 from public.bookings where slot_id = p_slot_id) then
    raise exception 'slot_taken';
  end if;
  -- Une seule coupe à venir par personne. Pour autoriser plusieurs coupes,
  -- supprime ce bloc "if exists" (4 lignes).
  if exists (
    select 1
      from public.bookings b
      join public.slots s on s.id = b.slot_id
     where b.user_id = auth.uid() and s.start_at > now()
  ) then
    raise exception 'already_booked';
  end if;

  insert into public.bookings (slot_id, user_id)
  values (p_slot_id, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.reserve_event_seat(p_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events;
  v_count integer;
  v_id uuid;
begin
  if auth.uid() is null or not public.is_approved() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'event_not_found';
  end if;
  if v_event.date < (now() at time zone 'Europe/Paris')::date then
    raise exception 'event_past';
  end if;
  if exists (
    select 1 from public.event_seats
     where event_id = p_event_id and user_id = auth.uid()
  ) then
    raise exception 'already_reserved';
  end if;

  select count(*) into v_count from public.event_seats where event_id = p_event_id;
  if v_count >= v_event.capacity then
    raise exception 'event_full';
  end if;

  insert into public.event_seats (event_id, user_id)
  values (p_event_id, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- Seuls les comptes connectés peuvent appeler ces fonctions.
revoke all on function public.book_slot(uuid) from public, anon;
revoke all on function public.reserve_event_seat(uuid) from public, anon;
revoke all on function public.is_approved() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.book_slot(uuid) to authenticated;
grant execute on function public.reserve_event_seat(uuid) to authenticated;
grant execute on function public.is_approved() to authenticated;
grant execute on function public.is_admin() to authenticated;


-- ---------------------------------------------------------------------
-- 6. SÉCURITÉ (RLS) : qui a le droit de lire et d'écrire quoi
-- ---------------------------------------------------------------------

alter table public.profiles    enable row level security;
alter table public.slots       enable row level security;
alter table public.bookings    enable row level security;
alter table public.events      enable row level security;
alter table public.event_seats enable row level security;

-- Un visiteur sans compte n'a accès à rien.
revoke all on public.profiles, public.slots, public.bookings, public.events, public.event_seats from anon;

-- profiles : chacun voit son profil, JDED voit tout. Seul JDED peut changer
-- un statut ou un rôle (personne ne peut se valider tout seul).
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- slots : les comptes validés voient les créneaux, seul JDED les gère.
drop policy if exists slots_select on public.slots;
create policy slots_select on public.slots
  for select to authenticated
  using (public.is_approved());

drop policy if exists slots_admin_write on public.slots;
create policy slots_admin_write on public.slots
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- bookings : chacun ne voit et n'annule que sa réservation, JDED voit tout.
-- (La création passe uniquement par la fonction book_slot.)
drop policy if exists bookings_select on public.bookings;
create policy bookings_select on public.bookings
  for select to authenticated
  using ((user_id = auth.uid() and public.is_approved()) or public.is_admin());

drop policy if exists bookings_delete on public.bookings;
create policy bookings_delete on public.bookings
  for delete to authenticated
  using ((user_id = auth.uid() and public.is_approved()) or public.is_admin());

drop policy if exists bookings_admin_write on public.bookings;
create policy bookings_admin_write on public.bookings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- events : les comptes validés voient les évènements, seul JDED les gère.
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select to authenticated
  using (public.is_approved());

drop policy if exists events_admin_write on public.events;
create policy events_admin_write on public.events
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- event_seats : chacun voit et annule ses places, JDED voit tout.
-- (La création passe uniquement par la fonction reserve_event_seat.)
drop policy if exists event_seats_select on public.event_seats;
create policy event_seats_select on public.event_seats
  for select to authenticated
  using ((user_id = auth.uid() and public.is_approved()) or public.is_admin());

drop policy if exists event_seats_delete on public.event_seats;
create policy event_seats_delete on public.event_seats
  for delete to authenticated
  using ((user_id = auth.uid() and public.is_approved()) or public.is_admin());

drop policy if exists event_seats_admin_write on public.event_seats;
create policy event_seats_admin_write on public.event_seats
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ---------------------------------------------------------------------
-- 6 bis. PHOTO DE PROFIL
--    Chaque compte validé peut choisir sa photo. Elle est rangée dans un
--    espace privé ("avatars", un dossier par personne). Personne d'autre que
--    la personne et JDED ne peut la lire. Un compte ne peut pas modifier
--    sa fiche à la main : il passe par set_my_avatar, qui ne touche qu'à la photo.
-- ---------------------------------------------------------------------

alter table public.profiles add column if not exists avatar_path text;

create or replace function public.set_my_avatar(p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_approved() then
    raise exception 'not_allowed';
  end if;
  -- Le fichier doit être dans le dossier de la personne : <son id>/<nom>.jpg
  if p_path is not null and p_path !~ ('^' || auth.uid()::text || '/[A-Za-z0-9._-]{1,80}$') then
    raise exception 'bad_path';
  end if;
  update public.profiles set avatar_path = p_path where id = auth.uid();
end;
$$;

revoke all on function public.set_my_avatar(text) from public, anon;
grant execute on function public.set_my_avatar(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_select on storage.objects;
create policy avatars_select on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text and public.is_approved());

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text and public.is_approved())
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text and public.is_approved());

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));


-- ---------------------------------------------------------------------
-- 7. TEMPS RÉEL : les écrans se mettent à jour tout seuls
-- ---------------------------------------------------------------------

do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['profiles', 'slots', 'events', 'bookings', 'event_seats'] loop
      if not exists (
        select 1 from pg_publication_tables
         where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end;
$$;
