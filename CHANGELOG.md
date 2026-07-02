# Journal des modifications

Généré à partir de l'historique réel du dépôt. Ordre chronologique.

## v0.9-beta — en relecture métier (juillet 2026)

Le projet est actuellement soumis à la relecture des enseignants de la filière sécurité pour en vérifier la justesse (vocabulaire SSI, cohérence des procédures) avant une éventuelle diffusion plus large.

### Accessibilité et lecture adaptée
- Bouton « lecture adaptée » (taille du texte, interligne, espacement) sur toutes les pages.
- Positionnement par compétence affiché avant la note (indicateur secondaire).
- Glossaire SSI ajouté.

### Contenu pédagogique
- Deux nouveaux scénarios Niveau 1 : « Première alarme » (initiation) et « Fumées et victime » (alerte structurée avec victime).
- Corrections réglementaires suite à audit externe (double détection, levée de doute, code d'accès fictif, formulations trop absolues nuancées).
- Correction de la compétence associée à la commande de DAS (défaillance) : compartimentage (C6), pas désenfumage (C7).

### Espace enseignant
- Dossier pédagogique complet par scénario (mission, barème, fautes graves avec déclencheur, questionnaire corrigé, repères formateur), généré en direct depuis les scénarios.
- Tableau de bord de suivi 100 % local (matrice élèves × compétences, import de jetons, export CSV).

### Hygiène et audit
- Suppression du legacy non conforme (ancienne page formateur, export par webhook).
- Ajout des fichiers `LICENSE`, `LEGAL.md`, `README.md`.
- Identité visuelle unifiée sur toutes les pages.

## v0.1 → v0.8 — développement initial (avril – juin 2026)

- Simulateur grandeur nature : 3 niveaux d'équipement (ECS, CMSI, baie multi-bâtiments).
- Moteur SSI conforme NF S 61-931/934 (alarme restreinte/générale, double détection, DAS, journal).
- Refonte pédagogique du Niveau 1 en module modèle (levée de doute interactive, main courante, fiche papier).
- Socle d'évaluation : note /20, positionnement par compétence, fautes graves plafonnantes, export PDF.
- Extension aux Niveaux 2 (CMSI) et 3 (baie multi-bâtiments), avec scénarios vérifiés aux sources normatives.
- Filtrage des scénarios par diplôme (CAP → BTS), accessibilité de base (clavier, lecteurs d'écran, animations réduites).
- Guide de l'élève et objectifs/consignes par exercice.
- Retrait de l'ancien accès formateur public (un code côté navigateur n'est pas sécurisable sur un site statique).
