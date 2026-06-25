# SSI Trainer — Spécification pédagogique (refonte 2026)

> Document de référence du chantier. Source de vérité. Rédigé le 25/06/2026 à partir des retours des collègues de sécurité (via F. Henninot). Le simulateur technique est jugé **bon** ; le chantier porte sur le **volet pédagogique** et sur la **capacité de l'élève à agir de bout en bout**.

---

## 1. Objectif

Transformer SSI Trainer, aujourd'hui « un film qui se joue tout seul », en **exercice interactif et formatif** où l'élève agit en continu, est guidé, et produit une trace exploitable par le formateur — y compris **sur papier**.

## 2. Publics visés (progressivité)

| Diplôme | Attendu | Posture de l'outil |
|---|---|---|
| CAP Agent de sécurité | Gestes fondamentaux, signalisations | Très guidé : conduite à tenir fournie, cases à cocher |
| Bac Pro Métiers de la sécurité | Procédure complète, mise en sécurité | Guidé puis autonome |
| BP Agent technique de sécurité | Maîtrise opérateur, défaillances | Autonome, l'élève rédige |
| BTS MOS (Management Opérationnel de la Sécurité) | Organisation, décision, coordination, retour d'expérience | Autonome + analyse / management de crise |

→ Un même scénario peut être **décliné en paliers de guidage** ; on commence par 2 paliers (**Guidé** / **Autonome**) et on enrichit.

## 3. Principe directeur — le binôme « double écran »

Chaque scénario = **deux documents solidaires**, pensés pour deux écrans :

- **Document SSI** (le tableau / simulateur) : l'équipement que l'élève manipule (ECS / CMSI / baie). L'élève y **vit** la situation et **y agit**.
- **Document élève** (le poste de l'opérateur) : sa **fiche de travail** — contexte de l'établissement, conduite à tenir, **main courante** à remplir, questions, décisions à justifier. C'est là qu'on met la pédagogie.

Les deux se synchronisent à l'écran (le document élève réagit aux gestes posés sur le SSI), **mais le document élève reste compréhensible seul**.

### Version papier (impératif)
Le document élève est **téléchargeable / imprimable** en fiche autoportante :
- contexte + consignes + conduite à tenir (selon palier) + **main courante vierge à remplir au stylo** + questions + cadre « bilan ».
- Cas d'usage : supports numériques dégradés → l'élève a **le simulateur sur téléphone/tablette** (pour vivre les signalisations) et **rédige sur le papier**, que le formateur **ramasse**.

## 4. Hors périmètre (v1)

- ❌ Remontée numérique des notes / tableau formateur en **temps réel** / export Google Sheets.
- La correction se fait **sur copie papier**. Le lien formateur↔élève (aujourd'hui cassé) est **mis en veille proprement**, pas réparé.
- `formateur.html` et `js/sheets-export.js` : conservés mais non prioritaires ; on évite d'y renvoyer l'élève.

## 5. Refonte fonctionnelle du Document SSI

### 5.1 Palette d'actions complète (la correction n°1)
Cause de la « passivité » constatée : 3 gestes attendus par les scénarios n'ont **aucun bouton**. À exposer (le moteur sait déjà presque tout faire) :

| Geste opérateur | Compétence | État actuel |
|---|---|---|
| Acquitter / acquit zone | C2 | ✅ présent |
| Arrêt signal sonore | C2 | ✅ présent |
| Test signalisation | C2 | ✅ présent |
| Réarmer (si sécurisé) | C2 | ✅ présent |
| Déclencher évacuation générale | C4 | ✅ présent → **à protéger par niveau d'accès 2** |
| **Alerter le 18/112** (avec message structuré : nature, lieu, victimes) | C3 | ❌ **à créer** |
| **Commander un DAS** (compartimentage PCF, désenfumage) — vraie interface, **pas de `prompt()`** | C6 / C7 | ❌ **à créer** |
| **Couper les énergies** (gaz / électricité) | — | ❌ **à créer** (demandé par n3/n4) |
| **Accueil & guidage secours** (check-list : plans, clés, point de situation) | C8 | ❌ **à créer** |
| **Assistance à personne** (PMR, dégagement d'urgence, surveillance) | C4 / C5 | ❌ **à créer** |

→ La palette **s'étoffe avec le niveau de difficulté** (sobriété) : N1 = gestes fondamentaux ; N2 = + DAS / accueil secours ; N3 = + coupure énergies / coordination multi-sites.

### 5.2 Cohérence zones ↔ scénarios (la correction n°2)
Aujourd'hui un scénario « expert » (zones `ZC*`, `BAT-*`) peut tourner dans l'ECS (zones `ZD01-04`) → journal illisible. Règle : **chaque scénario déclare ses zones**, et l'interface **ne propose que les scénarios compatibles avec son équipement**. Cartographie de zones **unifiée** par niveau.

### 5.3 Niveaux d'accès (suggestion métier du collègue)
Reproduire les **niveaux d'accès** réglementaires (NF S 61-931) : les commandes engageantes (évacuation générale, commande DAS) exigent le passage en **niveau d'accès 2** (code / clé, personnel formé). Geste réaliste et formatif.

### 5.4 Conduite à tenir vivante
Bandeau toujours visible qui **affiche la procédure attendue et se coche au fur et à mesure** des bons gestes (mode Guidé). En mode Autonome : masquée ou réduite à un rappel.

## 6. Le Document élève (structure)

1. **En-tête** : diplôme, scénario, type d'ERP, nom/classe (champ libre).
2. **Contexte** : établissement, effectif, particularités (PMR, locaux à risque…).
3. **Consigne / mission**.
4. **Conduite à tenir** : fournie (Guidé) ou à compléter par l'élève (Autonome).
5. **Main courante** : tableau Heure / Événement / Action menée — rempli à l'écran **ou** au stylo.
6. **Questions** : compréhension, justification de décision, réglementaire (adaptées au diplôme).
7. **Bilan** : récap « ce que tu as fait / ce qui était attendu » + points clés du référentiel C1-C8.

## 7. Format de scénario enrichi

On garde le format actuel (`evenements` horodatés + `actions_attendues`) et on ajoute :
```jsonc
{
  "niveau": 1, "diplomes": ["CAP","BAC_PRO"],   // compatibilité
  "zones": [ { "id": "ZD01", "nom": "Cuisine RDC" } ],  // cohérence
  "contexte": { "erp": "N", "effectif": 120, "particularites": "…" },
  "mission": "…",                                // consigne élève
  "conduite_a_tenir": [ "Acquitter…", "Localiser…", "Levée de doute…" ],
  "questions": [ { "q": "…", "type": "qcm|libre", "options": [] } ],
  "points_cles": [ "…" ]                         // pour le bilan / correction
}
```

## 8. Vocabulaire (lever l'ambiguïté)

- **Niveau de difficulté** de l'appli : 1 (ECS) / 2 (CMSI) / 3 (baie).
- **Niveau d'accès** du tableau : 1 (lecture) / 2 (exploitation, code) / 3 (maintenance) — notion réglementaire.
- **Diplôme** : CAP / Bac Pro / BP / BTS MOS.
→ Ne jamais dire « niveau 2 » sans préciser lequel. Termes affichés à l'élève : revoir en conséquence.

## 9. Accessibilité & technique

- Ne **jamais coder une information par la couleur seule** (libellé + pictogramme + couleur) — daltonisme, vidéoprojection.
- Remplacer `alert()` / `prompt()` par des panneaux/modales propres.
- Mutualiser le CSS/JS commun aux 3 niveaux (réduire la duplication ~70-80 %), sans casser l'existant (« brancher le neuf avant de retirer l'ancien »).
- Rester **statique** (GitHub Pages, aucun outil de build), fonctionner **hors ligne** sur téléphone/tablette.

## 10. Plan par étapes

- **Étape 1 — Niveau 1 « modèle »** : palette d'actions complète + niveau d'accès 2 + cohérence zones + conduite à tenir vivante + **document élève** + **fiche papier** ; vérifié sur « Fausse alarme cuisine » puis « Incendie confirmé » (à recaler en zones ECS).
- **Étape 2 — Décliner** le modèle sur N2 (CMSI) et N3 (baie), avec scénarios cohérents ; mutualiser le code.
- **Étape 3 — Progressivité** CAP→BTS MOS (paliers de guidage + banque de scénarios par diplôme).
- **Étape 4 — Finitions** : accessibilité, vocabulaire, nettoyage de ce qui est en veille.

> Règle de travail : carte → modif chirurgicale → vérif en local → étape suivante. Ne rien casser.
