-- =====================================================================
-- QELLEBLI — Étape 5 : moteur de scoring transparent
-- À exécuter une seule fois dans Supabase > SQL Editor
--
-- Pondérations : formation 25 % · compétences 30 % · projets 20 %
--                langues 15 % · expériences 10 %  (chaque critère noté /100)
-- Le score ASSISTE le recruteur : il ne modifie JAMAIS le statut d'une candidature.
-- =====================================================================

-- ---------- Fonctions utilitaires ----------
create or replace function public.edu_rank(l education_level) returns int
language sql immutable as $$
  select case l when 'bac' then 1 when 'bac_plus_2' then 2 when 'bac_plus_3' then 3
                when 'bac_plus_5' then 4 when 'doctorat' then 5 end
$$;

create or replace function public.lang_points(l language_level) returns numeric
language sql immutable as $$
  select case l when 'debutant' then 30 when 'intermediaire' then 55 when 'avance' then 80
                when 'courant' then 90 when 'natif' then 100 end
$$;

create or replace function public.count_score(n int) returns numeric
language sql immutable as $$
  select case when n <= 0 then 0 when n = 1 then 50 when n = 2 then 75 else 100 end
$$;

-- Correspondance de textes : égalité, ou l'un contient l'autre (3 caractères minimum)
create or replace function public.text_match(a text, b text) returns boolean
language sql immutable as $$
  select coalesce(
    lower(trim(a)) = lower(trim(b))
    or (length(trim(a)) >= 3 and length(trim(b)) >= 3
        and (position(lower(trim(b)) in lower(a)) > 0 or position(lower(trim(a)) in lower(b)) > 0)),
    false)
$$;

-- ---------- Calcul du score d'une candidature ----------
create or replace function public.calc_evaluation(p_application uuid)
returns public.evaluations
language plpgsql security definer set search_path = public as $$
declare
  app  public.applications;
  cand public.candidates;
  off  public.offers;
  s_edu numeric := 0; s_skills numeric := 0; s_proj numeric := 0;
  s_lang numeric := 0; s_exp numeric := 0;
  niveau numeric; filiere numeric; relevance numeric;
  n_skills int; n_proj int; n_lang int; n_exp int;
  total_skills int; total_langs int; matched int; avg_lvl numeric;
  matched_names text[] := '{}'; missing_skills text[] := '{}'; missing_langs text[] := '{}';
  strengths text[] := '{}'; improvements text[] := '{}';
  expl text;
  result public.evaluations;
begin
  select * into app from public.applications where id = p_application;
  if not found then raise exception 'Candidature introuvable'; end if;
  select * into cand from public.candidates where id = app.candidate_id;
  select * into off  from public.offers where id = app.offer_id;

  -- 1. FORMATION (niveau 70 % + filière 30 % si une filière est visée)
  if cand.education_level is null then
    niveau := 0;
  elsif off.min_education is null then
    niveau := case public.edu_rank(cand.education_level) when 1 then 50 when 2 then 65 when 3 then 80 else 100 end;
  elsif public.edu_rank(cand.education_level) >= public.edu_rank(off.min_education) then
    niveau := 100;
  else
    niveau := greatest(0, 100 - 35 * (public.edu_rank(off.min_education) - public.edu_rank(cand.education_level)));
  end if;
  if off.target_field is null or trim(off.target_field) = '' then
    s_edu := niveau;
  else
    filiere := case when cand.field_of_study is null then 0
                    when public.text_match(cand.field_of_study, off.target_field) then 100 else 30 end;
    s_edu := round(0.7 * niveau + 0.3 * filiere);
  end if;

  -- 2. COMPÉTENCES (couverture 70 % + niveau moyen des compétences trouvées 30 %)
  select count(*) into n_skills from public.candidate_skills where candidate_id = cand.id;
  total_skills := coalesce(array_length(off.required_skills, 1), 0);
  if total_skills = 0 then
    s_skills := least(100, n_skills * 20);
  else
    select count(*), coalesce(avg(m.level), 0), coalesce(array_agg(r.req), '{}')
      into matched, avg_lvl, matched_names
    from unnest(off.required_skills) as r(req)
    join lateral (
      select cs.level from public.candidate_skills cs
      where cs.candidate_id = cand.id and public.text_match(cs.name, r.req)
      order by cs.level desc limit 1
    ) m on true;
    s_skills := round(100 * (0.7 * matched::numeric / total_skills + 0.3 * avg_lvl / 5));
    select coalesce(array_agg(r.req), '{}') into missing_skills
    from unnest(off.required_skills) as r(req)
    where not exists (select 1 from public.candidate_skills cs
                      where cs.candidate_id = cand.id and public.text_match(cs.name, r.req));
  end if;

  -- 3. PROJETS (quantité 70 % + pertinence 30 %)
  select count(*) into n_proj from public.candidate_projects where candidate_id = cand.id;
  if n_proj = 0 then
    s_proj := 0;
  else
    if total_skills = 0 then
      relevance := 100;
    else
      relevance := case when exists (
        select 1 from public.candidate_projects p, unnest(off.required_skills) as r(req)
        where p.candidate_id = cand.id
          and (exists (select 1 from unnest(p.tech_stack) t where public.text_match(t, r.req))
               or public.text_match(coalesce(p.description, ''), r.req))
      ) then 100 else 0 end;
    end if;
    s_proj := round(0.7 * public.count_score(n_proj) + 0.3 * relevance);
  end if;

  -- 4. LANGUES (niveau moyen sur les langues requises, sinon selon le nombre de langues)
  select count(*) into n_lang from public.candidate_languages where candidate_id = cand.id;
  total_langs := coalesce(array_length(off.required_languages, 1), 0);
  if total_langs = 0 then
    s_lang := public.count_score(n_lang);
  else
    select round(avg(coalesce((
      select public.lang_points(cl.level) from public.candidate_languages cl
      where cl.candidate_id = cand.id and public.text_match(cl.language, r.req)
      order by public.lang_points(cl.level) desc limit 1), 0)))
      into s_lang
    from unnest(off.required_languages) as r(req);
    select coalesce(array_agg(r.req), '{}') into missing_langs
    from unnest(off.required_languages) as r(req)
    where not exists (select 1 from public.candidate_languages cl
                      where cl.candidate_id = cand.id and public.text_match(cl.language, r.req));
  end if;

  -- 5. EXPÉRIENCES COMPLÉMENTAIRES (expériences + certifications)
  select count(*) into n_exp from public.candidate_experiences where candidate_id = cand.id;
  s_exp := public.count_score(n_exp);

  -- Points forts
  if s_edu >= 70 then strengths := array_append(strengths, format('Formation adaptée au poste (%s/100)', s_edu)); end if;
  if s_skills >= 70 then strengths := array_append(strengths, format('Bonne couverture des compétences (%s/100)', s_skills)); end if;
  if cardinality(matched_names) > 0 then
    strengths := array_append(strengths, 'Compétences requises présentes : ' || array_to_string(matched_names, ', '));
  end if;
  if s_proj >= 70 then strengths := array_append(strengths, format('Projets académiques ou personnels solides (%s/100)', s_proj)); end if;
  if s_lang >= 70 then strengths := array_append(strengths, format('Maîtrise des langues attendues (%s/100)', s_lang)); end if;
  if s_exp >= 70 then strengths := array_append(strengths, format('Expériences et certifications complémentaires (%s/100)', s_exp)); end if;

  -- Points à améliorer
  if s_edu < 50 then improvements := array_append(improvements, 'Formation en deçà du niveau ou de la filière attendus'); end if;
  if cardinality(missing_skills) > 0 then
    improvements := array_append(improvements, 'Compétences requises non renseignées : ' || array_to_string(missing_skills, ', '));
  elsif s_skills < 50 then
    improvements := array_append(improvements, 'Compétences techniques peu renseignées');
  end if;
  if s_proj < 50 then improvements := array_append(improvements, 'Peu de projets ou projets peu liés au poste'); end if;
  if cardinality(missing_langs) > 0 then
    improvements := array_append(improvements, 'Langues requises non renseignées : ' || array_to_string(missing_langs, ', '));
  elsif s_lang < 50 then
    improvements := array_append(improvements, 'Niveau de langues limité');
  end if;
  if s_exp < 50 then improvements := array_append(improvements, 'Peu d''expériences ou de certifications renseignées'); end if;

  expl := format(
    'Score calculé sur cinq critères pondérés : formation 25 %% (%s/100), compétences techniques 30 %% (%s/100), projets 20 %% (%s/100), langues 15 %% (%s/100), expériences complémentaires 10 %% (%s/100). '
    'Ce score est une aide à la décision : il ne rejette jamais un candidat automatiquement.',
    s_edu, s_skills, s_proj, s_lang, s_exp);

  insert into public.evaluations (application_id, score_education, score_skills, score_projects,
                                  score_languages, score_experience, strengths, improvements, explanation, evaluated_at)
  values (p_application, s_edu, s_skills, s_proj, s_lang, s_exp, strengths, improvements, expl, now())
  on conflict (application_id) do update set
    score_education = excluded.score_education, score_skills = excluded.score_skills,
    score_projects = excluded.score_projects, score_languages = excluded.score_languages,
    score_experience = excluded.score_experience, strengths = excluded.strengths,
    improvements = excluded.improvements, explanation = excluded.explanation, evaluated_at = now()
  returning * into result;

  return result;
end $$;

-- Seul le serveur (trigger) peut appeler le calcul brut
revoke all on function public.calc_evaluation(uuid) from public, anon, authenticated;

-- Calcul automatique dès le dépôt d'une candidature
create or replace function public.trg_auto_evaluate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.calc_evaluation(new.id);
  return new;
end $$;

create trigger trg_applications_evaluate after insert on public.applications
  for each row execute function public.trg_auto_evaluate();

-- Recalcul manuel par un recruteur (après mise à jour du profil du candidat)
create or replace function public.recompute_evaluation(p_application uuid)
returns public.evaluations
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_rh() then raise exception 'Accès refusé'; end if;
  return public.calc_evaluation(p_application);
end $$;

revoke all on function public.recompute_evaluation(uuid) from public, anon;
grant execute on function public.recompute_evaluation(uuid) to authenticated;

-- Scores pour les candidatures déjà existantes
select public.calc_evaluation(a.id)
from public.applications a
where not exists (select 1 from public.evaluations e where e.application_id = a.id);
