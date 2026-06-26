/**
 * Contrat d'échange — « jeton de résultat » SSI Trainer
 * inerWeb Édu — F. Henninot
 *
 * Enveloppe JSON STABLE et VERSIONNÉE produite à la fin d'un scénario, destinée
 * à être importée plus tard par le tableau de bord enseignant (partie enseignant).
 * C'est le SEUL point de couplage entre le simulateur et la partie enseignant :
 * tant que ce format ne change pas (ou que `schema_version` est incrémenté),
 * le tableau de bord n'a pas à être réécrit.
 *
 * Voir docs/SCHEMA-BILAN.md pour la description du format et la règle de version.
 * Un test (test/schema-bilan.test.js) casse si le format change sans bump de version.
 *
 * RGPD / minimisation : l'identité (nom/classe) n'est portée que si l'enseignant
 * l'a saisie ; en usage minimisé, l'élève reste anonyme (champs à null). Aucune
 * donnée n'est envoyée nulle part : le jeton est un fichier local.
 */
(function (root) {
  'use strict';

  var SCHEMA = 'ssi-trainer/bilan';
  var SCHEMA_VERSION = 1;

  /**
   * @param {object} ev   sortie de Evaluation.evaluer() (note, compétences, fautes…)
   * @param {object} meta { profil, scenario, diplome, genereLe (ISO), observations, duree }
   * @returns {object} enveloppe versionnée, sérialisable JSON sans perte
   */
  function construireJeton(ev, meta) {
    ev = ev || {};
    meta = meta || {};
    var profil = meta.profil || {};
    var scenario = meta.scenario || {};
    var diplome = meta.diplome || {};

    var competences = (ev.competences || []).map(function (c) {
      return {
        code: c.code || null,
        libelle: c.libelle || null,
        evaluee: !!c.evaluee,
        niveau: c.niveau || null,
        niveau_label: c.niveau_label || null,
        pct: (typeof c.pct === 'number' ? c.pct : null)
      };
    });

    return {
      schema: SCHEMA,
      schema_version: SCHEMA_VERSION,
      genere_le: meta.genereLe || null,
      eleve: {
        nom: profil.nom || null,
        classe: profil.classe || null
      },
      scenario: {
        id: scenario.id || null,
        titre: scenario.titre || null,
        niveau: (scenario.niveau != null ? scenario.niveau : null),
        erp_type: scenario.erp_type || null
      },
      diplome: {
        code: diplome.code || null,
        intitule: diplome.intitule || null,
        note_sur_20: diplome.note_sur_20 || null
      },
      evaluation: {
        note_finale: (typeof ev.noteFinale === 'number' ? ev.noteFinale : null),
        note_brute: (typeof ev.noteBrute === 'number' ? ev.noteBrute : null),
        sur: ev.sur || 20,
        pct: (typeof ev.pct === 'number' ? ev.pct : null),
        plafonnee: !!ev.plafonnee,
        competences: competences,
        fautes: (ev.fautes || []).slice(),
        etiquette_note: ev.etiquetteNote || null,
        perimetre: ev.perimetre || null
      },
      observations: meta.observations || '',
      duree_s: (typeof meta.duree === 'number' ? meta.duree : null)
    };
  }

  var api = { SCHEMA: SCHEMA, SCHEMA_VERSION: SCHEMA_VERSION, construireJeton: construireJeton };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.BilanJeton = api;
})(typeof window !== 'undefined' ? window : null);
