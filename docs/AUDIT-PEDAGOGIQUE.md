# SSI Trainer — Audit pédagogique complet (25/06/2026)

> Audit multi-agents (cartographie + 9 dimensions + vérification réglementaire). Cible : transformer SSI Trainer en **véritable outil pédagogique évalué, du CAP au BTS MOS**, avec niveaux d'accréditation, document papier (main courante), note finale et export PDF.
> Méthode : lecture du code + recherche réglementaire (anti-hallucination). La double-vérification croisée et la synthèse automatique ont été interrompues par une coupure réseau ; la synthèse ci-dessous est consolidée manuellement à partir des 9 audits.

## Note globale : ~4,8 / 10 — « socle excellent, outil d'évaluation à construire »

Le **moteur SSI** et le **Niveau 1 refondu** sont de très bonne facture (≈ 7,5/10). La note est tirée vers le bas par tout ce qui fait la « version ultime » et qui **n'existe pas encore** : notation finale, export PDF, profil élève / multi-diplômes, refonte N2-N3, main courante réglementaire, accessibilité complète.

| Dimension | Note | Verdict court |
|---|---|---|
| Conformité réglementaire & justesse SSI | 6,5 | Moteur conforme NF S 61-931/934 ; contenu juste sur N1 |
| Ergonomie / accessibilité / UX | 6,2 | Double écran réussi ; ARIA/contrastes/mobile à reprendre |
| Document papier / main courante | 5,5 | Existe mais **non conforme** (3 colonnes vs 7, pas d'en-tête) |
| Évaluation & notation finale | 5,5 | Scoring présent mais **pas de note finale formalisée** |
| Niveaux d'accréditation / accès | 4,5 | Accès N2 sur N1 seulement ; **diplômes jamais exploités** |
| Architecture technique | 4,5 | Base saine mais N2/N3 dupliqués, pas de profil/persistance |
| Scénarisation & réalisme | 4,0 | 2 scénarios jouables ; **zones N2/N3 incohérentes** |
| Progressivité CAP→BTS | 3,5 | **Aucun lien diplôme ↔ niveau ↔ contenu** |
| Export PDF d'évaluation | 3,0 | Inexistant (window.print seulement, rien n'est persisté) |

## Forces confirmées (à préserver)
- **Moteur SSIEngine** conforme NF S 61-931/934 : machine à états, double knock, délai veille restreinte 5 min, journal horodaté.
- **Niveau 1 refondu** : palette d'actions, niveau d'accès 2, document élève (conduite à tenir vivante, main courante, questions), levée de doute interactive, fiche papier, 3 paliers, bilan.
- **Architecture réutilisable** : `PosteEleve` (scenario-pedago.js), `pedago.css` (variables, info jamais par couleur seule), scénario-player (scoring par action/délai/compétence).
- **Référentiel SSIAP 1** (C1-C8) correctement adossé à l'arrêté du 2 mai 2005.

## Les 8 manques structurants (récurrents dans presque toutes les dimensions)
1. **N2 (CMSI) et N3 (baie) non refondus** : pas de document élève, pas de bilan, `prompt()`/`alert()`, code dupliqué ~70 %. → bloquant pour un usage classe.
2. **Pas de note finale formalisée** : le score est un simple % ; aucune distinction faute grave / mineure, aucune cascade d'erreurs, aucune pondération.
3. **Pas d'export PDF ni de persistance** : tout est volatil (perdu au rechargement) ; `window.print()` seul.
4. **Multi-diplômes absent** : le champ `diplomes` des scénarios n'est jamais lu ; pas de sélecteur de diplôme, pas de filtrage, pas d'accréditation/progression.
5. **Main courante non réglementaire** : 3 colonnes (Heure/Événement/Action) au lieu des colonnes attendues (+ zone, agent, signature, observations) et sans en-tête légal.
6. **Cohérence des zones N2/N3 cassée** : les scénarios déclarent des zones (`ZC*`, `BAT-*`) non initialisées dans les pages → journaux illisibles, scénarios injouables.
7. **Accessibilité incomplète** : pas d'ARIA, contrastes/tailles de police limites sur l'écran ECS, responsive mobile/tablette cassé (< 1100 px empile mal).
8. **Vocabulaire ambigu** : « niveau 2 » désigne tantôt le niveau d'accès (réglementaire), tantôt le niveau de difficulté (ECS/CMSI/baie).

## Modèle d'évaluation proposé (à valider)

Fondé sur ce qui est **vérifié** (référentiel SSIAP 1 C1-C8, arrêté 2 mai 2005). Les seuils par diplôme et les grilles CCF restent **à confirmer** avec sources officielles / collègues (anti-hallucination).

- **Évaluation par compétence** : chaque scénario évalue un sous-ensemble de C1-C8 (via `actions_attendues`).
- **Par action attendue** : faite dans le délai = 100 % ; en retard = 50 % ; non faite = 0 ; **qualité** (ex. message d'alerte 18 complet) = modulation.
- **Fautes graves** (définies par scénario) : **plafonnent** la note. Ex. : réarmer sans levée de doute, évacuer sur fausse alarme, omettre l'alerte 18 sur feu confirmé, commande engageante sans niveau d'accès 2.
- **Cascades** : une action dépendante d'une action manquée devient « non évaluable » (et non « 0 »).
- **Note finale** = points obtenus / points max → ramenée **/20**, avec malus fautes graves.
- **Restitution** : note /20 + **barre par compétence** + liste des fautes + **observations formateur** (champ libre) → **PDF**.
- **Progressivité** : du CAP au BTS, mêmes compétences mais délais plus stricts, complétude exigée, et palier de guidage décroissant.

## Feuille de route proposée (« brancher le neuf avant de retirer l'ancien »)

- **Phase 2 — Socle « évaluation » sur le N1 (modèle)** : profil élève (nom/classe/diplôme) + persistance localStorage ; moteur de notation (note /20 + par compétence + fautes graves) ; **export PDF** du bilan (identité, chronologie, actions/erreurs, note, compétences, observations) ; main courante au **format réglementaire**. Tout vérifié sur N1.
- **Phase 3 — Décliner N2 (CMSI) et N3 (baie)** : mutualiser le code (PosteEleve + CSS commun), **recaler les zones**, créer documents élève + scénarios cohérents + bilan ; supprimer `prompt()`/`alert()`.
- **Phase 4 — Multi-diplômes & accréditation** : référentiels par diplôme (vérifiés aux sources), filtrage/adaptation par diplôme, banque de scénarios indexée (compétence × diplôme × type d'ERP), progression/accréditation.
- **Phase 5 — Accessibilité & finitions** : WCAG (ARIA, contrastes, tailles, responsive mobile/tablette), vocabulaire « accès » vs « difficulté », guide formateur, nettoyage du code en veille.

## Points réglementaires à confirmer avant la Phase 4 (ne pas inventer)
- Référentiels et **modalités d'évaluation (CCF)** exacts de : CAP Agent de sécurité, Bac Pro Métiers de la sécurité, BP, BTS MOS (sources BO / arrêtés de création).
- **Format officiel d'une main courante / registre de sécurité** de PC sécurité (colonnes, mentions, en-tête).
- Correspondance fine scénario ↔ Annexe I de l'arrêté du 2 mai 2005 (déjà partiellement faite).

## Décisions attendues du commanditaire
1. **Forme de la note finale** : note /20 globale ? + détail par compétence ? positionnement acquis/en cours/non acquis ?
2. **Main courante** : format réglementaire complet partout, ou différencié par diplôme (léger CAP → complet BP/BTS) ?
3. **Ordre de construction** : socle évaluation+PDF sur N1 d'abord, ou refonte N2/N3 d'abord, ou multi-diplômes d'abord ?

*Détail exhaustif des 9 audits (forces, faiblesses, recommandations P0/P1/P2 avec effort) disponible dans le résultat du workflow d'audit.*
