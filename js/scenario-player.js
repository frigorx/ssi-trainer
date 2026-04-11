/**
 * Lecteur de scénarios SSI
 * inerWeb Édu — F. Henninot
 */

class ScenarioPlayer {
  constructor(engine, audio) {
    this.engine = engine;
    this.audio = audio;
    this.scenario = null;
    this.timers = [];
    this.startTime = null;
    this.paused = false;
    this.pauseTime = null;
    this.elapsed = 0;
    this.actionsEleve = [];
    this.scoring = [];
    this.chronoInterval = null;
    this.onTick = null;
    this.onScore = null;
    this.onEvent = null;

    // Écouter les actions de l'élève
    this.engine.onEvent((event, data) => {
      if (event === 'action' && this.scenario) {
        this._evaluerAction(data);
      }
    });
  }

  charger(scenario) {
    this.stop();
    this.scenario = scenario;
    this.scoring = [];
    this.actionsEleve = [];
    this.elapsed = 0;
  }

  demarrer() {
    if (!this.scenario) return;
    this.startTime = Date.now();
    this.paused = false;
    this.engine.reset();

    // Programmer les événements
    this.scenario.evenements.forEach(evt => {
      const timer = setTimeout(() => {
        if (this.paused) return;
        this._jouerEvenement(evt);
      }, evt.t * 1000);
      this.timers.push(timer);
    });

    // Chrono
    this.chronoInterval = setInterval(() => {
      if (!this.paused) {
        this.elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        if (this.onTick) this.onTick(this.elapsed);
        // Vérifier temps max
        if (this.scenario.duree_max && this.elapsed >= this.scenario.duree_max) {
          this._finScenario();
        }
      }
    }, 1000);
  }

  pause() {
    this.paused = true;
    this.pauseTime = Date.now();
    this.audio.stopAll();
  }

  reprendre() {
    if (!this.paused) return;
    const pauseDuration = Date.now() - this.pauseTime;
    this.startTime += pauseDuration;
    this.paused = false;
  }

  stop() {
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
    if (this.chronoInterval) clearInterval(this.chronoInterval);
    this.chronoInterval = null;
    this.paused = false;
    this.audio.stopAll();
  }

  reset() {
    this.stop();
    this.scoring = [];
    this.actionsEleve = [];
    this.elapsed = 0;
    this.engine.reset();
  }

  _jouerEvenement(evt) {
    if (this.onEvent) this.onEvent(evt);
    switch (evt.type) {
      case 'alarme':
        this.engine.declencherAlarme(evt.zone, evt.detail);
        break;
      case 'propagation':
        this.engine.propagation(evt.from || evt.zone, evt.zone, evt.detail);
        break;
      case 'defaillance':
        this.engine.defaillanceDAS(evt.das, evt.msg);
        break;
      case 'derangement':
        this.engine.derangement(evt.zone, evt.msg);
        break;
      case 'info_formateur':
        this.engine._log('INFO_FORMATEUR', evt.msg);
        break;
      case 'hors_service':
        this.engine.mettreHorsService(evt.zone);
        break;
    }
  }

  _evaluerAction(data) {
    if (!this.scenario || !this.scenario.actions_attendues) return;
    const elapsed = this.elapsed;
    const actionAttendue = this.scenario.actions_attendues.find(
      a => a.action === data.action && !this.actionsEleve.find(ae => ae.action === data.action)
    );

    const entry = {
      temps: elapsed,
      action: data.action,
      zone: data.zone || null,
      timestamp: data.timestamp
    };
    this.actionsEleve.push(entry);

    if (actionAttendue) {
      const dansLesTemps = elapsed <= actionAttendue.delai_max;
      const score = {
        action: data.action,
        competence: actionAttendue.competence,
        attendu: `≤ ${actionAttendue.delai_max}s`,
        realise: `${elapsed}s`,
        points: dansLesTemps ? actionAttendue.points : Math.floor(actionAttendue.points * 0.5),
        resultat: dansLesTemps ? 'OK' : 'RETARD',
        max: actionAttendue.points
      };
      this.scoring.push(score);
      if (this.onScore) this.onScore(score);
    } else {
      const score = {
        action: data.action,
        competence: '—',
        attendu: '—',
        realise: `${elapsed}s`,
        points: 0,
        resultat: 'NON_ATTENDU',
        max: 0
      };
      this.scoring.push(score);
      if (this.onScore) this.onScore(score);
    }
  }

  _finScenario() {
    this.stop();
    // Vérifier les actions non réalisées
    if (this.scenario.actions_attendues) {
      this.scenario.actions_attendues.forEach(aa => {
        if (!this.actionsEleve.find(ae => ae.action === aa.action)) {
          this.scoring.push({
            action: aa.action,
            competence: aa.competence,
            attendu: `≤ ${aa.delai_max}s`,
            realise: 'NON FAIT',
            points: 0,
            resultat: 'MANQUE',
            max: aa.points
          });
        }
      });
    }
    if (this.onScore) this.onScore({ fin: true });
  }

  getScoring() { return [...this.scoring]; }

  getScoreTotal() {
    const pts = this.scoring.reduce((s, e) => s + e.points, 0);
    const max = this.scoring.reduce((s, e) => s + e.max, 0);
    return { points: pts, max, pct: max > 0 ? Math.round(pts / max * 100) : 0 };
  }

  getBilan() {
    return {
      scenario: this.scenario ? this.scenario.titre : '',
      niveau: this.scenario ? this.scenario.niveau : 0,
      duree: this.elapsed,
      score: this.getScoreTotal(),
      details: this.getScoring(),
      actions: [...this.actionsEleve],
      journal: this.engine.getJournal()
    };
  }
}

if (typeof module !== 'undefined') module.exports = { ScenarioPlayer };
