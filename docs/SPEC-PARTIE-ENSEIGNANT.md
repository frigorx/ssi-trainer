# SPEC — Partie enseignant de SSI Trainer

> **Statut : conception (26/06/2026). Rien n'est codé.** Document de cadrage + architecture + feuille de route, à valider par Franck avant tout codage.
> Issu d'un workflow multi-agents (4 dimensions : architecture, RGPD, produit, coût/maintenance) avec **vérification adversariale aux sources** des affirmations réglementaires (anti-invention). Les corrections apportées par la vérification sont signalées **⚠️ Vérifié** avec leur source.
> Ne casse pas le simulateur statique existant : le mode libre/démo reste autonome et inchangé.

---

## 1. Direction recommandée (résumé exécutif)

**Avancer en DEUX BLOCS et en DEUX TEMPS.**

- **Bloc 1 — l'existant, intact.** Le simulateur reste 100 % statique sur GitHub Pages : mode libre/démo, sans compte, hors-ligne, évaluation en PDF / copie papier. Il **ne doit jamais appeler le réseau** et ne dépend de personne. C'est le cœur de la vitrine.
- **Bloc 2 — la partie enseignant, ajoutée sans rien casser.** Pour la rentrée **septembre 2026**, viser un **MVP « tableau de bord enseignant » 100 % LOCAL, sans backend** : l'élève termine son scénario et génère un **jeton de résultat** (le bilan JSON déjà produit par `evaluation.js`) ; l'enseignant l'importe par lot dans un tableau de bord **en navigateur** (IndexedDB/localStorage), avec **vue agrégée par compétence** et export PDF/CSV.

**Pourquoi ce choix.** Ce MVP local prouve **toute la chaîne de valeur** (affecter → jouer → remonter → agréger les positionnements) **sans aucune donnée de mineur sur un serveur**, donc **sans déclencher le dossier RGPD lourd** (pas de DPA, pas d'AIPD, pas de registre). Il tient le cap pour un enseignant‑développeur seul et ne fragilise pas l'existant.

**Le backend ne vient qu'ensuite**, et uniquement **si un établissement porte officiellement le traitement** avec son DPD. Si backend il y a : **Supabase (Postgres + Auth + RLS), région UE** est le meilleur rapport effort/puissance pour un dev seul — **mais** Supabase est une société de droit américain (exposition **CLOUD Act**), point sensible pour des données de mineurs scolaires que **seul le DPD peut trancher**. La vraie protection n'est pas d'attendre cet arbitrage : c'est de **garder un schéma Postgres standard et portable**, pour que l'hébergeur reste un choix de déploiement décidé tard et basculable vers du souverain (Supabase auto‑hébergé OVH/Scaleway, ou autre Postgres UE).

---

## 2. Réponses aux 8 questions de cadrage

1. **Faut-il un backend ?** Oui dès qu'il y a comptes + persistance + suivi de notes — un site statique public ne peut garder aucun secret ni cloisonner des établissements (l'ancien code `1234` retiré le prouve). **Mais pas en v1 :** le MVP local (jeton + tableau de bord navigateur) repousse le backend sans rien perdre de la valeur pédagogique.
2. **Multi-établissements / simultanéité.** Modèle multi‑tenant `établissement → enseignants → classes → élèves → affectations → résultats`, isolation par **RLS Postgres** (un identifiant `enseignant_id`/`tenant_id` sur chaque ligne). **À NE PAS coder en v1** : commencer **mono‑prof**, introduire `tenant_id` et le rôle Admin **le jour où un 2ᵉ établissement arrive**.
3. **Authentification & rôles.** **2 rôles réels** : Enseignant (vrais comptes e‑mail/mot de passe) + mode libre/démo existant. **L'élève reste anonyme** (remonte un jeton) ; s'il y a backend un jour, il rejoint via un **code de session court à durée de vie limitée** vérifié par RLS — **pas de compte nominatif mineur, pas de cryptographie maison**.
4. **RGPD (élèves mineurs).** Base légale = **mission d'intérêt public de l'établissement** (art. 6.1.e), pas le consentement parental ; **information des familles** obligatoire. Établissement = **responsable de traitement**, outil = **sous‑traitant** (DPA art. 28). **Minimisation radicale** : jamais l'état civil complet en base. Tout backend nominatif → **AIPD quasi obligatoire** + registre EPLE + saisine du **DPD académique**. → détaillé § 5.
5. **Accessibilité institutionnelle (RGAA).** S'impose **seulement si** le déploiement devient un service officiel d'un établissement public. La base technique côté élève est déjà saine (aria‑live, focus clavier, `prefers-reduced-motion`) ; l'espace enseignant suivra la même rigueur. → § 5.6.
6. **Hébergement, coût, maintenance.** Le vrai coût n'est **pas l'hébergement** (quasi nul) mais le **temps d'exploitation** d'un backend pour un dev seul. → § 6.
7. **Interopérabilité (import ENT / École Directe).** Formats réellement **instables et non documentés** (encodage latin‑1/UTF‑8, séparateur `;`, colonnes variables). **Hors v1** : un simple **collage CSV** couvre 90 % du besoin. La voie officielle (GAR) demande un agrément éditeur lourd. → § 7.
8. **Mode dégradé / hors-ligne.** Le mode libre reste hors‑ligne (inchangé). La synchronisation différée (file localStorage → envoi à la reconnexion) est faisable mais ajoute des cas d'erreur : **reportée** (sobriété).

---

## 3. Corrections issues de la vérification adversariale (anti-hallucination)

Ces points avaient été affirmés en conception puis **vérifiés aux sources** : ils corrigent ou nuancent des idées reçues, et **certains touchent la crédibilité de la vitrine**.

| # | Affirmation initiale | ⚠️ Vérifié — correction | Source |
|---|---|---|---|
| C1 | « La grille C1‑C8 = référentiel SSIAP officiel » | **FAUX.** Le SSIAP 1 relève du **Répertoire Spécifique (RS5641)**, pas du RNCP ; l'**arrêté du 2 mai 2005** ne le structure **pas** en blocs C1‑C8 (France Compétences liste 9 compétences non codées). La grille C1‑C8 est une **construction pédagogique maison** légitime, **à étiqueter honnêtement** (« grille de positionnement maison inspirée du SSIAP1 ») devant l'auditeur. Ne pas mélanger SSIAP (titre/RS) et diplômes Éducation nationale (CAP/Bac Pro/BTS). | francecompetences.fr/recherche/rs/5641 ; legifrance (arrêté 2 mai 2005) |
| C2 | « Free tier Supabase suffisant pour la classe » | **À corriger.** Un projet gratuit est **mis en pause après 7 jours d'inactivité** (réveil ~30 s) : le 1ᵉʳ élève après des vacances tombe sur un backend endormi. Free tier = **prototypage/démo seulement** ; usage réel → **plan Pro (~25 $/mois)**. | supabase.com/pricing |
| C3 | « Seuil 15 ans = clé de la conformité » | **Hors‑sujet ici.** Le seuil des 15 ans ne vise que les traitements **fondés sur le consentement**. L'usage scolaire encadré repose sur la **mission d'intérêt public** → **pas de consentement parental**, seulement l'**information** des familles. (Loi de référence : **n° 2018‑493 du 20 juin 2018**, pas « 7 juillet ».) | cnil.fr (droits des mineurs) |
| C4 | « AIPD : ça pourrait être requis » | **Plus fort que « pourrait ».** Un suivi nominatif de notes de mineurs cumule **2 critères CNIL** (évaluation/scoring + personnes vulnérables) → **AIPD obligatoire par défaut** dès qu'un backend nominatif est déployé. Argument de plus pour rester sans backend en v1. | cnil.fr/fr/RGPD-analyse-impact |
| C5 | « Purge fin d'année scolaire = obligation » | **Non, c'est un CHOIX de minimisation.** Le cadre prévoit « durée de scolarité » (NS‑058) et **jusqu'à 10 ans** pour certaines données d'exploitation (tableau d'archivage Éducation nationale). Durée exacte → à arrêter avec le DPD. | education.gouv.fr (tableau d'archivage) ; ns‑058 |
| C6 | « Hébergement UE Supabase = conforme » | **Résidence ≠ souveraineté.** Supabase Inc. = société US (Delaware) sur AWS → **CLOUD Act** même en région Francfort/Paris. La **CNIL a déjà une position défavorable** aux outils à maison‑mère US dans l'enseignement (2021‑2022). À documenter, pas à survendre. NB : le Conseil d'État (2025) a jugé le risque CLOUD Act « **acceptable sous garanties** » pour les données de santé → ni interdit d'office, ni sans risque. | CLOUD Act ; cnil.fr ; conseil d'État 2025 |
| C7 | « Écarter Firebase car pas de résidence UE » | **Motif inexact.** Firestore **propose** une résidence UE (`eur3`). Le vrai motif d'écartement : résidence **partielle** (Auth/notifs peuvent transiter par les USA) + **non auto‑hébergeable** + **même CLOUD Act** (Google = US) + **NoSQL inadapté** au relationnel. | firebase.google.com/docs/firestore/locations |
| C8 | « Code de session + pseudo maison ≈ GAR » | **Non équivalent.** Le **GAR** est le mécanisme officiel qui pseudonymise les élèves entre ENT et fournisseurs ; devenir ressource GAR = **agrément lourd**, hors de portée à court terme. La version maison est cohérente mais **sans les garanties du GAR** : ne pas la présenter comme équivalente. | gar.education.fr |

**Conséquence directe :** corriger l'étiquetage de la grille C1‑C8 (C1) est à faire **dès maintenant** (crédibilité vitrine), indépendamment de la partie enseignant.

---

## 4. Architecture

### 4.1 Cohabitation des deux blocs (sobriété)

```
GitHub Pages (statique, INCHANGÉ)            [Optionnel, plus tard]
┌──────────────────────────────┐            ┌───────────────────────────┐
│  Simulateur SSI (Bloc 1)     │            │  Espace enseignant (Bloc 2)│
│  - mode libre / démo         │            │  - chemin /prof ou dépôt   │
│  - hors-ligne, sans compte   │            │    distinct                │
│  - jamais d'appel réseau     │  ──jeton──▶│  Phase 1 : tableau de bord │
│  - export PDF / copie papier │   JSON     │    100% LOCAL (navigateur) │
└──────────────────────────────┘            │  Phase 2 : Supabase UE     │
                                            │    (si portage établissement)│
                                            └───────────────────────────┘
```

- **Pas de sous‑domaine séparé ni de chargement conditionnel « masqué »** (⚠️ raffinement écarté par la vérification : trop coûteux pour un dev seul). Le découplage utile — *le mode libre n'appelle jamais le réseau* — s'obtient avec **un seul drapeau**. Un simple chemin `/prof` ou un dépôt distinct suffit.
- **Contrat d'échange = le bilan JSON de `evaluation.js`**, figé et **versionné** (`schema_version`), documenté dans `docs/SCHEMA-BILAN.md`, protégé par un test qui casse si le format change sans bump. C'est ce qui évite de tout réécrire à chaque évolution du simulateur.

### 4.2 Modèle de données (cible Phase 2, à ne PAS coder en v1)

Tables relationnelles, schéma **standard et portable** (aucune fonctionnalité propriétaire non essentielle) :

```
enseignant(id, email, ...)                       ← vrais comptes (Auth)
classe(id, enseignant_id, libelle, diplome)
eleve(id, classe_id, pseudo)                     ← jamais l'état civil complet
affectation(id, classe_id, scenario_id, palier, mode, echeance)
session(id, code_court, classe_id, expire_le)    ← code de session, pas de crypto maison
resultat(id, eleve_id, scenario_id, note20,
         positions_c1_c8 JSONB, fautes_graves JSONB,
         horodatage, schema_version)
-- [Phase 3] tenant/établissement introduit seulement à l'arrivée d'un 2e établissement
```

**Isolation (quand backend) :** RLS activé sur **toutes** les tables, `enseignant_id` (puis `tenant_id`) sur chaque ligne, **tests d'isolation systématiques** en s'authentifiant comme plusieurs profs **avant** toute mise en ligne (une policy oubliée = fuite).

---

## 5. RGPD — schéma de conformité

- **Rôles.** Établissement (chef d'établissement de l'EPLE) = **responsable de traitement** ; SSI Trainer = **sous‑traitant** → **DPA art. 28** obligatoire. *L'enseignant ne doit jamais porter ce rôle seul.* ⚠️ Si l'enseignant héberge lui‑même, le montage responsable/sous‑traitant devient flou — à clarifier avec le DPD.
- **Base légale.** **Mission d'intérêt public** (art. 6.1.e), **pas** le consentement. Conséquence : pas de consentement parental pour le traitement, mais **information des familles** obligatoire. *(cf. C3)*
- **Minimisation.** Stocker le **strict nécessaire** au suivi de compétences (pseudo, classe, scénario, note /20, positionnements, horodatage). **Jamais** nom complet, date de naissance, adresse. ⚠️ La « table de correspondance pseudo↔élève » est élégante mais **recrée le risque** si c'est un fichier Excel local non chiffré — préférer le **minimum de données** plutôt qu'un schéma d'anonymisation à maintenir.
- **AIPD.** À considérer **obligatoire** dès qu'un backend nominatif de mineurs existe. *(cf. C4)*
- **Conservation.** Choix de minimisation (ex. fin d'année) à **assumer comme tel**, durée exacte arrêtée avec le DPD. *(cf. C5)*
- **Sécurité.** RLS, chiffrement transit/repos, journalisation **minimisée** (ne pas sur‑collecter IP/métadonnées) ; export pg_dump externe chiffré pour la réversibilité.
- **5.6 RGAA.** S'applique **dès** que l'outil devient un service officiel d'un établissement public (déclaration d'accessibilité, audit, plan pluriannuel). Version en vigueur **RGAA 4.1.2** (WCAG 2.1 AA), **RGAA 5 attendu fin 2026**. Tant que c'est un projet personnel, l'obligation formelle ne mord pas — mais tenir la rigueur technique déjà acquise. *(L'EAA du 28/06/2025 vise les services B2C commerciaux : ne concerne pas cet outil.)*
- **Cohérence IA Act.** La note finale restant **validée par l'enseignant** (pas de décision exclusivement automatisée, art. 22 RGPD), cohérent avec le dossier « hors haut‑risque ».

---

## 6. Coût & maintenabilité

- **Hébergement : quasi nul.** Les résultats sont **textuels** (quelques Ko/session) ; le free tier Supabase (500 Mo base, 50 000 MAU, 5 Go egress) couvre très largement le besoin. Le poste qui surprend serait l'**egress**, pas le nombre d'élèves.
- **⚠️ Le vrai coût = le temps d'exploitation.** Un backend transforme un site sans entretien en **service à exploiter** (sauvegardes, mises à jour sécurité, supervision, support). C'est la charge réelle pour un enseignant seul.
- **Seuil de bascule Free → Pro.** Passer au **plan Pro (~25 $/mois ≈ 280 $/an)** le jour où de **vraies données d'élèves** sont stockées : il supprime la mise en pause et ajoute les **sauvegardes quotidiennes** (conservées 7 jours seulement → garder un **export pg_dump externe** même en Pro).
- **Dépassements (ordres de grandeur vérifiés) :** stockage 0,125 $/Go‑mois, egress 0,09 $/Go, MAU additionnel **0,00325 $** — négligeables pour ce projet.
- **Réversibilité.** Schéma Postgres standard + exports périodiques chiffrés hors Supabase ; Supabase étant open source, on peut tout réimporter ailleurs. **Tester** la réversibilité, ne pas la supposer. ⚠️ Ne pas monter de planificateur de sauvegarde maison tant que le volume est de quelques Ko (export manuel mensuel ou plan Pro).

---

## 7. Interopérabilité

- **v1 : collage/saisie CSV simple** (`nom;classe;diplôme`), encodage géré. Couvre l'essentiel.
- **Import ENT/École Directe : hors périmètre** — formats non documentés et variables. *(cf. C7/§2.7)*
- **Voie officielle = GAR**, mais agrément éditeur lourd → à explorer **seulement si** l'établissement adopte officiellement l'outil. *(cf. C8)*

---

## 8. Feuille de route

### Phase 0 — Socle préservé (immédiat, sans risque)
- Simulateur statique **inchangé** sur GitHub Pages.
- Vérifier/poser le **drapeau** « le mode libre n'appelle jamais le réseau ».
- **Figer le bilan JSON** (`schema_version`) + `docs/SCHEMA-BILAN.md` + test de non‑régression du format.
- **Étiqueter honnêtement la grille C1‑C8** (grille maison) et tracer sa correspondance avec le SSIAP1 (RS5641 / arrêté 2 mai 2005). *(corrige C1, crédibilité vitrine)*

### Phase 1 — POC tableau de bord LOCAL (cap septembre 2026)
*Prouver toute la chaîne de valeur, zéro donnée de mineur sur serveur, zéro dossier RGPD lourd.*
- L'élève génère un **jeton de résultat** (bilan JSON exporté en fichier).
- Tableau de bord enseignant **100 % navigateur** (IndexedDB/localStorage), **import par lot** (glisser‑déposer plusieurs fichiers JSON — **un seul canal** ; QR/code court plus tard).
- **Une** liste de classe par collage CSV.
- **Affectation** de scénarios (palier Guidé/Autonome/Exploration, mode entraînement vs examen).
- **Vue prioritaire : matrice élèves × C1‑C8** (« qui maîtrise C6 ? ») + note /20.
- Export PDF/CSV ; **mode examen best‑effort** (horodatage + jeton non rejouable + verrou de navigation), **assumé non inviolable** devant l'auditeur.
- Élève anonyme ou au plus prénom + initiale + identifiant de classe.
- **2 rôles réels** : Enseignant + mode libre/démo.

### Phase 2 — Backend optionnel (seulement si besoin réel + portage établissement)
**Prérequis bloquants :** établissement responsable de traitement, **DPA art. 28**, **AIPD**, inscription au registre EPLE, information des familles, saisine du **DPD académique**.
- Supabase Postgres + RLS, **région UE** (Paris `eu-west-3` ou Francfort `eu-central-1` — **région figée à la création**, à bien choisir d'emblée).
- Schéma **portable** ; RLS sur toutes les tables + tests d'isolation.
- Comptes réels **enseignants seulement** ; élèves via **code de session court** vérifié par RLS.
- **Plan Pro** dès qu'il y a de vraies données + export pg_dump externe périodique.
- Pas de multi‑établissement ni `tenant_id` tant qu'un seul établissement pilote.

### Phase 3 — Enrobage (post-MVP, si demande terrain réelle)
- Multi‑établissement (`tenant_id` + rôle Admin + RLS croisée) **à l'arrivée d'un 2ᵉ établissement**.
- Import ENT/École Directe ou interfaçage **ENT/GAR** (si adoption officielle).
- Éditeur de scénarios sans coder (coûteux, hors chemin critique ; scénarios déjà data‑driven JSON).
- Agrégats fins, base bulletin, synchronisation différée hors‑ligne.
- Si déploiement académique : déclaration d'accessibilité **RGAA** + audit + plan pluriannuel.

---

## 9. Décisions à trancher par Franck

| # | Décision | Options | Recommandation |
|---|---|---|---|
| D1 | **Périmètre v1** | (a) MVP 100 % local · (b) Supabase dès la v1 | **(a)** — prouve la valeur vite, élimine ~90 % du risque/charge RGPD, tient sept. 2026, ne casse rien. |
| D2 | **Portage institutionnel** (si suivi nominatif un jour) | (a) Établissement · (b) Enseignant seul · (c) Éditeur | **(a)** l'établissement (responsable de traitement) ; jamais l'enseignant seul ; éditeur = sous‑traitant. |
| D3 | **CLOUD Act / souveraineté** | (a) Acceptable sous garanties · (b) Bloquant → hébergeur souverain | **Ne pas trancher seul** (DPD académique). Mitigation réelle = **portabilité Postgres** ; privilégier d'emblée la voie souveraine si le déploiement dépasse l'usage perso. |
| D4 | **Identité élève** | (a) Nom complet · (b) Pseudo + correspondance locale · (c) Jeton anonyme | **Minimum viable** : jamais l'état civil complet ; en v1 locale, anonyme ou prénom + initiale + classe. |
| D5 | **Grille C1‑C8** (vitrine) | (a) « référentiel SSIAP » · (b) grille maison étiquetée | **(b)** grille de positionnement maison, correspondance tracée vers SSIAP1 (RS5641). *(corrige C1)* |
| D6 | **Rôles & archi** | (a) 4 rôles + sous‑domaine + liens signés · (b) 2 rôles, élève anonyme, mécanismes simples | **(b)** — moins de rôles = moins de RLS, de RGPD, de bugs. |
| D7 | **Format d'échange** | (a) lire le bilan tel quel · (b) contrat versionné | **(b)** `schema_version` + `docs/SCHEMA-BILAN.md` + test. |
| D8 | **Mode examen** | (a) présenté inviolable · (b) best‑effort assumé | **(b)** cadre pédagogique de bonne foi, surveillance enseignante ; vrai scellé = serveur (Phase 2+). |

---

## 10. Incertitudes à confirmer avant tout déploiement réel

- **CLOUD Act vs données de mineurs** : arbitrage DPD académique / chef d'établissement (non tranché ; « acceptable sous garanties » pour la santé en 2025, à instruire au cas par cas).
- **Durée de conservation** exacte applicable à l'outil (entre « durée de scolarité », purge fin d'année et 10 ans données d'exploitation) → DPD.
- **AIPD** : périmètre et mesures précises → DPD.
- **Montage responsable/sous‑traitant** si auto‑hébergement → DPD.
- **Codes RS/RNCP et libellés officiels** par diplôme (CAP Agent de sécurité, Bac Pro Métiers de la sécurité, BP ATPS, BTS MOS) à reconfirmer (France Compétences / Éducation nationale), **distincts du SSIAP (RS5641)**, avant tout usage à des fins de bulletin.
- **Formats d'export École Directe / ENT** : non documentés publiquement → ne rien spécifier tant que l'import n'est pas au périmètre.
- **Faisabilité interfaçage ENT/GAR** (agrément éditeur) → seulement si adoption officielle.

---

### Annexe — sources réglementaires vérifiées
CNIL (droits des mineurs, sous‑traitance, AIPD, recommandation suites collaboratives 2021) · Légifrance (loi n° 2018‑493 du 20 juin 2018 ; arrêté du 2 mai 2005 ; loi 2005‑102 art. 47) · France Compétences (RS5641) · Éducation nationale (tableau d'archivage ; GAR / éduscol) · Supabase (pricing, regions, DPA) · Conseil d'État 2025 (CLOUD Act / Health Data Hub) · accessibilite.numerique.gouv.fr (RGAA 4.1.2, déclaration) · EUR‑Lex (directive 2019/882 EAA).
