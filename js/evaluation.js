/**
 * Évaluation — note finale + positionnement par compétence + fautes graves
 * inerWeb Édu — F. Henninot
 *
 * Transforme le bilan brut du ScenarioPlayer en une évaluation pédagogique :
 *  - une note /20 (étiquetée selon le diplôme : défendable / indicative / entraînement) ;
 *  - un positionnement par compétence SSIAP (acquis / en cours / non acquis) ;
 *  - la détection des FAUTES GRAVES (qui plafonnent la note) ;
 *  - un libellé de périmètre (composante incendie, non certificatif).
 *
 * Ne prétend JAMAIS produire une note de diplôme : le simulateur n'évalue que
 * la composante sécurité incendie. Voir referentiels/diplomes-securite.json.
 */

// Échelle de positionnement à 4 niveaux + « non évalué » (conforme au livret de compétences / LSU).
const EVAL_NIVEAUX = {
  non_evalue: { label: 'Non évalué', couleur: '#9aa3af', picto: '–' },
  non_acquis: { label: 'Non acquis', couleur: '#c62828', picto: '✘' },
  partiel: { label: 'Partiellement acquis', couleur: '#ef6c00', picto: '◔' },
  acquis: { label: 'Acquis', couleur: '#2e7d32', picto: '✔' },
  parfait: { label: 'Parfaitement acquis', couleur: '#1b5e20', picto: '★' }
};
// Seuils (% des points de la compétence dans ce scénario) → niveau d'acquisition.
const EVAL_SEUILS = { parfait: 85, acquis: 60, partiel: 30 };
function niveauDe(pct) {
  if (pct >= EVAL_SEUILS.parfait) return 'parfait';
  if (pct >= EVAL_SEUILS.acquis) return 'acquis';
  if (pct >= EVAL_SEUILS.partiel) return 'partiel';
  return 'non_acquis';
}
const EVAL_PLAFOND_FAUTE_GRAVE = 8;                  // note /20 max si faute grave

class Evaluation {
  /**
   * @param {object} opts.referentiel  map { C1: {libelle, bareme:{max,seuil}}, ... } (competences_ssiap1.json)
   */
  constructor(opts) {
    opts = opts || {};
    this.referentiel = opts.referentiel || {};
  }

  /**
   * @param {object} bilan    player.getBilan() : { score:{points,max,pct}, details:[...], actions:[...], duree }
   * @param {object} scenario le scénario joué (peut porter fautes_graves[])
   * @param {object} diplome  fiche diplôme { code, intitule, note_sur_20: 'defendable'|'indicatif'|'entrainement' }
   */
  evaluer(bilan, scenario, diplome) {
    diplome = diplome || {};
    const details = (bilan && bilan.details) || [];
    const actions = (bilan && bilan.actions) || [];

    // --- Note brute /20 ---
    const pct = (bilan && bilan.score && typeof bilan.score.pct === 'number') ? bilan.score.pct : 0;
    const noteBrute = Math.round((pct / 100) * 20 * 2) / 2; // arrondi au 0,5

    // --- Positionnement par compétence ---
    const parComp = {};
    details.forEach((d) => {
      const c = d.competence;
      if (!c || c === '—') return;
      if (!parComp[c]) parComp[c] = { points: 0, max: 0 };
      parComp[c].points += (d.points || 0);
      parComp[c].max += (d.max || 0);
    });
    // Liste = toutes les compétences du référentiel (pour faire apparaître les « non évaluées »),
    // complétée des compétences réellement présentes au scénario.
    const codesSet = {};
    Object.keys(this.referentiel).forEach((c) => { codesSet[c] = 1; });
    Object.keys(parComp).forEach((c) => { codesSet[c] = 1; });
    const ref = this.referentiel;
    const competences = Object.keys(codesSet).sort().map((code) => {
      const s = parComp[code];
      const libelle = (ref[code] && ref[code].libelle) || code;
      if (!s || s.max === 0) {
        const n = EVAL_NIVEAUX.non_evalue;
        return { code: code, libelle: libelle, pct: null, points: 0, max: 0, evaluee: false, niveau: 'non_evalue', niveau_label: n.label, couleur: n.couleur, picto: n.picto };
      }
      const p = Math.round((s.points / s.max) * 100);
      const niv = niveauDe(p); const n = EVAL_NIVEAUX[niv];
      return { code: code, libelle: libelle, pct: p, points: s.points, max: s.max, evaluee: true, niveau: niv, niveau_label: n.label, couleur: n.couleur, picto: n.picto };
    });

    // --- Fautes graves ---
    const fautes = this._detecterFautes(scenario, actions);

    // --- Note finale (plafond si faute grave) ---
    let noteFinale = noteBrute;
    if (fautes.length > 0) noteFinale = Math.min(noteBrute, EVAL_PLAFOND_FAUTE_GRAVE);

    // --- Étiquette de note selon le diplôme ---
    const etiquette = this._etiquetteNote(diplome.note_sur_20);

    return {
      noteFinale: noteFinale,
      noteBrute: noteBrute,
      sur: 20,
      pct: pct,
      plafonnee: fautes.length > 0 && noteBrute > EVAL_PLAFOND_FAUTE_GRAVE,
      competences: competences,
      fautes: fautes,
      diplome: diplome.intitule || diplome.code || '',
      etiquetteNote: etiquette,
      perimetre: 'Évaluation de la composante sécurité incendie, sur une grille de positionnement interne (inspirée du SSIAP 1 — arrêté du 2 mai 2005 / RS5641) — indicateur pédagogique, non certificatif.'
    };
  }

  _etiquetteNote(mode) {
    if (mode === 'indicatif') return 'Note /20 (indicative)';
    if (mode === 'entrainement') return "Score d'entraînement /20";
    return 'Note /20';
  }

  /** Évalue scenario.fautes_graves[] contre les actions réalisées par l'élève. */
  _detecterFautes(scenario, actions) {
    const regles = (scenario && scenario.fautes_graves) || [];
    if (!regles.length) return [];
    // index temps de la première occurrence de chaque action
    const tempsDe = {};
    actions.forEach((a) => {
      if (a && a.action && tempsDe[a.action] === undefined) tempsDe[a.action] = (a.temps != null ? a.temps : 0);
    });
    const aFait = (cle) => tempsDe[cle] !== undefined;

    const out = [];
    regles.forEach((r) => {
      let declenche = false;
      if (r.type === 'manque') {
        declenche = !aFait(r.cle);
      } else if (r.type === 'fait') {
        declenche = aFait(r.cle);
      } else if (r.type === 'fait_sans') {
        // r.cle fait, alors que r.avant n'a pas été fait avant (absent OU postérieur)
        if (aFait(r.cle)) {
          const tAvant = tempsDe[r.avant];
          declenche = (tAvant === undefined) || (tAvant > tempsDe[r.cle]);
        }
      }
      if (declenche) out.push(r.libelle || ('Faute grave : ' + (r.cle || r.type)));
    });
    return out;
  }
}

if (typeof module !== 'undefined') module.exports = { Evaluation, EVAL_SEUILS, EVAL_PLAFOND_FAUTE_GRAVE };
