-- =====================================================================
-- DONNÉES DE DÉMO (facultatif)
--
-- Ajoute des créneaux de coupe pour les 7 prochains jours (10h à 13h et
-- 14h à 18h, toutes les 45 minutes, heure de Paris, sauf le dimanche)
-- et un évènement d'exemple. À lancer une seule fois pour tester.
-- Pour tout effacer ensuite : delete from public.slots; delete from public.events;
-- =====================================================================

insert into public.slots (start_at, end_at)
select
  ((d::date + t) at time zone 'Europe/Paris') as start_at,
  ((d::date + t + interval '45 minutes') at time zone 'Europe/Paris') as end_at
from generate_series(
       (now() at time zone 'Europe/Paris')::date + 1,
       (now() at time zone 'Europe/Paris')::date + 7,
       interval '1 day'
     ) as d,
     (select (time '10:00' + (n * interval '45 minutes')) as t from generate_series(0, 3) n
      union all
      select (time '14:00' + (n * interval '45 minutes')) from generate_series(0, 4) n) as hours
where extract(isodow from d) <> 7
on conflict (start_at) do nothing;

insert into public.events (title, date, start_time, end_time, place, capacity, rules)
select 'Soirée garage', ((now() at time zone 'Europe/Paris')::date + 10), time '20:00', time '23:30',
       'Le garage de JDED', 30,
       E'Arrive à l''heure.\nPas de bruit dans la rue.\nApporte ta bonne humeur.'
where not exists (select 1 from public.events where title = 'Soirée garage');
