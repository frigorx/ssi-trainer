/**
 * SSI Engine — Machine à états SSI conforme NF S 61-931/934
 * inerWeb Édu — F. Henninot
 */

const SSIState = {
  VEILLE_NORMALE: 'VEILLE_NORMALE',
  ALARME_RESTREINTE: 'ALARME_RESTREINTE',
  ALARME_GENERALE: 'ALARME_GENERALE',
  EVACUATION: 'EVACUATION',
  SINISTRE: 'SINISTRE'
};

class SSIEngine {
  constructor(options = {}) {
    this.state = SSIState.VEILLE_NORMALE;
    this.zones = new Map();
    this.das = new Map();
    this.journal = [];
    this.listeners = [];
    this.timers = {};
    this.acquitte = false;
    this.signalSonoreActif = false;
    this.startTime = Date.now();
    this.options = {
      delaiVeilleRestreinte: options.delaiVeilleRestreinte || 300000, // 5 min
      doubleKnock: options.doubleKnock !== false,
      ...options
    };
    this.channel = null;
    try {
      this.channel = new BroadcastChannel('ssi-trainer');
      this.channel.onmessage = (e) => this._handleBroadcast(e.data);
    } catch (err) { /* fallback localStorage */ }
  }

  initZones(zoneList) {
    zoneList.forEach(z => {
      this.zones.set(z.id, {
        id: z.id,
        nom: z.nom,
        etat: 'VEILLE',
        alarme: false,
        derangement: false,
        horsService: false,
        detecteursActifs: 0,
        acquittee: false
      });
    });
  }

  initDAS(dasList) {
    dasList.forEach(d => {
      this.das.set(d.id, {
        id: d.id,
        designation: d.designation,
        type: d.type,
        zone: d.zone || null,      // conserver la zone d'asservissement (sinon auto-commande parasite)
        etat: 'VEILLE',
        commande: false
      });
    });
  }

  getState() { return this.state; }
  getZone(id) { return this.zones.get(id); }
  getZones() { return Array.from(this.zones.values()); }
  getDAS() { return Array.from(this.das.values()); }
  getJournal() { return [...this.journal]; }

  _horodatage() {
    const d = new Date();
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  _log(type, message, zone, extra) {
    const entry = {
      time: this._horodatage(),
      timestamp: Date.now(),
      type,
      message,
      zone: zone || null,
      ...extra
    };
    this.journal.unshift(entry);
    this._emit('journal', entry);
    return entry;
  }

  _emit(event, data) {
    this.listeners.forEach(cb => cb(event, data, this));
    if (this.channel) {
      try {
        this.channel.postMessage({ event, data, state: this.state });
      } catch (e) {}
    }
  }

  onEvent(callback) {
    this.listeners.push(callback);
  }

  _setState(newState) {
    const old = this.state;
    this.state = newState;
    this._log('TRANSITION', `${old} → ${newState}`);
    this._emit('stateChange', { from: old, to: newState });
  }

  // --- Actions détection ---

  declencherAlarme(zoneId, detail) {
    const zone = this.zones.get(zoneId);
    if (!zone) return;
    zone.detecteursActifs++;
    zone.alarme = true;
    zone.etat = 'ALARME';
    zone.acquittee = false;

    this._log('ALARME', `ALARME ${zoneId} — ${zone.nom} — ${detail || 'Détecteur'}`, zoneId, { detail });
    this._emit('alarme', { zone: zoneId, detail });
    this.signalSonoreActif = true;
    this._emit('son', { type: 'alarme' });

    // Double knock : 2 détecteurs même zone = alarme générale
    if (this.options.doubleKnock && zone.detecteursActifs >= 2 && this.state !== SSIState.EVACUATION) {
      this._setState(SSIState.ALARME_GENERALE);
      this._commanderDASZone(zoneId);
      return;
    }

    if (this.state === SSIState.VEILLE_NORMALE) {
      this._setState(SSIState.ALARME_RESTREINTE);
      // Timer 5 min : si pas acquitté → alarme générale
      this.timers.veilleRestreinte = setTimeout(() => {
        if (this.state === SSIState.ALARME_RESTREINTE && !this.acquitte) {
          this._log('TIMEOUT', 'Délai veille restreinte écoulé — passage alarme générale');
          this._setState(SSIState.ALARME_GENERALE);
          this._commanderDASZone(zoneId);
        }
      }, this.options.delaiVeilleRestreinte);
    } else if (this.state === SSIState.ALARME_RESTREINTE) {
      // Nouvelle zone en alarme pendant veille restreinte
      this._setState(SSIState.ALARME_GENERALE);
      this._commanderDASZone(zoneId);
    }
  }

  propagation(fromZone, toZone, detail) {
    this._log('PROPAGATION', `Propagation ${fromZone} → ${toZone}`, toZone);
    this.declencherAlarme(toZone, detail || 'Propagation incendie');
  }

  derangement(zoneId, message) {
    const zone = this.zones.get(zoneId);
    if (zone) {
      zone.derangement = true;
      zone.etat = zone.alarme ? 'ALARME' : 'DERANGEMENT';
    }
    this._log('DERANGEMENT', message || `Dérangement ${zoneId}`, zoneId);
    this._emit('derangement', { zone: zoneId, message });
    this._emit('son', { type: 'derangement' });
  }

  defaillanceDAS(dasId, message) {
    const das = this.das.get(dasId);
    if (das) {
      das.etat = 'DEFAILLANT';
    }
    this._log('DEFAILLANCE', message || `Défaillance DAS ${dasId}`, null, { dasId });
    this._emit('defaillanceDAS', { dasId, message });
    this._emit('son', { type: 'derangement' });
  }

  mettreHorsService(zoneId) {
    const zone = this.zones.get(zoneId);
    if (zone) {
      zone.horsService = true;
      zone.etat = 'HORS_SERVICE';
      this._log('HORS_SERVICE', `Zone ${zoneId} mise hors service`, zoneId);
      this._emit('horsService', { zone: zoneId });
    }
  }

  // --- Actions opérateur ---

  acquitter() {
    this.acquitte = true;
    if (this.timers.veilleRestreinte) {
      clearTimeout(this.timers.veilleRestreinte);
    }
    this._log('ACQUITTEMENT', 'Acquittement opérateur');
    this._emit('acquittement', {});
    this._emit('action', { action: 'acquittement', timestamp: Date.now() });
    this.arreterSignalSonore();
  }

  acquitterZone(zoneId) {
    const zone = this.zones.get(zoneId);
    if (zone) {
      zone.acquittee = true;
      this._log('ACQUIT_ZONE', `Acquittement zone ${zoneId}`, zoneId);
      this._emit('acquitZone', { zone: zoneId });
      this._emit('action', { action: 'acquit_zone', zone: zoneId, timestamp: Date.now() });
    }
  }

  /**
   * Traiter l'origine d'une alarme (ex. faire aérer une cuisine après une fausse
   * alarme sur vapeur de cuisson) : le(s) détecteur(s) concerné(s) reviennent en
   * veille, ce qui lève la condition d'alarme et autorise le réarmement.
   */
  leverCause(zoneId) {
    let traitees = 0;
    this.zones.forEach(z => {
      if (z.alarme && (!zoneId || z.id === zoneId)) {
        z.alarme = false;
        z.detecteursActifs = 0;
        z.etat = z.derangement ? 'DERANGEMENT' : 'VEILLE';
        traitees++;
      }
    });
    this._log('CAUSE_TRAITEE', 'Origine de l\'alarme traitée — détection levée' + (zoneId ? ` (${zoneId})` : ''), zoneId || null);
    this._emit('action', { action: 'traiter_cause', zone: zoneId || null, timestamp: Date.now() });
    this._emit('causeTraitee', { zone: zoneId || null });
    return traitees;
  }

  rearmement() {
    const zonesEnAlarme = this.getZones().filter(z => z.alarme && !z.acquittee);
    if (zonesEnAlarme.length > 0) {
      this._log('REFUS', 'Réarmement refusé — une zone est encore en alarme : traitez d\'abord l\'origine (ex. aérer le local) avant de réarmer');
      this._emit('refus', { reason: 'zone_en_alarme' });
      return false;
    }
    this.zones.forEach(z => {
      z.alarme = false;
      z.derangement = false;
      z.horsService = false;
      z.detecteursActifs = 0;
      z.acquittee = false;
      z.etat = 'VEILLE';
    });
    this.das.forEach(d => {
      d.etat = 'VEILLE';
      d.commande = false;
    });
    this.acquitte = false;
    this.signalSonoreActif = false;
    this._setState(SSIState.VEILLE_NORMALE);
    this._log('REARMEMENT', 'Réarmement général effectué');
    this._emit('rearmement', {});
    this._emit('action', { action: 'rearmement', timestamp: Date.now() });
    return true;
  }

  arreterSignalSonore() {
    this.signalSonoreActif = false;
    this._log('ARRET_SIGNAL', 'Arrêt signal sonore');
    this._emit('arretSignal', {});
    this._emit('son', { type: 'stop' });
    this._emit('action', { action: 'arret_signal', timestamp: Date.now() });
  }

  evacuationGenerale() {
    this._setState(SSIState.EVACUATION);
    this.signalSonoreActif = true;
    this._commanderTousDAS();
    this._log('EVACUATION', 'ÉVACUATION GÉNÉRALE DÉCLENCHÉE');
    this._emit('evacuation', {});
    this._emit('son', { type: 'evacuation' });
    this._emit('action', { action: 'evacuation_generale', timestamp: Date.now() });
  }

  leveeDoute() {
    this._log('LEVEE_DOUTE', 'Équipier envoyé en levée de doute');
    this._emit('action', { action: 'levee_doute', timestamp: Date.now() });
  }

  appel18(message) {
    this._log('APPEL_18', 'Appel 18/112 effectué' + (message ? ' — ' + message : ''));
    this._emit('action', { action: 'appel_18', message: message || null, timestamp: Date.now() });
  }

  accueilPompiers() {
    this._log('ACCUEIL_POMPIERS', 'Accueil des secours effectué');
    this._emit('action', { action: 'accueil_pompiers', timestamp: Date.now() });
  }

  commandeManuelle(dasId) {
    const das = this.das.get(dasId);
    if (!das) return false;
    // Un DAS défaillant ne peut pas être commandé : la commande n'aboutit pas.
    if (das.etat === 'DEFAILLANT') {
      this._log('COMMANDE_REFUS', `Commande DAS ${dasId} refusée — équipement défaillant`, null, { dasId });
      this._emit('commandeDAS', { dasId, refus: true });
      this._emit('action', { action: 'commande_das', dasId, echec: true, timestamp: Date.now() });
      return false;
    }
    das.etat = 'COMMANDE';
    das.commande = true;
    this._log('COMMANDE_DAS', `Commande manuelle DAS ${dasId} — ${das.designation}`, null, { dasId });
    this._emit('commandeDAS', { dasId });
    this._emit('action', { action: 'commande_das', dasId, timestamp: Date.now() });
    return true;
  }

  reconnaitreDefautDAS(dasId) {
    this._log('DEFAUT_RECONNU', 'Défaut DAS reconnu et consigné au journal' + (dasId ? ' — ' + dasId : ''));
    this._emit('action', { action: 'reconnaitre_defaut_das', dasId: dasId || null, timestamp: Date.now() });
  }

  coupureEnergies(detail) {
    this._log('COUPURE_ENERGIES', 'Coupure des énergies (gaz / électricité)' + (detail ? ' — ' + detail : ''));
    this._emit('action', { action: 'coupure_energies', detail: detail || null, timestamp: Date.now() });
  }

  testSignalisation() {
    this._log('TEST', 'Test signalisation en cours');
    this._emit('testSignalisation', {});
    this._emit('action', { action: 'test_signalisation', timestamp: Date.now() });
  }

  // --- DAS ---

  _commanderDASZone(zoneId) {
    // N'auto-commande QUE les DAS asservis à la zone sinistrée (corrélation ZD→ZS).
    // Les DAS d'autres zones (compartimentage anti-propagation) restent à la main
    // de l'opérateur : c'est l'objet pédagogique du niveau CMSI.
    this.das.forEach(d => {
      var concerne = (d.zone && d.zone === zoneId) || d.id.includes(zoneId);
      if (concerne && d.etat !== 'DEFAILLANT') {
        d.etat = 'COMMANDE';
        d.commande = true;
        this._log('DAS_COMMANDE', `DAS ${d.id} commandé — ${d.designation}`);
      }
    });
    this._emit('dasUpdate', {});
  }

  _commanderTousDAS() {
    this.das.forEach(d => {
      if (d.etat !== 'DEFAILLANT') {
        d.etat = 'COMMANDE';
        d.commande = true;
      }
    });
    this._log('DAS_TOUS', 'Tous les DAS commandés');
    this._emit('dasUpdate', {});
  }

  // --- Broadcast ---

  _handleBroadcast(data) {
    if (data.source === 'formateur') {
      switch (data.command) {
        case 'alarme':
          this.declencherAlarme(data.zone, data.detail);
          break;
        case 'derangement':
          this.derangement(data.zone, data.message);
          break;
        case 'defaillance_das':
          this.defaillanceDAS(data.dasId, data.message);
          break;
        case 'propagation':
          this.propagation(data.fromZone, data.toZone, data.detail);
          break;
        case 'hors_service':
          this.mettreHorsService(data.zone);
          break;
        case 'reset':
          this.reset();
          break;
        case 'info':
          this._log('INFO_FORMATEUR', data.message);
          this._emit('infoFormateur', { message: data.message });
          break;
      }
    }
  }

  broadcast(data) {
    if (this.channel) {
      try { this.channel.postMessage(data); } catch (e) {}
    }
    try {
      localStorage.setItem('ssi-trainer-msg', JSON.stringify({ ...data, t: Date.now() }));
    } catch (e) {}
  }

  reset() {
    Object.values(this.timers).forEach(t => clearTimeout(t));
    this.timers = {};
    this.state = SSIState.VEILLE_NORMALE;
    this.acquitte = false;
    this.signalSonoreActif = false;
    this.journal = [];
    this.zones.forEach(z => {
      z.alarme = false;
      z.derangement = false;
      z.horsService = false;
      z.detecteursActifs = 0;
      z.acquittee = false;
      z.etat = 'VEILLE';
    });
    this.das.forEach(d => {
      d.etat = 'VEILLE';
      d.commande = false;
    });
    this._emit('reset', {});
  }

  destroy() {
    Object.values(this.timers).forEach(t => clearTimeout(t));
    if (this.channel) this.channel.close();
  }
}

// Export pour usage module ou global
if (typeof module !== 'undefined') module.exports = { SSIEngine, SSIState };
