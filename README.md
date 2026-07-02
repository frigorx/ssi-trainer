# SSI Trainer

**Simulateur pédagogique de Système de Sécurité Incendie (SSI)** pour la formation aux métiers de la sécurité, du **CAP Agent de sécurité** au **BTS Management Opérationnel de la Sécurité (MOS)**.

🔗 **Démonstration en ligne : [frigorx.github.io/ssi-trainer](https://frigorx.github.io/ssi-trainer/)**

L'élève exploite un poste de sécurité réaliste (ECS, CMSI, baie multi-bâtiments), applique les procédures de mise en sécurité et obtient une évaluation par compétences. Le simulateur fonctionne **100 % dans le navigateur, sans aucun serveur ni collecte de données**.

> **Statut : v0.9-beta, en relecture métier.** Le projet est actuellement soumis à la relecture d'enseignants de la filière sécurité afin d'en vérifier la justesse (vocabulaire SSI, cohérence des procédures) avant une éventuelle diffusion plus large. Voir [CHANGELOG.md](CHANGELOG.md).

## Objectifs pédagogiques

SSI Trainer n'a pas vocation à remplacer une formation réglementaire, une maquette SSI réelle ou une certification SSIAP. C'est un support **complémentaire** pour :

- analyser une situation d'alarme et prioriser les actions ;
- s'approprier le vocabulaire et les procédures SSI ;
- s'entraîner à un traitement d'alarme complet (acquittement → levée de doute → décision → alerte → mise en sécurité) ;
- rédiger une main courante ;
- préparer un débriefing structuré avec l'enseignant ;
- multiplier les scénarios au-delà de ce que permettent des maquettes SSI parfois anciennes ou limitées.

## Public visé

Élèves des formations de la filière sécurité : **CAP Agent de sécurité**, **Bac Pro Métiers de la sécurité**, **BP ATPS**, **BTS MOS** — la difficulté et le format de la main courante s'adaptent au diplôme sélectionné.

---

## Fonctionnalités

- **3 niveaux d'équipement**
  - **Niveau 1 — ECS** : équipement de contrôle et de signalisation (détection, acquittement, levée de doute, réarmement).
  - **Niveau 2 — CMSI** : centralisateur de mise en sécurité incendie (commande des DAS, compartimentage, désenfumage, niveau d'accès 2).
  - **Niveau 3 — Baie multi-bâtiments** : gestion de crise coordonnée (bus RS485, coupure des énergies, évacuation PMR).
- **Évaluation** : note /20 + **positionnement par compétence** (échelle à 4 niveaux + « non évalué ») + détection des **fautes graves** (plafonnement de la note).
- **Document élève** : mission, conduite à tenir, main courante horodatée, questions ; **fiche papier** imprimable (mode dégradé).
- **Bilan exportable** en PDF (impression) et HTML autoportant.
- **Espace enseignant** (accès réservé) : récupération des évaluations, vue des scénarios, grille d'évaluation, et **tableau de bord local** (matrice élèves × compétences, import de jetons, export CSV) — sans aucune donnée sur un serveur.
- **Accessibilité** : `aria-live`, navigation clavier, `prefers-reduced-motion`, responsive mobile/tablette.

## Cadre réglementaire

Les situations s'appuient sur les normes **NF S 61-931 à 61-937 / 61-961** (SSI) et l'**arrêté du 2 mai 2005** (qualification SSIAP).

> ⚠️ **SSI Trainer est un simulateur pédagogique non certificatif.** Il ne remplace ni une formation réglementaire, ni les consignes de sécurité d'un établissement, ni l'exploitation d'un SSI réel. Les scénarios sont volontairement simplifiés pour l'apprentissage et doivent être débriefés par un formateur compétent. La grille de compétences C1–C8 est une grille « maison » inspirée du SSIAP 1, **pas** un référentiel officiel de diplôme. Détails et conditions d'utilisation : [LEGAL.md](LEGAL.md).

## Utilisation

Site 100 % statique (HTML/CSS/JS, sans étape de build).

- **En ligne** : ouvrir la [démo](https://frigorx.github.io/ssi-trainer/).
- **En local** : cloner le dépôt puis servir le dossier, par exemple
  ```bash
  python -m http.server 8000
  ```
  et ouvrir `http://localhost:8000/`.

## Tests

Trois suites de tests Node (sans dépendance) :

```bash
node test/schema-bilan.test.js
node test/tableau-agregation.test.js
node test/engine.test.js
```

## Structure

```
index.html                 Accueil (choix des niveaux)
ssi-niveau1/2/3.html        Les 3 simulateurs
guide.html                  Guide de l'élève (imprimable)
glossaire.html               Glossaire SSI (sigles, vocabulaire)
enseignant.html             Espace enseignant (accès réservé)
tableau-de-bord.html        Tableau de bord de suivi (100 % local)
js/                         Moteur SSI, lecteur de scénarios, évaluation…
css/                        Feuilles de style
scenarios/                  Scénarios pédagogiques (JSON)
referentiels/               Grille de compétences et rapprochements diplômes
test/                       Tests Node
docs/                       Spécifications, conception et documents de travail
```

## Documentation

- [CHANGELOG.md](CHANGELOG.md) — historique des versions.
- [LEGAL.md](LEGAL.md) — avertissement pédagogique et conditions d'utilisation.
- [CONTRIBUTING.md](CONTRIBUTING.md) — signaler une erreur ou proposer une correction.
- [SECURITY.md](SECURITY.md) — signaler un problème de sécurité.
- `docs/` — spécifications pédagogiques, conception technique, documents de relecture.

## Démarche qualité

Le projet est développé avec l'aide d'outils numériques modernes, puis relu par des enseignants de la filière sécurité afin d'en vérifier la justesse (vocabulaire SSI, cohérence des procédures, intérêt pédagogique). Les retours sont intégrés progressivement — voir [CONTRIBUTING.md](CONTRIBUTING.md) pour proposer une correction.

## Crédits

Réalisé par **F. Henninot** — **LPP/UFA Jacques Raynaud — Campus ÉQUATIO** (Marseille).

## Licence

[Creative Commons Attribution - Pas d'Utilisation Commerciale - Partage dans les Mêmes Conditions 4.0 (CC BY-NC-SA 4.0)](LICENSE). Réutilisation et adaptation possibles pour un usage pédagogique non commercial, en citant l'auteur et sous la même licence. Voir aussi [LEGAL.md](LEGAL.md).
