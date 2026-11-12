-- =====================================================================
-- QELLEBLI — Étape 7 : indicateurs RH (HR Analytics)
-- À exécuter une seule fois dans Supabase > SQL Editor
--
-- Une seule fonction calcule tous les indicateurs à partir des données réelles.
-- Accès réservé aux rôles RH et Direction. Aucune donnée personnelle n'est renvoyée.
-- Paramètre optionnel : p_offer pour filtrer sur une seule offre.
-- =====================================================================
create or replace function public.get_hr_dashboard(p_offer uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_rh() or public.is_direction()) then
    raise exception 'Accès refusé';
  end if;

  return (
    with apps as (
      select a.* from public.applications a
      where p_offer is null or a.offer_id = p_offer
    ),
    -- « Présélectionnée » = a été présélectionnée, convoquée en entretien ou acceptée (au moins une fois)
    reached as (
      select distinct h.application_id
      from public.application_status_history h
      join apps on apps.id = h.application_id
      where h.new_status in ('preselectionnee', 'entretien_programme', 'acceptee')
    ),
    -- Candidatures ayant eu (ou ayant) un entretien non annulé
    interviewed as (
      select distinct i.application_id
      from public.interviews i
      join apps on apps.id = i.application_id
      where i.status <> 'annule'
    ),
    first_interview as (
      select i.application_id, min(i.scheduled_at) as first_at
      from public.interviews i
      join apps on apps.id = i.application_id
      where i.status <> 'annule'
      group by i.application_id
    ),
    -- Première action du recruteur sur la candidature (sortie du statut « Reçue »)
    initial as (
      select h.application_id, min(h.changed_at) as first_change
      from public.application_status_history h
      join apps on apps.id = h.application_id
      where h.old_status = 'recue'
      group by h.application_id
    ),
    decided as (
      select * from apps where status in ('acceptee', 'refusee') and decided_at is not null
    )
    select jsonb_build_object(
      'total',                (select count(*) from apps),
      'in_progress',          (select count(*) from apps where status not in ('acceptee', 'refusee')),
      'preselected',          (select count(*) from reached),
      'interviews_scheduled', (select count(*) from public.interviews i join apps on apps.id = i.application_id where i.status = 'programme' and apps.status not in ('acceptee', 'refusee')),
      'interviewed',          (select count(*) from interviewed),
      'hires',                (select count(*) from apps where status = 'acceptee'),
      'rejected',             (select count(*) from apps where status = 'refusee'),
      'hires_interviewed',    (select count(*) from apps where status = 'acceptee' and id in (select application_id from interviewed)),
      'avg_duration_days',    (select round((avg(extract(epoch from d.decided_at - d.applied_at)) / 86400)::numeric, 1) from decided d),
      'avg_initial_hours',    (select round((avg(extract(epoch from n.first_change - a.applied_at)) / 3600)::numeric, 1) from initial n join apps a on a.id = n.application_id),
      'avg_days_to_interview',(select round((avg(extract(epoch from f.first_at - a.applied_at)) / 86400)::numeric, 1) from first_interview f join apps a on a.id = f.application_id),
      'backlog_7d',           (select count(*) from apps where status = 'recue' and applied_at < now() - interval '7 days'),
      'avg_score',            (select round(avg(e.score_global)::numeric, 1) from public.evaluations e join apps on apps.id = e.application_id),
      'open_offers',          (select count(*) from public.offers where status = 'publiee' and (deadline is null or deadline >= current_date)),
      'by_status', (
        select jsonb_agg(jsonb_build_object('status', s::text, 'count', (select count(*) from apps where apps.status = s)))
        from unnest(enum_range(null::application_status)) as s
      ),
      'per_month', (
        select jsonb_agg(jsonb_build_object('month', to_char(m, 'YYYY-MM'),
                                            'count', (select count(*) from apps where date_trunc('month', apps.applied_at) = m))
                         order by m)
        from generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') as m
      ),
      'by_offer', (
        select coalesce(jsonb_agg(jsonb_build_object('offer_id', o.id, 'title', o.title,
                                                     'applications', x.n, 'preselected', x.pres, 'hires', x.hires)
                                  order by x.n desc, o.title), '[]'::jsonb)
        from public.offers o
        join lateral (
          select count(*) as n,
                 count(*) filter (where a.id in (select application_id from reached)) as pres,
                 count(*) filter (where a.status = 'acceptee') as hires
          from apps a where a.offer_id = o.id
        ) x on true
        where o.status <> 'brouillon' and (p_offer is null or o.id = p_offer)
      ),
      'score_buckets', (
        select jsonb_agg(jsonb_build_object('bucket', b.label,
                 'count', (select count(*) from public.evaluations e join apps on apps.id = e.application_id
                           where e.score_global >= b.lo and e.score_global < b.hi))
               order by b.lo)
        from (values ('0-20', 0, 20), ('20-40', 20, 40), ('40-60', 40, 60), ('60-80', 60, 80), ('80-100', 80, 100.01)) as b(label, lo, hi)
      )
    )
  );
end $$;

revoke all on function public.get_hr_dashboard(uuid) from public, anon;
grant execute on function public.get_hr_dashboard(uuid) to authenticated;
