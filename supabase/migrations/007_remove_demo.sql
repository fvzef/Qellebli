-- =====================================================================
-- QELLEBLI — Suppression complète de la démonstration
-- Supprime les données fictives ET les 11 comptes @example.com.
-- Ne touche pas à vos propres comptes ni à vos propres offres.
-- =====================================================================
do $rm$
declare
  rh_ids uuid[];
begin
  select array_agg(id) into rh_ids from public.profiles where email in ('rh@example.com', 'rh2@example.com');

  delete from public.applications
   where candidate_id in (select ca.id from public.candidates ca join public.profiles p on p.id = ca.user_id where p.email like '%@example.com')
      or offer_id in (select id from public.offers where created_by = any(coalesce(rh_ids, '{}')));
  delete from public.offers where created_by = any(coalesce(rh_ids, '{}'));
  delete from auth.users where email in (
    'direction@example.com', 'rh@example.com', 'rh2@example.com', 'candidat@example.com',
    'omar.elidrissi@example.com', 'salma.tazi@example.com', 'mehdi.alaoui@example.com',
    'imane.chraibi@example.com', 'anas.berrada@example.com', 'hajar.lahlou@example.com',
    'youssef.naciri@example.com');
end
$rm$;
