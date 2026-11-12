-- =====================================================================
-- QELLEBLI — Connexion avec Google (et autres fournisseurs)
-- À exécuter une seule fois dans Supabase > SQL Editor
--
-- Les comptes créés via Google fournissent le nom dans « name » ou « full_name ».
-- Quel que soit le mode d'inscription, un nouveau compte est TOUJOURS « candidat ».
-- Les rôles RH et Direction ne s'attribuent que depuis Supabase.
-- =====================================================================
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
