-- =====================================================================
-- QELLEBLI — OPTIONNEL : retire de la base de données ce qu'ajoutait le script 010
-- (consentement, suppression de compte, benchmark).
--
-- À exécuter UNIQUEMENT si vous aviez exécuté 010_privacy_benchmark.sql.
-- L'application fonctionne aussi si vous ne l'exécutez pas : les éléments restants sont inutilisés.
--
-- ATTENTION : supprime définitivement les essais de benchmark et les consentements enregistrés.
-- Peut être relancé sans risque.
-- =====================================================================

-- 1. Remet la création de profil dans son état d'avant (nom Google pris en charge, sans consentement)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), nullif(new.raw_user_meta_data->>'name', ''), ''),
    'candidat'
  );
  insert into public.candidates (user_id) values (new.id);
  return new;
end $$;

-- 2. Retire les fonctions, les colonnes et la table ajoutées par 010
drop function if exists public.accept_privacy(text);
drop function if exists public.delete_my_account();
alter table public.profiles drop column if exists privacy_accepted_at;
alter table public.profiles drop column if exists privacy_version;
drop table if exists public.benchmark_runs;
