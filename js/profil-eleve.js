/**
 * Profil élève — identité + diplôme suivi, persistant (localStorage)
 * inerWeb Édu — F. Henninot
 *
 * Le diplôme conditionne l'étiquette de la note (défendable / indicative /
 * entraînement) et le périmètre affiché. Les fiches diplômes (codes RNCP,
 * compétences, mode de notation) sont dans referentiels/diplomes-securite.json.
 */

const PROFIL_CLE = 'ssi-profil-eleve';

class ProfilEleve {
  constructor() {
    this.nom = '';
    this.classe = '';
    this.diplome = 'CAP_AS'; // code par défaut
    this.charger();
  }

  charger() {
    try {
      const j = JSON.parse(localStorage.getItem(PROFIL_CLE));
      if (j && typeof j === 'object') {
        this.nom = j.nom || '';
        this.classe = j.classe || '';
        this.diplome = j.diplome || 'CAP_AS';
      }
    } catch (e) { /* localStorage indisponible ou vide */ }
  }

  sauver() {
    try {
      localStorage.setItem(PROFIL_CLE, JSON.stringify({ nom: this.nom, classe: this.classe, diplome: this.diplome }));
    } catch (e) { /* mode privé : on continue sans persistance */ }
  }

  set(nom, classe, diplome) {
    if (nom !== undefined) this.nom = nom;
    if (classe !== undefined) this.classe = classe;
    if (diplome !== undefined) this.diplome = diplome;
    this.sauver();
  }

  /** true si l'identité minimale est renseignée (utile avant export/évaluation). */
  estRenseigne() {
    return this.nom.trim().length > 0;
  }
}

if (typeof module !== 'undefined') module.exports = { ProfilEleve, PROFIL_CLE };
