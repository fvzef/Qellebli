# QELLEBLI — Scénario de démonstration (≈ 10 minutes)

**Préparation** : application lancée (`npm run dev`), données `006_seed_demo.sql` chargées. Mot de passe de tous les comptes : `Demo2026!Qellebli`. Avant la présentation, connectez-vous une fois avec chacun des trois comptes (menu **Changer d'espace → Ajouter un compte**) : vous passerez ensuite d'un espace à l'autre en un clic, sans vous déconnecter. Dans le navigateur, désactivez la traduction automatique.

## 1. Le problème (30 s)
Les candidatures arrivent dispersées, leur traitement est long et peu traçable. QELLEBLI les centralise, les évalue de façon transparente et laisse la décision aux humains.

## 2. Espace candidat — `candidat@example.com` (2 min)
1. **Tableau de bord** : profil complété, candidatures en cours.
2. **Mon profil** : formation, compétences, projets, langues ; téléverser un CV (PDF).
3. **Offres** : ouvrir « Assistant Ressources Humaines » → *Envoyer ma candidature*.
4. **Mes candidatures** : statut « Reçue » et historique ; montrer qu'**aucun score** n'est visible par le candidat.

## 3. Espace RH — `rh@example.com` (5 min)
1. **Tableau de bord** : les 8 indicateurs, l'entonnoir, la liste « À traiter » (la candidature de Yasmine y apparaît).
2. **Candidatures** : filtrer par offre et score minimum ; trier par score.
3. **Pipeline** : une colonne par étape ; glisser une carte de « Reçue » vers « En vérification » ; glisser vers « Entretien programmé » ouvre la planification ; glisser vers « Acceptée » ou « Refusée » demande une confirmation avec justification. Les cartes décidées sont verrouillées.
4. **Voir** la candidature de Yasmine pour l'offre RH :
   - score global et par critère, explication, points forts et points à améliorer ;
   - conditions d'éligibilité (information, jamais éliminatoire) ;
   - changer le statut en « En vérification » → l'historique se met à jour.
5. **Comparaison** : choisir l'offre « Assistant Marketing Digital » et comparer 2 ou 3 candidats : tableau côte à côte, **sans gagnant désigné**.
6. **Entretiens** : programmer un entretien → le statut passe à « Entretien programmé » ; ouvrir un entretien réalisé pour montrer la grille d'évaluation.
7. **Décision finale** : sur un dossier, saisir une justification puis *Accepter* (avec confirmation) ; rappeler que la décision est humaine.

## 4. Espace Direction — `direction@example.com` (2 min)
1. **Tableau de bord** : indicateurs de recrutement et de performance (délai de traitement initial, taux d'acceptation, dossiers en attente).
2. **Statistiques** : résultats par offre, candidatures par mois, distribution des scores, méthode de calcul.
3. Souligner que la Direction ne voit **aucune donnée personnelle**.

## 5. Retour au candidat (30 s)
Dans la session candidat, **Mes candidatures** montre le nouveau statut : le suivi est bouclé.

## Messages clés
- Centralisation et traçabilité de 100 % des candidatures.
- Score **transparent** (5 critères pondérés 25/30/20/15/10) qui n'élimine jamais personne.
- Indicateurs calculés sur les données réelles ; le *délai de traitement initial* permet de mesurer le gain de temps.
- Sécurité par rôle appliquée jusque dans la base de données.
