-- =====================================================================
-- QELLEBLI — OPTIONNEL : limiter les inscriptions à une liste d'adresses
--
-- Utile pour ouvrir la connexion Google/e-mail tout en réservant l'accès
-- à l'enseignant et à l'équipe.
--   • Table vide      : tout le monde peut s'inscrire.
--   • Table remplie   : seules les adresses listées (ou les domaines listés,
--                       écrits avec un @ devant) peuvent créer un compte.
-- Les comptes déjà créés ne sont jamais affectés.
-- =====================================================================
create table if not exists public.allowed_signups (
  email      text primary key check (email = lower(email)),
  note       text,
  created_at timestamptz not null default now()
);
-- Sécurité activée sans règle : la liste est invisible depuis l'application
alter table public.allowed_signups enable row level security;

create or replace function public.check_signup_allowed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.allowed_signups) then
    if not exists (
      select 1 from public.allowed_signups a
      where lower(new.email) = a.email
         or (left(a.email, 1) = '@' and right(lower(new.email), length(a.email)) = a.email)
    ) then
      raise exception 'Inscription non autorisée pour cette adresse e-mail.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_check_signup_allowed on auth.users;
create trigger trg_check_signup_allowed before insert on auth.users
  for each row execute function public.check_signup_allowed();

-- ---------------------------------------------------------------------
-- Exemple (à adapter, en minuscules), à exécuter séparément :
--   insert into public.allowed_signups (email, note) values
--     ('prof@universite.ma', 'Enseignant'),
--     ('camarade1@gmail.com', 'Équipe'),
--     ('@est-casablanca.ma', 'Tout le domaine de l''école');
-- Pour rouvrir à tout le monde :
--   delete from public.allowed_signups;
-- ---------------------------------------------------------------------
