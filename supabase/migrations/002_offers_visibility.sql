-- =====================================================================
-- QELLEBLI — Étape 4 : un candidat peut toujours voir les offres
-- auxquelles il a postulé (même si l'offre est clôturée ensuite)
-- À exécuter une seule fois dans Supabase > SQL Editor
-- =====================================================================
create or replace function public.has_applied_to(oid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.applications a
    join public.candidates c on c.id = a.candidate_id
    where a.offer_id = oid and c.user_id = auth.uid()
  )
$$;

create policy offers_select_applied on public.offers for select to authenticated
  using (public.has_applied_to(id));
