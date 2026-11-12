-- =====================================================================
-- QELLEBLI — Étape 1 : schéma, sécurité (RLS), stockage des CV
-- À exécuter dans Supabase > SQL Editor (une seule fois, en entier)
-- =====================================================================

-- ---------- Types énumérés ----------
create type user_role          as enum ('candidat', 'rh', 'direction');
create type offer_status       as enum ('brouillon', 'publiee', 'cloturee');
create type offer_type         as enum ('stage', 'alternance', 'emploi_junior');
create type education_level    as enum ('bac', 'bac_plus_2', 'bac_plus_3', 'bac_plus_5', 'doctorat');
create type language_level     as enum ('debutant', 'intermediaire', 'avance', 'courant', 'natif');
create type project_kind       as enum ('academique', 'personnel');
create type experience_kind    as enum ('experience', 'certification');
create type application_status as enum (
  'recue', 'en_verification', 'en_evaluation', 'preselectionnee',
  'entretien_programme', 'acceptee', 'refusee'
);
create type interview_status   as enum ('programme', 'realise', 'annule');
create type interview_result   as enum ('favorable', 'reserve', 'defavorable');

-- ---------- Fonctions utilitaires ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- 1. USERS (profils liés à auth.users) ----------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null unique,
  full_name  text not null default '',
  role       user_role not null default 'candidat',
  created_at timestamptz not null default now()
);

-- Fonctions de rôle (security definer : évitent la récursion RLS)
create or replace function public.get_my_role() returns user_role
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_rh() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.get_my_role() = 'rh', false) $$;

create or replace function public.is_direction() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.get_my_role() = 'direction', false) $$;

-- ---------- 2. CANDIDATES ----------
create table public.candidates (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null unique references public.profiles(id) on delete cascade,
  phone          text,
  city           text,
  education_level education_level,
  school         text,
  field_of_study text,
  graduation_year int check (graduation_year between 1990 and 2100),
  summary        text,
  cv_path        text,                       -- chemin dans le bucket privé "cvs"
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_candidates_updated before update on public.candidates
  for each row execute function public.set_updated_at();

create or replace function public.owns_candidate(cid uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.candidates where id = cid and user_id = auth.uid()) $$;

-- Détails du profil candidat (tables enfants)
create table public.candidate_skills (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  name         text not null,
  level        smallint not null default 3 check (level between 1 and 5)
);
create unique index uq_candidate_skill on public.candidate_skills (candidate_id, lower(name));

create table public.candidate_projects (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  title        text not null,
  kind         project_kind not null default 'academique',
  description  text,
  tech_stack   text[] not null default '{}',
  url          text
);

create table public.candidate_languages (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  language     text not null,
  level        language_level not null default 'intermediaire',
  unique (candidate_id, language)
);

create table public.candidate_experiences (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  kind         experience_kind not null default 'experience',
  title        text not null,
  organization text,
  start_date   date,
  end_date     date,
  description  text,
  check (end_date is null or start_date is null or end_date >= start_date)
);

-- ---------- 3. OFFERS ----------
create table public.offers (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  description        text not null,
  department         text,
  location           text,
  type               offer_type not null default 'stage',
  min_education      education_level,          -- condition d'éligibilité
  target_field       text,                     -- filière visée (pour le scoring)
  required_skills    text[] not null default '{}',
  required_languages text[] not null default '{}',
  deadline           date,                     -- condition d'éligibilité
  status             offer_status not null default 'brouillon',
  created_by         uuid not null references public.profiles(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  published_at       timestamptz,
  closed_at          timestamptz
);
create trigger trg_offers_updated before update on public.offers
  for each row execute function public.set_updated_at();

-- ---------- 4. APPLICATIONS ----------
create table public.applications (
  id            uuid primary key default gen_random_uuid(),
  candidate_id  uuid not null references public.candidates(id) on delete cascade,
  offer_id      uuid not null references public.offers(id) on delete restrict, -- traçabilité : clôturer plutôt que supprimer
  status        application_status not null default 'recue',
  cover_letter  text,
  cv_path       text,                          -- CV transmis avec cette candidature
  applied_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  decided_at    timestamptz,                   -- renseigné automatiquement (acceptée/refusée)
  decision_by   uuid references public.profiles(id),
  decision_note text,
  unique (candidate_id, offer_id)              -- pas de doublon de candidature
);
create trigger trg_applications_updated before update on public.applications
  for each row execute function public.set_updated_at();

-- Historique des statuts (traçabilité)
create table public.application_status_history (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  old_status     application_status,
  new_status     application_status not null,
  changed_by     uuid references public.profiles(id),
  changed_at     timestamptz not null default now()
);

create or replace function public.stamp_decision() returns trigger
language plpgsql as $$
begin
  if new.status is distinct from old.status and new.status in ('acceptee', 'refusee') then
    new.decided_at := now();
    new.decision_by := auth.uid();
  end if;
  return new;
end $$;
create trigger trg_applications_decision before update on public.applications
  for each row execute function public.stamp_decision();

create or replace function public.log_application_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into application_status_history (application_id, old_status, new_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into application_status_history (application_id, old_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end $$;
create trigger trg_applications_history after insert or update on public.applications
  for each row execute function public.log_application_status();

-- ---------- 5. EVALUATIONS (1 par candidature) ----------
create table public.evaluations (
  id               uuid primary key default gen_random_uuid(),
  application_id   uuid not null unique references public.applications(id) on delete cascade,
  score_education  numeric(5,2) not null default 0 check (score_education  between 0 and 100),
  score_skills     numeric(5,2) not null default 0 check (score_skills     between 0 and 100),
  score_projects   numeric(5,2) not null default 0 check (score_projects   between 0 and 100),
  score_languages  numeric(5,2) not null default 0 check (score_languages  between 0 and 100),
  score_experience numeric(5,2) not null default 0 check (score_experience between 0 and 100),
  -- Pondérations : 25 / 30 / 20 / 15 / 10  (calcul garanti par la base)
  score_global     numeric(5,2) generated always as (
    round(0.25*score_education + 0.30*score_skills + 0.20*score_projects
        + 0.15*score_languages + 0.10*score_experience, 2)
  ) stored,
  strengths        text[] not null default '{}',
  improvements     text[] not null default '{}',
  explanation      text,
  evaluated_at     timestamptz not null default now()
);

-- ---------- 6. INTERVIEWS ----------
create table public.interviews (
  id                  uuid primary key default gen_random_uuid(),
  application_id      uuid not null references public.applications(id) on delete cascade,
  scheduled_at        timestamptz not null,
  interviewer_id      uuid not null references public.profiles(id),
  location            text,
  status              interview_status not null default 'programme',
  score_communication smallint check (score_communication between 1 and 5),
  score_motivation    smallint check (score_motivation    between 1 and 5),
  score_skills        smallint check (score_skills        between 1 and 5),
  score_fit           smallint check (score_fit           between 1 and 5),
  comments            text,
  result              interview_result,
  created_at          timestamptz not null default now()
);

-- ---------- Création automatique du profil à l'inscription ----------
-- Tout nouveau compte est TOUJOURS "candidat" (pas d'auto-promotion possible).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), 'candidat');
  insert into public.candidates (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Index ----------
create index idx_candidates_user        on public.candidates (user_id);
create index idx_applications_offer     on public.applications (offer_id);
create index idx_applications_candidate on public.applications (candidate_id);
create index idx_applications_status    on public.applications (status);
create index idx_interviews_application on public.interviews (application_id);
create index idx_history_application    on public.application_status_history (application_id);
create index idx_offers_status          on public.offers (status);

-- =====================================================================
-- SÉCURITÉ : Row Level Security
-- =====================================================================
alter table public.profiles                   enable row level security;
alter table public.candidates                 enable row level security;
alter table public.candidate_skills           enable row level security;
alter table public.candidate_projects         enable row level security;
alter table public.candidate_languages        enable row level security;
alter table public.candidate_experiences      enable row level security;
alter table public.offers                     enable row level security;
alter table public.applications               enable row level security;
alter table public.application_status_history enable row level security;
alter table public.evaluations                enable row level security;
alter table public.interviews                 enable row level security;

-- profiles : chacun voit le sien ; RH voit tout ; direction voit le personnel interne.
-- Le rôle ne peut pas être modifié par l'utilisateur.
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = auth.uid());
create policy profiles_select_rh on public.profiles for select to authenticated
  using (public.is_rh());
create policy profiles_select_direction on public.profiles for select to authenticated
  using (public.is_direction() and role <> 'candidat');
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.get_my_role());

-- candidates : le candidat gère le sien ; RH lit tout ; direction n'a PAS accès aux données personnelles.
create policy candidates_own on public.candidates for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy candidates_rh_read on public.candidates for select to authenticated
  using (public.is_rh());

-- Tables enfants du profil : même logique
do $$
declare t text;
begin
  foreach t in array array['candidate_skills', 'candidate_projects',
                           'candidate_languages', 'candidate_experiences']
  loop
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (public.owns_candidate(candidate_id)) with check (public.owns_candidate(candidate_id))',
      t || '_own', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_rh())',
      t || '_rh_read', t);
  end loop;
end $$;

-- offers : publiées visibles par tous ; RH gère ; direction lit tout
create policy offers_select_published on public.offers for select to authenticated
  using (status = 'publiee');
create policy offers_select_staff on public.offers for select to authenticated
  using (public.is_rh() or public.is_direction());
create policy offers_rh_insert on public.offers for insert to authenticated
  with check (public.is_rh() and created_by = auth.uid());
create policy offers_rh_update on public.offers for update to authenticated
  using (public.is_rh()) with check (public.is_rh());
create policy offers_rh_delete on public.offers for delete to authenticated
  using (public.is_rh());

-- applications : le candidat voit/crée les siennes (offres ouvertes uniquement), ne modifie jamais le statut
create policy applications_candidate_select on public.applications for select to authenticated
  using (public.owns_candidate(candidate_id));
create policy applications_candidate_insert on public.applications for insert to authenticated
  with check (
    public.owns_candidate(candidate_id)
    and status = 'recue'
    and exists (select 1 from public.offers o
                where o.id = offer_id and o.status = 'publiee'
                  and (o.deadline is null or o.deadline >= current_date))
  );
create policy applications_rh_select on public.applications for select to authenticated
  using (public.is_rh());
create policy applications_rh_update on public.applications for update to authenticated
  using (public.is_rh()) with check (public.is_rh());
create policy applications_direction_select on public.applications for select to authenticated
  using (public.is_direction());

-- historique : lecture seule (écrit uniquement par le trigger)
create policy history_candidate_select on public.application_status_history for select to authenticated
  using (exists (select 1 from public.applications a
                 where a.id = application_id and public.owns_candidate(a.candidate_id)));
create policy history_staff_select on public.application_status_history for select to authenticated
  using (public.is_rh() or public.is_direction());

-- evaluations : RH uniquement (+ lecture direction). Le candidat ne voit pas les scores.
create policy evaluations_rh_all on public.evaluations for all to authenticated
  using (public.is_rh()) with check (public.is_rh());
create policy evaluations_direction_select on public.evaluations for select to authenticated
  using (public.is_direction());

-- interviews : RH uniquement (+ lecture direction). Le candidat suit son entretien via le statut.
create policy interviews_rh_all on public.interviews for all to authenticated
  using (public.is_rh()) with check (public.is_rh());
create policy interviews_direction_select on public.interviews for select to authenticated
  using (public.is_direction());

-- =====================================================================
-- STOCKAGE DES CV : bucket privé, dossier = id de l'utilisateur
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false)
on conflict (id) do nothing;

create policy cv_owner_all on storage.objects for all to authenticated
  using      (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy cv_rh_read on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and public.is_rh());
