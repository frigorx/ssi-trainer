# SSI Trainer

**Simulateur pédagogique de Système de Sécurité Incendie (SSI)** pour la formation aux métiers de la sécurité, du **CAP Agent de sécurité** au **BTS Management Opérationnel de la Sécurité (MOS)**.

🔗 **Démonstration en ligne : [frigorx.github.io/ssi-trainer](https://frigorx.github.io/ssi-trainer/)**

L'élève exploite un poste de sécurité réaliste (ECS, CMSI, baie multi-bâtiments), applique les procédures de mise en sécurité et obtient une évaluation par compétences. Le simulateur fonctionne **100 % dans le navigateur, sans aucun serveur ni collecte de données**.

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

> ⚠️ Cet outil évalue **uniquement la composante sécurité incendie**, à titre **pédagogique**. Il n'est **pas certificatif** et la grille de compétences C1–C8 est une grille « maison » inspirée du SSIAP 1, **pas** un référentiel officiel de diplôme.

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
enseignant.html             Espace enseignant (accès réservé)
tableau-de-bord.html        Tableau de bord de suivi (100 % local)
js/                         Moteur SSI, lecteur de scénarios, évaluation…
css/                        Feuilles de style
scenarios/                  Scénarios pédagogiques (JSON)
referentiels/               Grille de compétences et rapprochements diplômes
test/                       Tests Node
docs/                       Spécifications et conception
```

## Crédits

Réalisé par **F. Henninot** — **LPP/UFA Jacques Raynaud — Campus ÉQUATIO** (Marseille).

## Licence

[Creative Commons Attribution - Pas d'Utilisation Commerciale - Partage dans les Mêmes Conditions 4.0 (CC BY-NC-SA 4.0)](LICENSE). Réutilisation et adaptation possibles pour un usage pédagogique non commercial, en citant l'auteur et sous la même licence.
