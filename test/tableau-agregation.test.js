/**
 * Test de l'agrégation jetons → matrice élèves × compétences.
 * Vérifie la règle « meilleur niveau atteint », le pré-remplissage par la liste
 * de classe, la moyenne des notes et le parsing du collage.
 * Exécution :  node test/tableau-agregation.test.js
 */
'use strict';
const assert = require('assert');
const { agreger, parserListeClasse, meilleur } = require('../js/tableau-agregation.js');

// Fabrique un jeton minimal mais conforme au schéma « ssi-trainer/bilan ».
function jeton(nom, classe, note, comps) {
  return {
    schema: 'ssi-trainer/bilan',
    schema_version: 1,
    eleve: { nom: nom, classe: classe },
    diplome: { code: 'CAP_AS', intitule: 'CAP Agent de sécurité', note_sur_20: 'defendable' },
    evaluation: { note_finale: note, competences: comps }
  };
}
function comp(code, niveau, evaluee) {
  return { code: code, libelle: code + ' libellé', evaluee: evaluee !== false, niveau: niveau };
}

// --- meilleur() : l'ordre de l'échelle est respecté ---
assert.strictEqual(meilleur('acquis', 'partiel'), 'acquis', 'acquis > partiel');
assert.strictEqual(meilleur('non_evalue', 'non_acquis'), 'non_acquis', 'non_acquis > non_evalue');
assert.strictEqual(meilleur('parfait', 'acquis'), 'parfait', 'parfait > acquis');

// --- Deux scénarios pour le même élève : on garde le MEILLEUR par compétence ---
const j1 = jeton('Dupont', '1CAP', 10, [comp('C1', 'partiel'), comp('C2', 'acquis'), comp('C3', 'non_evalue', false)]);
const j2 = jeton('Dupont', '1CAP', 14, [comp('C1', 'acquis'), comp('C2', 'non_evalue', false), comp('C3', 'partiel')]);

const r = agreger([j1, j2]);
assert.strictEqual(r.eleves.length, 1, 'même nom+classe = un seul élève');
const e = r.eleves[0];
assert.strictEqual(e.nbEval, 2, 'deux jetons agrégés');
assert.strictEqual(e.competences.C1.niveau, 'acquis', 'C1 : partiel puis acquis → acquis');
assert.strictEqual(e.competences.C2.niveau, 'acquis', 'C2 : acquis puis non évalué → reste acquis');
assert.strictEqual(e.competences.C3.niveau, 'partiel', 'C3 : non évalué puis partiel → partiel');
assert.strictEqual(e.noteMoy, 12, 'moyenne (10 + 14) / 2 = 12');
assert.deepStrictEqual(r.codes, ['C1', 'C2', 'C3'], 'les 3 codes remontent triés');

// --- La casse / les espaces n'éclatent pas un élève en deux lignes ---
const r2 = agreger([jeton(' Dupont ', '1cap', 8, [comp('C1', 'acquis')]), jeton('dupont', '1CAP', 12, [comp('C1', 'partiel')])]);
assert.strictEqual(r2.eleves.length, 1, 'nom insensible à la casse et aux espaces');

// --- Liste de classe : un élève sans jeton apparaît, tout « non évalué » ---
const r3 = agreger([jeton('Martin', '1CAP', 15, [comp('C1', 'acquis')])], [{ nom: 'Martin', classe: '1CAP' }, { nom: 'Durand', classe: '1CAP' }]);
assert.strictEqual(r3.eleves.length, 2, 'Martin (évalué) + Durand (liste seule)');
const durand = r3.eleves.find((x) => x.nom === 'Durand');
assert.ok(durand, 'Durand présent via la liste de classe');
assert.strictEqual(durand.nbEval, 0, 'Durand pas encore évalué');
assert.strictEqual(durand.competences.C1.niveau, 'non_evalue', 'Durand : C1 non évalué');
assert.strictEqual(durand.noteMoy, null, 'Durand : pas de note');

// --- Un jeton au schéma inconnu est ignoré ---
const r4 = agreger([{ schema: 'autre-chose', eleve: { nom: 'X' } }]);
assert.strictEqual(r4.eleves.length, 0, 'jeton hors schéma ignoré');

// --- parserListeClasse : « Nom » ou « Nom;Classe » ---
const liste = parserListeClasse('Dupont;1CAP\n  Martin , 2BACPRO \n\nDurand');
assert.strictEqual(liste.length, 3, '3 élèves parsés (ligne vide ignorée)');
assert.deepStrictEqual(liste[0], { nom: 'Dupont', classe: '1CAP' }, 'séparateur point-virgule');
assert.deepStrictEqual(liste[1], { nom: 'Martin', classe: '2BACPRO' }, 'séparateur virgule + espaces');
assert.deepStrictEqual(liste[2], { nom: 'Durand', classe: '' }, 'nom seul, classe vide');

console.log('OK — agrégation matrice : meilleur niveau, liste de classe, moyenne, parsing (' +
  r.eleves.length + ' élève agrégé sur ' + r.codes.length + ' compétences).');
