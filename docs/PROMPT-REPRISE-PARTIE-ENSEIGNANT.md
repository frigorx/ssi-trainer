# Prompt de reprise — Conception de la « partie enseignant » de SSI Trainer

> **Comment l'utiliser** : ouvre un **nouveau chat Claude Code** dans `C:\git\ssi-trainer`, puis écris : *« Lis `docs/PROMPT-REPRISE-PARTIE-ENSEIGNANT.md` et la mémoire du projet, puis commençons la conception de la partie enseignant. »*
> Réglages conseillés pour ce chat : **Opus 4.8, effort élevé, ultracode ON** (c'est de la conception d'architecture + RGPD : la réflexion multi-angles et la vérification adversariale sont précieuses).
> **Phase = CONCEVOIR d'abord (spec + feuille de route + décisions), pas coder tout de suite.** Le simulateur existant ne doit pas être cassé ni complexifié inutilement (cf. mémoire `feedback-ergonomie-sobriete`).

---

## 1. Contexte — où en est le projet

**SSI Trainer** = simulateur web pédagogique de Système de Sécurité Incendie pour la formation à la sécurité (filière CAP → BTS MOS). Fait par Franck Henninot (prof froid/clim, LP Jacques Raynaud, Marseille) pour ses collègues de sécurité. **C'est une vitrine** (audit par un prof de sécurité, reconnaissance pro de Franck) : exigence de soin, de réalisme métier et d'anti-invention.

- **Dépôt** : `C:\git\ssi-trainer` (sous git) ; en ligne sur **GitHub Pages** : https://frigorx.github.io/ssi-trainer/ (public). Source de vérité de l'état = les commits + la fiche mémoire `project_ssi_trainer.md`.
- **Pile actuelle** : 100 % **statique** (HTML/CSS/JS pur, aucun build, aucun backend), fonctionne **hors-ligne**, mobile/tablette. **Aucune donnée n'est collectée côté serveur** (le profil élève reste en `localStorage`, l'évaluation sort en PDF / copie papier ramassée).

**Ce qui est FAIT et en ligne (côté élève) :**
- 3 niveaux complets et **évalués** : N1 ECS (`ssi-niveau1.html`), N2 CMSI et N3 baie multi-bâtiments (`ssi-niveau2/3.html`, pilotés par le contrôleur générique data-driven `js/ssi-niveau.js`).
- Document élève : **mission + objectifs pédagogiques + consignes** (affichés avant de démarrer), conduite à tenir vivante, **gestes opérateur** (levée de doute, appel 18, commande DAS, coupure énergies, accueil secours), **main courante** réglementaire (différenciée par diplôme), questions.
- **Évaluation** : `js/evaluation.js` → note /20 + **positionnement par compétence à 4 niveaux + Non évalué** (Non acquis / Partiellement acquis / Acquis / Parfaitement acquis ; grille C1-C8) + **fautes graves** qui plafonnent la note. **Export PDF** du bilan + main courante + réponses + observations formateur.
- **Filtrage des scénarios par diplôme** (profil élève : `js/profil-eleve.js`, codes `CAP_AS / BACPRO_MS / BP_ATPS / BTS_MOS`).
- **Accessibilité** : aria-live, dialogues, focus clavier, `prefers-reduced-motion`, responsive.
- **Feuille de guidance élève** imprimable : `guide.html`.
- **Référentiels** : `referentiels/competences_ssiap1.json` (C1-C8) ; `referentiels/diplomes-securite.json` (CAP/BP/Bac Pro/BTS MOS, codes RNCP, modes de notation, **sources officielles** — fiches BP/BacPro/BTS marquées « partiel », à reconfirmer avant déploiement réel).
- Cautions techniques : `docs/AUDIT-PEDAGOGIQUE.md`, `docs/CONCEPTION-N2-N3.md`, `docs/SPEC-PEDAGOGIE.md`.

**Ce qui est volontairement HORS de la version actuelle :**
- **Espace formateur / remontée numérique des notes** : le tableau de bord `formateur.html` est **en veille** ; le bouton « Accès formateur » (code `1234`) a été **retiré du site public** car un code côté client n'est pas un secret. ⚠️ NE PAS confondre avec le **code « niveau d'accès 2 » = `2222`**, lui pédagogique et volontairement public (geste métier).

---

## 2. Mission de ce chat — imaginer ENTIÈREMENT la partie enseignant

Concevoir, de la vision à l'architecture, **l'espace enseignant** de SSI Trainer : ce qu'il permet, ce qu'il gère, comment, et **à quelles conditions techniques/légales il devient utilisable par plusieurs établissements en ligne**. Franck laisse le champ libre pour proposer ; il tranchera les décisions.

### 2.1 Ce que la partie enseignant pourrait permettre (à explorer, enrichir, prioriser)
- **Rôles** : Admin établissement / Enseignant / Élève (et peut-être « invité/démo » sans compte).
- **Gestion classes & élèves** : créer des classes, leur associer un **diplôme**, y inscrire des élèves (saisie manuelle, **import liste** CSV / ENT / École Directe ?).
- **Affectation d'exercices** : choisir les scénarios/niveaux accessibles à une classe, **imposer un palier** (Guidé / Autonome / Exploration), un **mode entraînement vs examen**, une échéance.
- **Mode examen** : verrouillage de la session, horodatage, traçabilité non modifiable.
- **Suivi & résultats** : tableau de bord des **notes /20 et positionnements par compétence** (C1-C8) par élève et par classe, historique, **agrégats** (« qui maîtrise C6 ? »), export PDF/CSV, base pour le bulletin.
- **Édition de contenu sans coder** : éditeur de scénarios (zones, DAS, événements, questions, fautes graves), gestion des **référentiels par diplôme**, banque de scénarios partagée.
- **Paramétrage** : barèmes/seuils par diplôme, code d'accès niveau 2, durées, langue, contenus actifs.

### 2.2 Décisions / questions structurantes à trancher (le cœur de la demande de Franck)
1. **Architecture** : peut-on rester statique + stockage local, ou faut-il un **backend** ? (réponse quasi certaine : backend nécessaire dès qu'il y a comptes + persistance + suivi.) Lequel ? **Piste forte : Supabase** (Auth + Postgres + **RLS** pour le cloisonnement, hébergement **EU**) — déjà envisagé par Franck pour le module stage ([[project-stage-supabase]]). Alternatives : Firebase, petit backend Node. **Garder le simulateur utilisable SEUL (mode libre/démo) sans compte.**
2. **Multi-établissements / multi-classes / simultanéité** : modèle de données **multi-tenant** (établissement → classes → élèves → sessions → résultats), **isolation stricte** des données entre établissements (un prof ne voit que ses classes), passage à l'échelle (plusieurs écoles, plusieurs classes en même temps), gestion de la concurrence.
3. **Authentification & rôles** : comptes enseignants (pas de « code partagé »), gestion des élèves (comptes ou simples identifiants de classe ?), récupération de mot de passe, SSO/ENT éventuel.
4. **RGPD (sujet majeur — élèves souvent MINEURS, données scolaires)** :
   - base légale, **responsable de traitement** (l'établissement) vs **sous-traitant** (l'outil) → contrat de sous-traitance (DPA) ;
   - **hébergement UE**, **minimisation** (pseudonymiser ? identifiant élève au lieu du nom complet ?), **durée de conservation**, **information & consentement** (parental selon l'âge), **droits** des personnes, **registre**, **sécurité** (RLS, chiffrement, journalisation), articulation avec le **DPD** de l'établissement/académie ;
   - cohérence avec le dossier **IA Act** déjà ouvert ([[project-ia-act-conformite]]).
5. **Accessibilité institutionnelle** : **RGAA** (accessibilité des services publics) si déploiement académique.
6. **Hébergement, coût, maintenance** : free tier viable ? Coût à l'échelle ? **Un seul enseignant-développeur** → privilégier le simple et le maintenable (cf. `feedback-ergonomie-sobriete`).
7. **Interopérabilité** : import des classes (CSV/ENT/École Directe), export des notes (bulletin/ENT), formats.
8. **Mode dégradé / hors-ligne** : préserver l'usage sans connexion (cohérent avec l'existant) ; synchronisation différée ?

### 2.3 Contraintes & principes
- **Sobriété d'abord** : ne pas sur-complexifier ; le simulateur statique doit rester fonctionnel et autonome. Brancher le neuf sans casser l'ancien.
- **RGPD / EU by design** ; **anti-invention** (vérifier le réglementaire et les référentiels aux sources, cf. `feedback-anti-hallucination`).
- **Cap projet : rentrée septembre 2026.**
- Langue : **français**, zéro anglicisme inutile ; exemples neutres (« un élève »).

---

## 3. Livrables attendus de ce chat (dans l'ordre)
1. Une **note de cadrage / réponses** aux 8 questions ci-dessus (notamment : faut-il un backend ? Supabase ou autre ? schéma RGPD ?).
2. Une **spec d'architecture** de la partie enseignant (`docs/SPEC-PARTIE-ENSEIGNANT.md`) : rôles, modèle de données multi-tenant, parcours, sécurité, RGPD, hébergement, coûts.
3. Une **feuille de route par phases** (du MVP au complet), avec ce qui peut être un POC.
4. Les **décisions à faire trancher par Franck** (options + recommandation).
> Ne commence à coder qu'après validation de la direction par Franck. Avant tout codage, **annoncer modèle + effort + ultracode** conseillés (Franck applique — cf. `feedback-reglages-intelligence`).

---

## 4. Pour démarrer vite
- Lire la mémoire : `project_ssi_trainer.md` (état complet + historique des décisions), `project-stage-supabase`, `project-ia-act-conformite`, et les feedbacks (`ergonomie-sobriete`, `anti-hallucination`, `decider-sans-redemander`, `efficacite-tokens`).
- Survoler le code : `js/ssi-niveau.js`, `js/scenario-pedago.js`, `js/evaluation.js`, `js/profil-eleve.js`, `scenarios/*.json`, `referentiels/*.json`, `formateur.html` (l'ébauche de tableau de bord en veille, à repenser proprement).
- Le simulateur tourne en local via `.claude/launch.json` (config `ssi-trainer`, `python -m http.server` sur le port 2010).
