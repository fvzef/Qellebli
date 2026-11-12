-- =====================================================================
-- QELLEBLI — Étape 8 : données de démonstration (100 % fictives)
--
-- Prérequis : avoir lancé  node --env-file=.env scripts/create-demo-accounts.mjs
-- Ce script peut être relancé : il remplace les anciennes données de démonstration.
-- Il ne touche pas à vos propres comptes ni à vos propres offres.
--
-- Contenu : 1 Direction, 2 RH, 8 candidats, 5 offres, 16 candidatures
--           (évaluations, historique, entretiens et décisions inclus).
-- =====================================================================
do $seed$
declare
  demo_emails text[] := array[
    'direction@example.com', 'rh@example.com', 'rh2@example.com', 'candidat@example.com',
    'omar.elidrissi@example.com', 'salma.tazi@example.com', 'mehdi.alaoui@example.com',
    'imane.chraibi@example.com', 'anas.berrada@example.com', 'hajar.lahlou@example.com',
    'youssef.naciri@example.com'];
  cand_emails text[] := array[
    'candidat@example.com', 'omar.elidrissi@example.com', 'salma.tazi@example.com',
    'mehdi.alaoui@example.com', 'imane.chraibi@example.com', 'anas.berrada@example.com',
    'hajar.lahlou@example.com', 'youssef.naciri@example.com'];
  rh1 uuid; rh2 uuid;
  offers_map jsonb := '{}'::jsonb;
  c jsonb; x jsonb; o jsonb; a jsonb;
  cid uuid; cuid uuid; oid uuid; aid uuid; ivr uuid;
  idx bigint;
  applied timestamptz; ts timestamptz; last_ts timestamptz;
  final_status public.application_status;
  steps text[]; offs int[]; k int; h int; with_iv boolean; d int;
  n_apps int := 0;
begin
  -- 1. Vérification des comptes de démonstration
  if (select count(*) from public.profiles where email = any(demo_emails)) < array_length(demo_emails, 1) then
    raise exception 'Comptes de démonstration introuvables. Lancez d''abord : node --env-file=.env scripts/create-demo-accounts.mjs';
  end if;

  select id into rh1 from public.profiles where email = 'rh@example.com';
  select id into rh2 from public.profiles where email = 'rh2@example.com';

  -- 2. Nettoyage d'une éventuelle ancienne démo
  delete from public.applications
   where candidate_id in (select ca.id from public.candidates ca join public.profiles p on p.id = ca.user_id where p.email = any(cand_emails))
      or offer_id in (select id from public.offers where created_by in (rh1, rh2));
  delete from public.offers where created_by in (rh1, rh2);

  -- 3. Noms et rôles
  update public.profiles p set full_name = v.n, role = v.r::public.user_role
  from (values
    ('direction@example.com', 'Karim Bennani', 'direction'),
    ('rh@example.com', 'Nadia Cherkaoui', 'rh'),
    ('rh2@example.com', 'Amine Fassi', 'rh'),
    ('candidat@example.com', 'Yasmine Benali', 'candidat'),
    ('omar.elidrissi@example.com', 'Omar El Idrissi', 'candidat'),
    ('salma.tazi@example.com', 'Salma Tazi', 'candidat'),
    ('mehdi.alaoui@example.com', 'Mehdi Alaoui', 'candidat'),
    ('imane.chraibi@example.com', 'Imane Chraibi', 'candidat'),
    ('anas.berrada@example.com', 'Anas Berrada', 'candidat'),
    ('hajar.lahlou@example.com', 'Hajar Lahlou', 'candidat'),
    ('youssef.naciri@example.com', 'Youssef Naciri', 'candidat')
  ) as v(e, n, r) where p.email = v.e;

  delete from public.candidates
   where user_id in (select id from public.profiles where email in ('direction@example.com', 'rh@example.com', 'rh2@example.com'));

  -- 4. Profils des candidats
  for c in select value from jsonb_array_elements($j$[
    {"email":"candidat@example.com","phone":"0661 00 00 01","city":"Casablanca","level":"bac_plus_2","school":"EST Casablanca","field":"Marketing Digital et Communication","year":2027,
     "summary":"Étudiante en deuxième année, passionnée par la communication digitale et la création de contenu. À la recherche d'un stage pour mettre en pratique mes compétences.",
     "skills":[{"n":"Canva","l":4},{"n":"Réseaux sociaux","l":4},{"n":"Excel","l":4},{"n":"Word","l":4},{"n":"SQL","l":2}],
     "projects":[{"t":"Plan de communication digitale","k":"academique","d":"Élaboration d'un plan de communication sur trois canaux pour une marque locale fictive.","s":["Canva","Instagram"]},
                 {"t":"Gestion du compte Instagram d'une association","k":"personnel","d":"Animation et calendrier éditorial, hausse de l'audience en trois mois.","s":["Instagram","Canva"]}],
     "langs":[{"n":"Arabe","l":"natif"},{"n":"Français","l":"courant"},{"n":"Anglais","l":"avance"}],
     "exps":[{"k":"experience","t":"Bénévole communication","o":"Association étudiante","d":"Création des visuels et gestion des réseaux sociaux."},
             {"k":"certification","t":"Fondamentaux du marketing digital","o":"Plateforme en ligne","d":null}]},
    {"email":"omar.elidrissi@example.com","phone":"0661 00 00 02","city":"Mohammedia","level":"bac_plus_3","school":"FST Mohammedia","field":"Informatique décisionnelle","year":2026,
     "summary":"Étudiant en licence, à l'aise avec l'analyse de données et la visualisation. Je cherche un stage en business intelligence.",
     "skills":[{"n":"SQL","l":4},{"n":"Power BI","l":4},{"n":"Excel","l":5},{"n":"Python","l":3},{"n":"Gestion de projet","l":3},{"n":"Notion","l":3}],
     "projects":[{"t":"Tableau de bord des ventes","k":"academique","d":"Conception d'un tableau de bord interactif pour suivre les ventes d'une PME fictive.","s":["Power BI","SQL"]},
                 {"t":"Base de données de gestion de stock","k":"academique","d":"Modélisation et requêtes pour un magasin.","s":["SQL","MySQL"]},
                 {"t":"Analyse de données publiques","k":"personnel","d":"Nettoyage et visualisation d'un jeu de données ouvert.","s":["Python","Excel"]}],
     "langs":[{"n":"Arabe","l":"natif"},{"n":"Français","l":"courant"},{"n":"Anglais","l":"avance"}],
     "exps":[{"k":"experience","t":"Stage d'observation","o":"PME de services informatiques","d":"Découverte des métiers de la donnée."},
             {"k":"certification","t":"Analyse de données avec Power BI","o":"Plateforme en ligne","d":null}]},
    {"email":"salma.tazi@example.com","phone":"0661 00 00 03","city":"Salé","level":"bac_plus_2","school":"EST Salé","field":"Techniques de Management","year":2027,
     "summary":"Étudiante sérieuse, je souhaite découvrir le monde de l'entreprise à travers un premier stage.",
     "skills":[{"n":"Word","l":3},{"n":"Excel","l":3},{"n":"Canva","l":2}],
     "projects":[{"t":"Étude de marché d'un commerce de proximité","k":"academique","d":"Enquête auprès de clients et synthèse des résultats.","s":["Excel","Word"]}],
     "langs":[{"n":"Arabe","l":"natif"},{"n":"Français","l":"avance"}],
     "exps":[{"k":"experience","t":"Stage d'observation","o":"Agence commerciale","d":"Accueil clientèle et classement de dossiers."}]},
    {"email":"mehdi.alaoui@example.com","phone":"0661 00 00 04","city":"Casablanca","level":"bac","school":"Université Hassan II","field":"Sciences économiques","year":2029,
     "summary":"Étudiant en première année, motivé pour apprendre.",
     "skills":[{"n":"Excel","l":2}],
     "projects":[],
     "langs":[{"n":"Arabe","l":"natif"},{"n":"Français","l":"intermediaire"}],
     "exps":[]},
    {"email":"imane.chraibi@example.com","phone":"0661 00 00 05","city":"Casablanca","level":"bac_plus_5","school":"ISCAE Casablanca","field":"Management des Ressources Humaines","year":2026,
     "summary":"Étudiante en master, intéressée par le recrutement et l'administration du personnel. Rigoureuse et organisée.",
     "skills":[{"n":"Excel","l":4},{"n":"Word","l":5},{"n":"Gestion administrative","l":4},{"n":"Gestion de projet","l":3},{"n":"Notion","l":3}],
     "projects":[{"t":"Étude du climat social","k":"academique","d":"Questionnaire, analyse des résultats et recommandations pour une entreprise fictive.","s":["Excel","Word"]},
                 {"t":"Prototype de suivi des candidatures","k":"personnel","d":"Tableau de suivi du recrutement et gestion administrative des dossiers.","s":["Notion","Excel"]}],
     "langs":[{"n":"Arabe","l":"natif"},{"n":"Français","l":"courant"},{"n":"Anglais","l":"avance"}],
     "exps":[{"k":"experience","t":"Stage en ressources humaines","o":"Entreprise industrielle","d":"Appui au recrutement et à la gestion administrative du personnel."},
             {"k":"experience","t":"Bénévolat","o":"Association étudiante","d":"Organisation d'événements de recrutement."}]},
    {"email":"anas.berrada@example.com","phone":"0661 00 00 06","city":"Casablanca","level":"bac_plus_3","school":"ENCG Casablanca","field":"Marketing et Commerce","year":2026,
     "summary":"Étudiant en commerce, curieux des outils d'analyse et de gestion de projet.",
     "skills":[{"n":"Excel","l":3},{"n":"Power BI","l":2},{"n":"SQL","l":2},{"n":"Gestion de projet","l":3}],
     "projects":[{"t":"Simulation de gestion d'entreprise","k":"academique","d":"Pilotage d'une entreprise fictive pendant un semestre.","s":["Excel"]},
                 {"t":"Lancement d'un produit fictif","k":"academique","d":"Plan marketing et budget prévisionnel.","s":["Excel","Gestion de projet"]}],
     "langs":[{"n":"Arabe","l":"natif"},{"n":"Français","l":"courant"},{"n":"Anglais","l":"intermediaire"}],
     "exps":[{"k":"experience","t":"Job d'été en vente","o":"Magasin de prêt-à-porter","d":"Conseil et vente en boutique."}]},
    {"email":"hajar.lahlou@example.com","phone":"0661 00 00 07","city":"Casablanca","level":"bac_plus_2","school":"EST Casablanca","field":"Management Digital des Organisations","year":2027,
     "summary":"Étudiante créative, à l'aise sur les réseaux sociaux. Je souhaite un stage en marketing digital ou en administration.",
     "skills":[{"n":"Canva","l":5},{"n":"Réseaux sociaux","l":5},{"n":"Excel","l":3},{"n":"Word","l":4}],
     "projects":[{"t":"Campagne TikTok pour un projet étudiant","k":"academique","d":"Création de vidéos courtes et suivi des statistiques de la campagne.","s":["TikTok","Canva"]},
                 {"t":"Site vitrine d'une association","k":"personnel","d":"Conception et mise en ligne d'un site simple.","s":["Canva","Réseaux sociaux"]}],
     "langs":[{"n":"Arabe","l":"natif"},{"n":"Français","l":"courant"},{"n":"Anglais","l":"intermediaire"}],
     "exps":[{"k":"experience","t":"Community manager bénévole","o":"Club étudiant","d":"Animation des réseaux du club."},
             {"k":"certification","t":"Initiation au marketing digital","o":"Plateforme en ligne","d":null}]},
    {"email":"youssef.naciri@example.com","phone":"0661 00 00 08","city":"Casablanca","level":"bac_plus_2","school":"EST Casablanca","field":"Gestion des Entreprises","year":2027,
     "summary":"Étudiant en gestion, je cherche un stage pour découvrir le fonctionnement d'une entreprise.",
     "skills":[{"n":"Word","l":3},{"n":"Excel","l":3}],
     "projects":[{"t":"Étude de rentabilité d'une petite entreprise","k":"academique","d":"Calcul des coûts et du seuil de rentabilité.","s":["Excel"]}],
     "langs":[{"n":"Arabe","l":"natif"},{"n":"Français","l":"avance"},{"n":"Anglais","l":"debutant"}],
     "exps":[{"k":"experience","t":"Job d'été","o":"Restaurant","d":"Service en salle."}]}
  ]$j$::jsonb) loop
    select ca.id into cid from public.candidates ca join public.profiles p on p.id = ca.user_id where p.email = c->>'email';
    if cid is null then raise exception 'Candidat introuvable : %', c->>'email'; end if;

    update public.candidates set
      phone = c->>'phone', city = c->>'city', education_level = (c->>'level')::public.education_level,
      school = c->>'school', field_of_study = c->>'field', graduation_year = (c->>'year')::int, summary = c->>'summary'
    where id = cid;

    delete from public.candidate_skills where candidate_id = cid;
    delete from public.candidate_projects where candidate_id = cid;
    delete from public.candidate_languages where candidate_id = cid;
    delete from public.candidate_experiences where candidate_id = cid;

    for x in select value from jsonb_array_elements(c->'skills') loop
      insert into public.candidate_skills (candidate_id, name, level) values (cid, x->>'n', (x->>'l')::smallint);
    end loop;
    for x in select value from jsonb_array_elements(c->'projects') loop
      insert into public.candidate_projects (candidate_id, title, kind, description, tech_stack)
      values (cid, x->>'t', (x->>'k')::public.project_kind, x->>'d', array(select jsonb_array_elements_text(x->'s')));
    end loop;
    for x in select value from jsonb_array_elements(c->'langs') loop
      insert into public.candidate_languages (candidate_id, language, level) values (cid, x->>'n', (x->>'l')::public.language_level);
    end loop;
    for x in select value from jsonb_array_elements(c->'exps') loop
      insert into public.candidate_experiences (candidate_id, kind, title, organization, description)
      values (cid, (x->>'k')::public.experience_kind, x->>'t', x->>'o', x->>'d');
    end loop;
  end loop;

  -- 5. Offres
  for o in select value from jsonb_array_elements($j$[
    {"key":"M","title":"Stage – Assistant Marketing Digital","department":"Marketing","location":"Casablanca","type":"stage","min":"bac_plus_2","field":"Marketing",
     "skills":["Canva","Réseaux sociaux","Excel"],"langs":["Français","Anglais"],"deadline":25,"status":"publiee","pub":75,
     "description":"Rejoignez l'équipe marketing pour animer nos réseaux sociaux, produire des visuels et suivre les résultats des campagnes.\n\nMissions :\n- Créer et planifier des contenus\n- Suivre les statistiques des publications\n- Participer aux campagnes de communication\n\nDurée : 2 à 3 mois."},
    {"key":"B","title":"Stage – Analyste Business Intelligence","department":"Data & Digital","location":"Casablanca","type":"stage","min":"bac_plus_2","field":null,
     "skills":["Excel","SQL","Power BI"],"langs":["Français","Anglais"],"deadline":30,"status":"publiee","pub":70,
     "description":"Appuyez l'équipe data dans la préparation de tableaux de bord et l'analyse des indicateurs de performance.\n\nMissions :\n- Collecter et nettoyer les données\n- Construire des tableaux de bord Power BI\n- Présenter les résultats aux équipes métier\n\nDurée : 3 mois."},
    {"key":"R","title":"Stage – Assistant Ressources Humaines","department":"Ressources Humaines","location":"Casablanca","type":"stage","min":"bac_plus_2","field":"Ressources Humaines",
     "skills":["Excel","Word","Gestion administrative"],"langs":["Français","Arabe"],"deadline":20,"status":"publiee","pub":40,
     "description":"Participez au recrutement et à la gestion administrative du personnel.\n\nMissions :\n- Trier les candidatures et préparer les entretiens\n- Tenir les dossiers du personnel\n- Alimenter les tableaux de suivi RH\n\nDurée : 2 mois."},
    {"key":"T","title":"Stage – Chargé de Transformation Digitale","department":"Direction Générale","location":"Casablanca","type":"stage","min":"bac_plus_3","field":null,
     "skills":["Gestion de projet","Power BI","Notion"],"langs":["Français","Anglais"],"deadline":-100,"status":"cloturee","pub":140,
     "description":"Accompagnez la direction dans la digitalisation des processus internes.\n\nMissions :\n- Cartographier les processus\n- Suivre l'avancement des projets digitaux\n- Proposer des améliorations\n\nOffre clôturée."},
    {"key":"D","title":"Stage – Community Manager","department":"Marketing","location":"Casablanca","type":"stage","min":"bac_plus_2","field":null,
     "skills":["Canva","Réseaux sociaux"],"langs":["Français"],"deadline":null,"status":"brouillon","pub":null,
     "description":"Brouillon : offre en cours de rédaction."}
  ]$j$::jsonb) loop
    insert into public.offers (title, description, department, location, type, min_education, target_field,
                               required_skills, required_languages, deadline, status, created_by, created_at, published_at, closed_at)
    values (
      o->>'title', o->>'description', o->>'department', o->>'location', (o->>'type')::public.offer_type,
      (o->>'min')::public.education_level, o->>'field',
      array(select jsonb_array_elements_text(o->'skills')), array(select jsonb_array_elements_text(o->'langs')),
      case when o->>'deadline' is null then null else current_date + (o->>'deadline')::int end,
      (o->>'status')::public.offer_status, rh1,
      coalesce(now() - make_interval(days => (o->>'pub')::int + 2), now()),
      case when o->>'pub' is null then null else now() - make_interval(days => (o->>'pub')::int) end,
      case when o->>'status' = 'cloturee' then now() - interval '100 days' else null end
    ) returning id into oid;
    offers_map := offers_map || jsonb_build_object(o->>'key', oid);
  end loop;

  -- 6. Candidatures : l'historique et les entretiens sont écrits à la main avec des dates réalistes
  alter table public.applications disable trigger trg_applications_history;
  alter table public.interviews disable trigger trg_interviews_scheduled;

  for a, idx in select e.value, e.ord from jsonb_array_elements($j$[
    {"c":"candidat@example.com","o":"M","days":60,"status":"acceptee","h":10,"cover":"Passionnée par la communication digitale, je serais ravie de rejoindre votre équipe marketing.",
     "note":"Profil très complet et excellente expérience des réseaux sociaux. Candidature retenue.",
     "iv":{"c":5,"m":5,"s":4,"f":5,"res":"favorable","com":"Très à l'aise, projets concrets et motivation évidente."}},
    {"c":"salma.tazi@example.com","o":"M","days":55,"status":"refusee","h":30,"withiv":true,"cover":"Je souhaite découvrir le marketing digital au sein de votre entreprise.",
     "note":"Motivation réelle mais compétences de création de contenu insuffisantes pour le poste.",
     "iv":{"c":3,"m":3,"s":2,"f":2,"res":"defavorable","com":"Motivée, mais outils de création de contenu insuffisamment maîtrisés."}},
    {"c":"hajar.lahlou@example.com","o":"M","days":20,"status":"preselectionnee","h":8,"cover":"Active sur les réseaux sociaux depuis deux ans, je souhaite en faire mon métier."},
    {"c":"imane.chraibi@example.com","o":"M","days":12,"status":"en_evaluation","h":20,"cover":null},
    {"c":"omar.elidrissi@example.com","o":"B","days":5,"status":"entretien_programme","h":6,"cover":"Passionné par la donnée, je souhaite approfondir Power BI en situation réelle.",
     "iv":{"com":"Préparer des questions sur Power BI et SQL."}},
    {"c":"mehdi.alaoui@example.com","o":"B","days":48,"status":"refusee","h":44,"cover":null,
     "note":"Niveau d'études et compétences insuffisants pour le poste."},
    {"c":"anas.berrada@example.com","o":"B","days":25,"status":"preselectionnee","h":15,"cover":"Je souhaite compléter ma formation en commerce par une expérience en analyse de données."},
    {"c":"candidat@example.com","o":"B","days":3,"status":"en_verification","h":26,"cover":null},
    {"c":"imane.chraibi@example.com","o":"R","days":33,"status":"acceptee","h":12,"cover":"Mon master en ressources humaines et mon stage précédent me préparent à ce poste.",
     "note":"Profil RH très solide, maîtrise parfaite des outils administratifs. Candidature retenue.",
     "iv":{"c":5,"m":4,"s":5,"f":5,"res":"favorable","com":"Excellente connaissance du recrutement et de l'administration du personnel."}},
    {"c":"hajar.lahlou@example.com","o":"R","days":1,"status":"recue","h":12,"cover":null},
    {"c":"youssef.naciri@example.com","o":"R","days":30,"status":"refusee","h":22,"cover":null,
     "note":"Compétences en gestion administrative limitées."},
    {"c":"salma.tazi@example.com","o":"R","days":7,"status":"en_verification","h":18,"cover":null},
    {"c":"omar.elidrissi@example.com","o":"T","days":128,"status":"acceptee","h":9,"cover":"Mon parcours en informatique décisionnelle m'a préparé à accompagner vos projets digitaux.",
     "note":"Bonne maîtrise de Power BI et de la gestion de projet. Candidature retenue.",
     "iv":{"c":4,"m":4,"s":5,"f":4,"res":"favorable","com":"Bonne maîtrise de Power BI et de la gestion de projet."}},
    {"c":"mehdi.alaoui@example.com","o":"T","days":126,"status":"refusee","h":40,"withiv":true,"cover":null,
     "note":"Profil trop junior pour la transformation digitale.",
     "iv":{"c":3,"m":2,"s":2,"f":2,"res":"defavorable","com":"Manque d'expérience en gestion de projet."}},
    {"c":"youssef.naciri@example.com","o":"T","days":122,"status":"refusee","h":55,"cover":null,
     "note":"Profil moins adapté que les autres candidatures."},
    {"c":"anas.berrada@example.com","o":"T","days":118,"status":"refusee","h":20,"cover":null,
     "note":"Dossier moins adapté que celui des autres candidats."}
  ]$j$::jsonb) with ordinality as e(value, ord) loop
    select ca.id, ca.user_id into cid, cuid
      from public.candidates ca join public.profiles p on p.id = ca.user_id where p.email = a->>'c';
    oid := (offers_map ->> (a->>'o'))::uuid;
    ivr := case when idx % 2 = 0 then rh1 else rh2 end;
    final_status := (a->>'status')::public.application_status;
    h := coalesce((a->>'h')::int, 12);
    with_iv := coalesce((a->>'withiv')::boolean, false);
    d := (a->>'days')::int;

    steps := case final_status
      when 'recue' then array['recue']
      when 'en_verification' then array['recue','en_verification']
      when 'en_evaluation' then array['recue','en_verification','en_evaluation']
      when 'preselectionnee' then array['recue','en_verification','en_evaluation','preselectionnee']
      when 'entretien_programme' then array['recue','en_verification','en_evaluation','preselectionnee','entretien_programme']
      when 'acceptee' then array['recue','en_verification','en_evaluation','preselectionnee','entretien_programme','acceptee']
      else case when with_iv
             then array['recue','en_verification','en_evaluation','preselectionnee','entretien_programme','refusee']
             else array['recue','en_verification','en_evaluation','refusee'] end
    end;
    offs := array[0, h, h + 24, h + 72, h + 120, h + 168];
    if final_status = 'refusee' and not with_iv then offs[4] := h + 96; end if;

    applied := date_trunc('day', now()) - make_interval(days => d)
               + make_interval(hours => 9 + (idx % 6)::int, mins => ((idx * 13) % 60)::int);
    last_ts := least(applied + make_interval(hours => offs[array_length(steps, 1)]), now() - interval '1 minute');

    insert into public.applications (candidate_id, offer_id, status, cover_letter, applied_at, updated_at, decided_at, decision_by)
    values (cid, oid, final_status, a->>'cover', applied, last_ts,
            case when final_status in ('acceptee', 'refusee') then last_ts end,
            case when final_status in ('acceptee', 'refusee') then ivr end)
    returning id into aid;
    -- (l'insertion déclenche le calcul automatique du score)
    update public.evaluations set evaluated_at = applied + interval '1 minute' where application_id = aid;

    for k in 1..array_length(steps, 1) loop
      ts := least(applied + make_interval(hours => offs[k]), now() - interval '1 minute');
      insert into public.application_status_history (application_id, old_status, new_status, changed_by, changed_at)
      values (aid, case when k = 1 then null else steps[k - 1]::public.application_status end,
              steps[k]::public.application_status, case when k = 1 then cuid else ivr end, ts);
    end loop;

    -- Entretiens
    if final_status = 'entretien_programme' then
      insert into public.interviews (application_id, scheduled_at, interviewer_id, location, status, comments)
      values (aid, date_trunc('day', now()) + make_interval(days => 2 + (idx % 4)::int, hours => 10), ivr,
              'Visioconférence (Teams)', 'programme', a->'iv'->>'com');
    elsif final_status = 'acceptee' or (final_status = 'refusee' and with_iv) then
      insert into public.interviews (application_id, scheduled_at, interviewer_id, location, status,
                                     score_communication, score_motivation, score_skills, score_fit, comments, result)
      values (aid, least(applied + make_interval(hours => offs[5] + 36), now() - interval '2 hours'), ivr,
              case when idx % 2 = 0 then 'Siège – Salle 2' else 'Visioconférence (Teams)' end, 'realise',
              (a->'iv'->>'c')::smallint, (a->'iv'->>'m')::smallint, (a->'iv'->>'s')::smallint, (a->'iv'->>'f')::smallint,
              a->'iv'->>'com', (a->'iv'->>'res')::public.interview_result);
    end if;

    -- Décisions finales
    if final_status in ('acceptee', 'refusee') then
      insert into public.decisions (application_id, decision, note, decided_by, decided_at)
      values (aid, final_status, a->>'note', ivr, last_ts);
    end if;

    n_apps := n_apps + 1;
  end loop;

  alter table public.applications enable trigger trg_applications_history;
  alter table public.interviews enable trigger trg_interviews_scheduled;

  raise notice 'Données de démonstration créées : % candidatures.', n_apps;
end
$seed$;

-- Contrôle rapide
select 'Offres' as element, count(*) as nombre from public.offers where created_by in (select id from public.profiles where email in ('rh@example.com', 'rh2@example.com'))
union all select 'Candidatures', count(*) from public.applications a join public.candidates c on c.id = a.candidate_id join public.profiles p on p.id = c.user_id where p.email like '%@example.com'
union all select 'Évaluations (scores)', count(*) from public.evaluations
union all select 'Entretiens', count(*) from public.interviews
union all select 'Décisions finales', count(*) from public.decisions;
