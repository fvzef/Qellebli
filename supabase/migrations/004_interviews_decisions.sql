-- =====================================================================
-- QELLEBLI — Étape 6 : entretiens et décision finale
-- À exécuter une seule fois dans Supabase > SQL Editor
-- =====================================================================

-- 1. Décisions finales : la justification est INTERNE (invisible pour le candidat)
create table public.decisions (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications(id) on delete cascade,
  decision       application_status not null check (decision in ('acceptee', 'refusee')),
  note           text,
  decided_by     uuid references public.profiles(id),
  decided_at     timestamptz not null default now()
);
alter table public.decisions enable row level security;

create policy decisions_rh_all on public.decisions for all to authenticated
  using (public.is_rh()) with check (public.is_rh());
create policy decisions_direction_select on public.decisions for select to authenticated
  using (public.is_direction());

-- La colonne decision_note de applications serait lisible par le candidat : on la retire
alter table public.applications drop column if exists decision_note;

-- 2. Programmer un entretien passe la candidature au statut « Entretien programmé »
create or replace function public.trg_interview_scheduled() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.applications
     set status = 'entretien_programme'
   where id = new.application_id
     and status not in ('acceptee', 'refusee', 'entretien_programme');
  return new;
end $$;

create trigger trg_interviews_scheduled after insert on public.interviews
  for each row execute function public.trg_interview_scheduled();

-- 3. Le candidat voit la date et le lieu de son entretien (jamais les notes ni les scores)
create or replace function public.get_my_interviews()
returns table (application_id uuid, scheduled_at timestamptz, location text, interviewer_name text)
language sql stable security definer set search_path = public as $$
  select i.application_id, i.scheduled_at, i.location, p.full_name
  from public.interviews i
  join public.applications a on a.id = i.application_id
  join public.candidates c on c.id = a.candidate_id
  left join public.profiles p on p.id = i.interviewer_id
  where c.user_id = auth.uid() and i.status = 'programme'
  order by i.scheduled_at
$$;

revoke all on function public.get_my_interviews() from public, anon;
grant execute on function public.get_my_interviews() to authenticated;
