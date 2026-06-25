# SSI Trainer — Conception vérifiée des Niveaux 2 (CMSI) et 3 (baie)

> Document de référence (caution technique). Contenu conçu puis **vérifié par recherche sur sources officielles** (anti-hallucination), relu sous l'angle réglementaire SSI. Date : 25/06/2026.

## Niveau 2 — CMSI (Centralisateur de Mise en Sécurité Incendie)

**Équipement :** CMSI — Centralisateur de Mise en Sécurité Incendie cat. A (12 zones de détection, DAS de compartimentage + désenfumage)

- **Zones de détection :** 12
- **DAS :** 9 (compartimentage x4, desenfumage x5)
- **Gestes opérateur :** acquittement, arret_signal, acquit_zone, levee_doute, appel_18, commande_das, evacuation_generale, accueil_pompiers, rearmement, test_signalisation

### Scénarios
- **Incendie bureau R+1 — Maîtrise par compartimentage** (`n2_compartimentage_escalier`) — ERP type W, Immeuble de bureaux — ERP type W, R+2 sur sous-sol technique.
  6 actions évaluées, 4 fautes graves, 6 questions. Compétences : C2, C3, C6, C4, C8.
- **Incendie local technique — Gestion de défaillance DAS** (`n2_defaillance_das_decision`) — ERP type U, Établissement de santé (ERP type U), 200 lits.
  7 actions évaluées, 5 fautes graves, 6 questions. Compétences : C2, C3, C7, C4, C8.

## Niveau 3 — Baie multi-bâtiments (bus RS485)

**Équipement :** Baie multi-bâtiments reliée par bus RS485 (plusieurs CMSI coordonnés)

- **Zones de détection :** 13
- **DAS :** 13 (compartimentage x8, desenfumage x3, coupure x2)
- **Gestes opérateur :** acquittement, arret_signal, levee_doute, appel_18, evacuation_generale, commande_das, coupure_energies, accueil_pompiers, reconnaitre_defaut_das, test_signalisation, rearmement

### Scénarios
- **Feu électrique sous-sol — Propagation inter-bâtiments et défaillances en cascade** (`n3_incendie_sous_sol_propag_inter`) — ERP type W, Siège administratif avec ateliers — 3 bâtiments reliés par galeries techniques souterraines.
  8 actions évaluées, 4 fautes graves, 5 questions. Compétences : C2, C3, C4, C6, C8.
- **Évacuation horizontale — UTP avec PMR et zone refuge** (`n3_crise_sanitaire_pmr`) — ERP type R, Site mixte — Bât B : ateliers/Unité de Travail Protégé (UTP). Bât A : siège administratif servant de zone refuge. Bât C : production. Liaison par galeries souterraines sécurisées..
  7 actions évaluées, 4 fautes graves, 5 questions. Compétences : C2, C3, C4, C6, C8.

## Sources réglementaires

- NF S 61-931 : SSI — dispositions générales (dont logique de double détection et alarme générale)
- NF S 61-933 : SSI — exploitation et maintenance (vérifications périodiques des DAS)
- NF S 61-934 : Centralisateur de Mise en Sécurité Incendie (CMSI) — règles de conception
- NF S 61-937 : Dispositifs Actionnés de Sécurité (DAS) — délai de fermeture des PCF < 30 s, ventouses
- Arrêté du 2 mai 2005 modifié : missions, emploi et qualification du personnel des services de sécurité incendie (SSIAP) des ERP et IGH
- Référentiel SSIAP 1 : compétences C1 à C8
- diplomes-securite.json : BACPRO_MS (RNCP39133), BP_ATPS (RNCP38227)
- Arrêté du 2 mai 2005 modifié — Annexe I : compétences SSIAP 1 (C1-C8)
- NF S 61-931 : SSI — dispositions générales (double détection)
- NF S 61-932 : SSI — règles d'installation
- NF S 61-934 : Centralisateur de Mise en Sécurité Incendie (CMSI)
- NF S 61-937 : Dispositifs Actionnés de Sécurité (DAS) — délai de fermeture PCF < 30 s, ventouses type rupture
- NF EN 81-73 : Comportement des ascenseurs en cas d'incendie (rappel à un niveau, non-usage en évacuation)
- diplomes-securite.json : BP_ATPS (RNCP38227), BTS_MOS (RNCP41000)

## Notes de réalisme (extraits)


_Les scénarios complets sont dans `scenarios/*.json` (format unifié avec le Niveau 1)._
