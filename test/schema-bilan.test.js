/**
 * Test de non-régression du contrat d'échange (« jeton de résultat »).
 * Casse si la forme du bilan JSON change sans incrément de schema_version.
 * Exécution :  node test/schema-bilan.test.js
 */
'use strict';
const assert = require('assert');
const { Evaluation } = require('../js/evaluation.js');
const { construireJeton, SCHEMA, SCHEMA_VERSION } = require('../js/bilan-jeton.js');

// Référentiel minimal (grille maison) : 2 compétences suffisent pour le test.
const referentiel = {
  C1: { libelle: 'Prévention des incendies', bareme: { max: 20, seuil: 12 } },
  C2: { libelle: 'Exploitation du SSI', bareme: { max: 30, seuil: 18 } }
};
const evaluation = new Evaluation({ referentiel });

// Bilan brut tel que produit par ScenarioPlayer.getBilan().
const bilan = {
  score: { points: 18, max: 30, pct: 60 },
  duree: 95,
  details: [
    { competence: 'C2', points: 18, max: 30, action: 'acquitter', resultat: 'OK', realise: 10, temps: 10 }
  ],
  actions: [{ action: 'acquitter', temps: 10 }]
};
const scenario = { id: 'n1_test', titre: 'Scénario de test', niveau: 1, erp_type: 'L', fautes_graves: [] };
const diplome = { code: 'CAP_AS', intitule: 'CAP Agent de sécurité', note_sur_20: 'defendable' };

const ev = evaluation.evaluer(bilan, scenario, diplome);
const jeton = construireJeton(ev, {
  profil: { nom: 'un élève', classe: '1CAP' },
  scenario, diplome,
  genereLe: '2026-06-26T10:00:00.000Z',
  observations: '',
  duree: bilan.duree
});

// --- En-tête du contrat ---
assert.strictEqual(SCHEMA, 'ssi-trainer/bilan', 'constante SCHEMA inattendue');
assert.strictEqual(jeton.schema, 'ssi-trainer/bilan', 'champ schema inattendu');
assert.strictEqual(jeton.schema_version, SCHEMA_VERSION, 'schema_version incohérent');
assert.strictEqual(jeton.schema_version, 1, 'version courante attendue = 1 (bumper si changement cassant)');

// --- Champs obligatoires de premier niveau ---
['genere_le', 'eleve', 'scenario', 'diplome', 'evaluation', 'observations', 'duree_s']
  .forEach((k) => assert.ok(k in jeton, 'clé de premier niveau manquante : ' + k));

// --- Bloc évaluation ---
['note_finale', 'note_brute', 'sur', 'pct', 'plafonnee', 'competences', 'fautes', 'etiquette_note', 'perimetre']
  .forEach((k) => assert.ok(k in jeton.evaluation, 'clé evaluation manquante : ' + k));
assert.ok(Array.isArray(jeton.evaluation.competences), 'competences doit être un tableau');
assert.ok(Array.isArray(jeton.evaluation.fautes), 'fautes doit être un tableau');

// --- Chaque compétence porte la forme attendue ---
jeton.evaluation.competences.forEach((c) => {
  ['code', 'libelle', 'evaluee', 'niveau', 'niveau_label', 'pct']
    .forEach((k) => assert.ok(k in c, 'clé compétence manquante : ' + k + ' (' + c.code + ')'));
});

// --- La grille complète remonte (les non travaillées = « non évalué ») ---
const codes = jeton.evaluation.competences.map((c) => c.code);
assert.ok(codes.includes('C1') && codes.includes('C2'), 'la grille complète doit apparaître (C1 et C2)');
const c1 = jeton.evaluation.competences.find((c) => c.code === 'C1');
assert.strictEqual(c1.evaluee, false, 'C1 non jouée doit être non évaluée');
assert.strictEqual(c1.niveau, 'non_evalue', 'C1 non jouée doit avoir le niveau non_evalue');
assert.strictEqual(c1.pct, null, 'C1 non évaluée doit avoir pct = null');

// --- Sérialisable JSON sans perte (pas d'undefined ni de valeur non sérialisable) ---
const round = JSON.parse(JSON.stringify(jeton));
assert.deepStrictEqual(round, jeton, 'le jeton doit être sérialisable en JSON sans perte');

console.log('OK — contrat « ' + SCHEMA + ' » v' + SCHEMA_VERSION +
  ' validé (' + jeton.evaluation.competences.length + ' compétences, note ' +
  jeton.evaluation.note_finale + '/' + jeton.evaluation.sur + ').');
