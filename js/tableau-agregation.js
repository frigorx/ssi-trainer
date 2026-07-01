/**
 * Agrégation des « jetons de résultat » → matrice élèves × compétences
 * inerWeb Édu — F. Henninot
 *
 * Logique PURE (aucun DOM, aucun réseau), donc testable au node :
 *   test/tableau-agregation.test.js
 *
 * Entrée  : un tableau de jetons (schéma « ssi-trainer/bilan » v1, voir js/bilan-jeton.js)
 *           + optionnellement une liste de classe [{nom, classe}] pour faire apparaître
 *           les élèves pas encore évalués.
 * Sortie  : { codes:[...], libelles:{code:libelle}, eleves:[ {nom,classe,diplome,
 *           competences:{code:{niveau,libelle}}, notes:[], noteMoy, nbEval} ] }
 *
 * Règle de positionnement : un élève peut jouer plusieurs scénarios. Pour chaque
 * compétence on retient le MEILLEUR niveau atteint (l'acquisition est cumulative),
 * un « Non évalué » ne fait jamais reculer un niveau déjà acquis.
 */
(function (root) {
  'use strict';

  // Ordre croissant des niveaux (doit suivre l'échelle de evaluation.js / LSU).
  var ORDRE = ['non_evalue', 'non_acquis', 'partiel', 'acquis', 'parfait'];

  function rang(niveau) {
    var i = ORDRE.indexOf(niveau);
    return i < 0 ? 0 : i;
  }
  function meilleur(a, b) {
    return rang(a) >= rang(b) ? a : b;
  }

  function _cle(nom, classe) {
    return (nom || '').trim().toLowerCase() + '|' + (classe || '').trim().toLowerCase();
  }

  /**
   * @param {Array}  jetons       jetons importés (objets déjà désérialisés)
   * @param {Array}  listeClasse  optionnel : [{nom, classe}] pour pré-remplir les lignes
   * @returns {{codes:string[], libelles:Object, eleves:Array}}
   */
  function agreger(jetons, listeClasse) {
    jetons = jetons || [];
    var map = {};        // clé élève -> objet élève
    var codesSet = {};   // code compétence -> libellé

    function getEleve(nom, classe, forceKey) {
      var k = forceKey || _cle(nom, classe);
      if (!map[k]) {
        map[k] = {
          nom: ((nom || '').trim()) || '(anonyme)',
          classe: (classe || '').trim(),
          diplome: '',
          competences: {},
          notes: [],
          nbEval: 0
        };
      }
      return map[k];
    }

    // Pré-remplissage : les élèves de la liste de classe existent même sans jeton.
    (listeClasse || []).forEach(function (p) {
      if (p && (p.nom || p.classe)) getEleve(p.nom, p.classe);
    });

    jetons.forEach(function (j, idx) {
      if (!j || j.schema !== 'ssi-trainer/bilan') return;
      var ev = j.evaluation || {};
      var nom = j.eleve && j.eleve.nom;
      // Élève anonyme (nom vide) : clé unique par jeton, pour NE PAS fusionner
      // plusieurs élèves anonymes de la même classe sur une seule ligne.
      var forceKey = (nom && String(nom).trim()) ? null : ('__anon__' + idx);
      var el = getEleve(nom, j.eleve && j.eleve.classe, forceKey);
      el.nbEval++;
      if (j.diplome && j.diplome.intitule) el.diplome = j.diplome.intitule;
      if (typeof ev.note_finale === 'number') el.notes.push(ev.note_finale);

      (ev.competences || []).forEach(function (c) {
        if (!c || !c.code) return;
        if (!codesSet[c.code]) codesSet[c.code] = c.libelle || c.code;
        var niv = c.niveau || 'non_evalue';
        var prev = el.competences[c.code];
        if (!c.evaluee) {
          // n'écrase jamais un niveau déjà posé ; pose « non évalué » si rien encore.
          if (!prev) el.competences[c.code] = { niveau: 'non_evalue', libelle: c.libelle || c.code };
          return;
        }
        el.competences[c.code] = {
          niveau: prev ? meilleur(prev.niveau, niv) : niv,
          libelle: c.libelle || c.code
        };
      });
    });

    var codes = Object.keys(codesSet).sort();

    var eleves = Object.keys(map).map(function (k) {
      var e = map[k];
      e.noteMoy = e.notes.length
        ? Math.round((e.notes.reduce(function (a, b) { return a + b; }, 0) / e.notes.length) * 10) / 10
        : null;
      // Complète les compétences absentes (élève pas/peu évalué) en « non évalué ».
      codes.forEach(function (code) {
        if (!e.competences[code]) e.competences[code] = { niveau: 'non_evalue', libelle: codesSet[code] };
      });
      return e;
    }).sort(function (a, b) {
      return a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
    });

    return { codes: codes, libelles: codesSet, eleves: eleves };
  }

  /** Parse un collage de liste de classe : une ligne par élève, « Nom » ou « Nom;Classe ». */
  function parserListeClasse(texte) {
    if (!texte) return [];
    return String(texte).split(/\r?\n/).map(function (l) { return l.trim(); })
      .filter(function (l) { return l.length > 0; })
      .map(function (l) {
        var parts = l.split(/[;,\t]/).map(function (p) { return p.trim(); });
        return { nom: parts[0] || '', classe: parts[1] || '' };
      })
      .filter(function (p) { return p.nom.length > 0; });
  }

  var api = {
    ORDRE: ORDRE, rang: rang, meilleur: meilleur,
    agreger: agreger, parserListeClasse: parserListeClasse
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TableauAgregation = api;
})(typeof window !== 'undefined' ? window : null);
