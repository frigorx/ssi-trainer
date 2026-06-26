# Contrat d'échange — « jeton de résultat » (`ssi-trainer/bilan`)

> Format JSON **stable et versionné** produit en fin de scénario par `js/bilan-jeton.js`
> (`construireJeton`). C'est le **seul point de couplage** entre le simulateur et la
> future **partie enseignant** : tant que ce format ne change pas — ou que
> `schema_version` est incrémenté — le tableau de bord enseignant n'a pas à être réécrit.
>
> Un test (`test/schema-bilan.test.js`) **échoue** si le format change sans bump de version.
> Voir la spec : [SPEC-PARTIE-ENSEIGNANT.md](SPEC-PARTIE-ENSEIGNANT.md) (Phase 0 et 1).

## Règle de version

- `schema_version` est un **entier**. **Tout changement cassant** (renommage/suppression de
  champ, changement de type ou de sémantique) **DOIT** incrémenter `schema_version` **et**
  être répercuté dans le test et dans l'importeur côté tableau de bord.
- Un **ajout** de champ optionnel (rétrocompatible) ne nécessite **pas** de bump.
- Version courante : **1**.

## Forme

```json
{
  "schema": "ssi-trainer/bilan",
  "schema_version": 1,
  "genere_le": "2026-06-26T10:00:00.000Z",
  "eleve":    { "nom": "un élève", "classe": "1CAP" },
  "scenario": { "id": "n1_fausse_alarme", "titre": "…", "niveau": 1, "erp_type": "L" },
  "diplome":  { "code": "CAP_AS", "intitule": "CAP Agent de sécurité", "note_sur_20": "defendable" },
  "evaluation": {
    "note_finale": 12.5,
    "note_brute": 12.5,
    "sur": 20,
    "pct": 62,
    "plafonnee": false,
    "competences": [
      { "code": "C2", "libelle": "Exploitation du SSI…", "evaluee": true,
        "niveau": "acquis", "niveau_label": "Acquis", "pct": 60 },
      { "code": "C1", "libelle": "Prévention des incendies", "evaluee": false,
        "niveau": "non_evalue", "niveau_label": "Non évalué", "pct": null }
    ],
    "fautes": ["Faute grave : …"],
    "etiquette_note": "Note /20",
    "perimetre": "Évaluation de la composante sécurité incendie…"
  },
  "observations": "",
  "duree_s": 95
}
```

## Champs

| Champ | Type | Notes |
|---|---|---|
| `schema` | string | toujours `"ssi-trainer/bilan"` (sert de garde à l'import). |
| `schema_version` | entier | version du contrat (voir règle ci-dessus). |
| `genere_le` | string ISO \| null | horodatage de génération (fourni par l'appelant). |
| `eleve.nom` / `eleve.classe` | string \| null | **minimisation** : `null` si l'élève reste anonyme. **Jamais** d'état civil complet/date de naissance/adresse. |
| `scenario.{id,titre,niveau,erp_type}` | … \| null | identité du scénario joué. |
| `diplome.{code,intitule,note_sur_20}` | … \| null | `note_sur_20` ∈ `defendable` \| `indicatif` \| `entrainement`. |
| `evaluation.note_finale` / `note_brute` | number \| null | `note_finale` = `note_brute` plafonnée à 8/20 en cas de faute grave. |
| `evaluation.sur` | number | dénominateur de la note (20). |
| `evaluation.pct` | number \| null | % des points obtenus. |
| `evaluation.plafonnee` | bool | vrai si la note a été plafonnée par une faute grave. |
| `evaluation.competences[]` | array | **grille complète** : les compétences non travaillées apparaissent avec `evaluee=false` / `niveau="non_evalue"`. |
| `evaluation.competences[].niveau` | string | `non_evalue` \| `non_acquis` \| `partiel` \| `acquis` \| `parfait`. |
| `evaluation.competences[].pct` | number \| null | `null` si non évaluée. |
| `evaluation.fautes[]` | string[] | libellés des fautes graves détectées. |
| `evaluation.etiquette_note` | string \| null | libellé de la note selon le diplôme. |
| `evaluation.perimetre` | string \| null | rappel « composante incendie, grille maison, non certificatif ». |
| `observations` | string | appréciation/remédiation libre (saisie formateur). |
| `duree_s` | number \| null | durée du scénario en secondes. |

> ⚠️ La grille de compétences (codes `C1`–`C8`) est une **grille de positionnement maison**
> inspirée du SSIAP 1 (arrêté du 2 mai 2005 / RS5641), **pas** le référentiel SSIAP officiel —
> voir `referentiels/competences_ssiap1.json` et la spec.
