/**
 * Poste élève — document pédagogique d'un scénario SSI
 * inerWeb Édu — F. Henninot
 *
 * Gère la colonne « document élève » : mission/contexte, conduite à tenir
 * vivante (cochage automatique), gestes opérateur (levée de doute, appel 18,
 * accueil secours), main courante, questions, et génération de la FICHE PAPIER
 * (imprimable + téléchargeable, autoportante).
 *
 * Réutilisable par tous les niveaux. Couplage minimal : la page câble les
 * gestes via le callback onAction, et appelle notifierAction() à chaque
 * action de l'élève (qu'elle vienne de l'ECS ou d'un geste opérateur).
 */

const LIB_ACTIONS = {
  acquittement: 'Acquittement de l’alarme',
  arret_signal: 'Arrêt du signal sonore',
  acquit_zone: 'Acquittement de zone',
  levee_doute: 'Envoi d’un équipier — levée de doute',
  appel_18: 'Appel des secours (18/112)',
  evacuation_generale: 'Déclenchement de l’évacuation générale',
  rearmement: 'Réarmement du système',
  test_signalisation: 'Test signalisation',
  accueil_pompiers: 'Accueil et guidage des secours'
};

// Gestes « opérateur » du poste (hors boutons de l'équipement)
const GESTES_OPERATEUR = [
  { cle: 'levee_doute', ico: '🚶', label: 'Envoyer un équipier (levée de doute)' },
  { cle: 'appel_18', ico: '📞', label: 'Alerter les secours (18 / 112)' },
  { cle: 'accueil_pompiers', ico: '🚒', label: 'Accueil & guidage des secours' }
];

function _esc(s) {
  if (s === undefined || s === null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _heure() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

class PosteEleve {
  constructor(opts) {
    opts = opts || {};
    this.onAction = opts.onAction || function () {};
    this.onCompteRendu = opts.onCompteRendu || function () {};
    this.scenario = null;
    this.mode = 'guide';            // 'guide' | 'autonome' | 'exploration'
    this.refs = {};                 // conteneurs DOM
    this.etapes = [];               // état des étapes de conduite à tenir
    this._leveeFaite = false;       // levée de doute déjà lancée ?
    this._leveeTimer = null;        // compte à rebours retour équipier
    this._injecterModales();
  }

  /** refs = { mission, conduite, actions, mainCourante, questions } (éléments DOM) */
  monter(refs) { this.refs = refs || {}; }

  charger(scenario, mode) {
    this.scenario = scenario;
    if (mode) this.mode = mode;
    if (this._leveeTimer) { clearInterval(this._leveeTimer); this._leveeTimer = null; }
    this._leveeFaite = false;
    this._fermerModale('peModalLevee');
    this.etapes = (scenario.conduite_a_tenir || []).map(function (e, i) {
      return { i: i, cle: e.cle || null, texte: e.texte, done: false };
    });
    this._renderMission();
    this._renderConduite();
    this._renderActions();
    this._renderMainCourante(true);
    this._renderQuestions();
    this._appliquerMode();
  }

  reset() {
    this.etapes.forEach(function (e) { e.done = false; });
    if (this._leveeTimer) { clearInterval(this._leveeTimer); this._leveeTimer = null; }
    this._leveeFaite = false;
    this._renderConduite();
    this._renderActions();
    this._renderMainCourante(true);
  }

  setMode(mode) {
    this.mode = mode;
    this._appliquerMode();
    this._renderConduite();
  }

  /** Appelé à chaque action de l'élève (depuis l'ECS ou un geste opérateur). */
  notifierAction(actionKey, payload) {
    payload = payload || {};
    // Cocher l'étape correspondante
    var et = this.etapes.find(function (e) { return e.cle === actionKey && !e.done; });
    if (et) { et.done = true; this._renderConduite(); }
    // Trace dans la main courante
    var lib = LIB_ACTIONS[actionKey] || actionKey;
    if (payload.message) lib += ' — « ' + payload.message + ' »';
    this._ajouterLigneMC(_heure(), lib, '', true);
  }

  // ---------------------------------------------------------------- rendus

  _renderMission() {
    if (!this.refs.mission) return;
    var s = this.scenario, c = s.contexte || {};
    var html = '<div class="pe-bloc-titre"><span class="pe-ico">🎯</span> Mission</div>';
    html += '<div class="pe-mission-txt">' + _esc(s.mission || s.description || '') + '</div>';
    var ctx = [];
    if (c.etablissement) ctx.push('<b>Établissement :</b> ' + _esc(c.etablissement));
    if (c.effectif) ctx.push('<b>Effectif :</b> ' + _esc(c.effectif) + ' personnes');
    if (c.particularites) ctx.push('<b>Particularités :</b> ' + _esc(c.particularites));
    if (ctx.length) html += '<div class="pe-contexte">' + ctx.join('<br>') + '</div>';
    this.refs.mission.className = 'pe-bloc pe-mission';
    this.refs.mission.innerHTML = html;
  }

  _renderConduite() {
    if (!this.refs.conduite) return;
    var self = this;
    var html = '<div class="pe-bloc-titre"><span class="pe-ico">📋</span> Conduite à tenir</div>';
    if (this.mode === 'autonome') {
      html += '<p style="font-size:0.82em;color:#666;line-height:1.5">Mode autonome : à vous de conduire la procédure. ' +
              'Consignez vos actions dans la main courante ci-dessous. La correction se fera à partir de vos écrits.</p>';
      this.refs.conduite.className = 'pe-bloc pe-poste mode-autonome';
      this.refs.conduite.innerHTML = html;
      return;
    }
    // Mode guidé : liste vivante
    var activeMarquee = false;
    html += '<ol class="pe-conduite">';
    this.etapes.forEach(function (e) {
      var cls = 'pe-etape ';
      if (e.done) cls += 'done';
      else if (!activeMarquee) { cls += 'active'; activeMarquee = true; }
      else cls += 'todo';
      html += '<li class="' + cls + '">';
      html += '<span class="pe-num"></span>';
      // Étape manuelle (sans clé d'action) = case à cocher
      if (!e.cle) {
        html += '<input type="checkbox" class="pe-check" data-i="' + e.i + '"' + (e.done ? ' checked' : '') + '>';
      }
      html += '<span class="pe-etape-txt">' + _esc(e.texte) + '</span>';
      html += '<span class="pe-etat"></span>';
      html += '</li>';
    });
    html += '</ol>';
    this.refs.conduite.className = 'pe-bloc';
    this.refs.conduite.innerHTML = html;
    // Brancher les cases manuelles
    this.refs.conduite.querySelectorAll('.pe-check').forEach(function (chk) {
      chk.addEventListener('change', function () {
        var idx = parseInt(this.getAttribute('data-i'), 10);
        var step = self.etapes[idx];
        if (step) { step.done = this.checked; self._renderConduite(); }
      });
    });
  }

  _renderActions() {
    if (!this.refs.actions) return;
    var self = this;
    var html = '<div class="pe-bloc-titre"><span class="pe-ico">🧑‍🚒</span> Gestes de l’agent</div>';
    html += '<div class="pe-actions">';
    GESTES_OPERATEUR.forEach(function (g) {
      html += '<button class="pe-act" data-cle="' + g.cle + '">' +
              '<span class="pe-act-ico">' + g.ico + '</span> ' + _esc(g.label) + '</button>';
    });
    html += '<div class="pe-act-note">Acquittement, réarmement, test et évacuation se commandent sur le tableau (à gauche).</div>';
    html += '</div>';
    this.refs.actions.className = 'pe-bloc';
    this.refs.actions.innerHTML = html;
    this.refs.actions.querySelectorAll('.pe-act').forEach(function (btn) {
      btn.addEventListener('click', function () { self._declencherGeste(this.getAttribute('data-cle')); });
    });
  }

  _renderMainCourante(reset) {
    if (!this.refs.mainCourante) return;
    var self = this;
    var html = '<div class="pe-bloc-titre"><span class="pe-ico">✍️</span> Main courante</div>';
    html += '<table class="pe-mc"><thead><tr>' +
            '<th class="pe-mc-heure">Heure</th><th>Événement constaté</th><th>Action menée</th>' +
            '</tr></thead><tbody id="peMcBody"></tbody></table>';
    html += '<button class="pe-mc-add" id="peMcAdd">+ Ajouter une ligne</button>';
    this.refs.mainCourante.className = 'pe-bloc';
    this.refs.mainCourante.innerHTML = html;
    this._mcBody = this.refs.mainCourante.querySelector('#peMcBody');
    this.refs.mainCourante.querySelector('#peMcAdd').addEventListener('click', function () {
      self._ajouterLigneMC('', '', '', false);
    });
    if (reset) {
      // 3 lignes vierges au démarrage
      for (var k = 0; k < 3; k++) this._ajouterLigneMC('', '', '', false);
    }
  }

  _ajouterLigneMC(heure, evenement, action, auto) {
    if (!this._mcBody) return;
    var tr = document.createElement('tr');
    if (auto) tr.className = 'pe-mc-auto';
    if (auto) {
      tr.innerHTML = '<td class="pe-mc-heure">' + _esc(heure) + '</td>' +
                     '<td>' + _esc(evenement) + '</td>' +
                     '<td><input type="text" value="" placeholder="—"></td>';
    } else {
      tr.innerHTML = '<td class="pe-mc-heure"><input type="text" value="' + _esc(heure) + '" placeholder="hh:mm"></td>' +
                     '<td><input type="text" value="' + _esc(evenement) + '"></td>' +
                     '<td><input type="text" value="' + _esc(action) + '"></td>';
    }
    this._mcBody.appendChild(tr);
  }

  _renderQuestions() {
    if (!this.refs.questions) return;
    var qs = this.scenario.questions || [];
    var html = '<div class="pe-bloc-titre"><span class="pe-ico">❓</span> Questions</div>';
    if (!qs.length) { html += '<p style="font-size:0.82em;color:#888">Aucune question pour ce scénario.</p>'; }
    qs.forEach(function (q, i) {
      html += '<div class="pe-question">';
      html += '<div class="pe-q-txt"><b>Q' + (i + 1) + '.</b> ' + _esc(q.q) + '</div>';
      if (q.type === 'qcm' && q.options) {
        q.options.forEach(function (opt, j) {
          html += '<label class="pe-qcm-opt"><input type="radio" name="peq' + i + '" value="' + j + '"> ' + _esc(opt) + '</label>';
        });
      } else {
        html += '<textarea placeholder="Votre réponse…"></textarea>';
      }
      html += '</div>';
    });
    this.refs.questions.className = 'pe-bloc';
    this.refs.questions.innerHTML = html;
  }

  _appliquerMode() {
    // Le mode est appliqué au rendu de la conduite ; rien d'autre pour l'instant.
  }

  // -------------------------------------------------------------- gestes

  _declencherGeste(cle) {
    if (cle === 'appel_18') { this._ouvrirModaleAppel(); return; }
    if (cle === 'accueil_pompiers') { this._ouvrirModaleAccueil(); return; }
    if (cle === 'levee_doute') { this._lancerLeveeDoute(); return; }
    this.onAction(cle, {});
  }

  // -------------------------------------------------------------- modales

  _injecterModales() {
    var self = this;
    // --- Appel 18 ---
    var ov1 = document.createElement('div');
    ov1.className = 'pe-modal-ov';
    ov1.id = 'peModalAppel';
    ov1.innerHTML =
      '<div class="pe-modal">' +
      '<h3>📞 Alerte des secours — 18 / 112</h3>' +
      '<div class="pe-modal-sub">Transmettez un message d’alerte clair et structuré.</div>' +
      '<label>Nature du sinistre</label><input type="text" id="peAppNature" placeholder="Ex : feu de stockage, fumées…">' +
      '<label>Localisation précise</label><input type="text" id="peAppLieu" placeholder="Bâtiment, niveau, local…">' +
      '<label>Victimes éventuelles</label><input type="text" id="peAppVict" placeholder="Nombre, état, localisation">' +
      '<label>Établissement et accès</label><input type="text" id="peAppAcces" placeholder="Adresse, point d’accès pompiers">' +
      '<div class="pe-modal-row">' +
      '<button class="pe-btn pe-btn-ghost" data-close="peModalAppel">Annuler</button>' +
      '<button class="pe-btn pe-btn-primary" id="peAppValider">Passer l’appel</button>' +
      '</div></div>';
    document.body.appendChild(ov1);
    ov1.querySelector('#peAppValider').addEventListener('click', function () {
      var parts = [];
      var n = document.getElementById('peAppNature').value.trim();
      var l = document.getElementById('peAppLieu').value.trim();
      var v = document.getElementById('peAppVict').value.trim();
      var a = document.getElementById('peAppAcces').value.trim();
      if (n) parts.push(n);
      if (l) parts.push(l);
      if (v) parts.push('victimes : ' + v);
      if (a) parts.push(a);
      self._fermerModale('peModalAppel');
      self.onAction('appel_18', { message: parts.join(' ; ') });
    });

    // --- Accueil secours ---
    var ov2 = document.createElement('div');
    ov2.className = 'pe-modal-ov';
    ov2.id = 'peModalAccueil';
    ov2.innerHTML =
      '<div class="pe-modal">' +
      '<h3>🚒 Accueil &amp; guidage des secours</h3>' +
      '<div class="pe-modal-sub">Cochez les actions réalisées à l’arrivée des sapeurs-pompiers.</div>' +
      '<label class="pe-modal-check"><input type="checkbox"> Se positionner au point d’accueil convenu</label>' +
      '<label class="pe-modal-check"><input type="checkbox"> Remettre les plans de l’établissement</label>' +
      '<label class="pe-modal-check"><input type="checkbox"> Remettre les clés / pass</label>' +
      '<label class="pe-modal-check"><input type="checkbox"> Faire un point de situation clair</label>' +
      '<label class="pe-modal-check"><input type="checkbox"> Communiquer l’historique des événements SSI</label>' +
      '<label class="pe-modal-check"><input type="checkbox"> Guider les secours jusqu’au sinistre</label>' +
      '<div class="pe-modal-row">' +
      '<button class="pe-btn pe-btn-ghost" data-close="peModalAccueil">Annuler</button>' +
      '<button class="pe-btn pe-btn-primary" id="peAccValider">Valider l’accueil</button>' +
      '</div></div>';
    document.body.appendChild(ov2);
    ov2.querySelector('#peAccValider').addEventListener('click', function () {
      self._fermerModale('peModalAccueil');
      self.onAction('accueil_pompiers', {});
    });

    // --- Levée de doute (compte-rendu de l'équipier) ---
    var ov3 = document.createElement('div');
    ov3.className = 'pe-modal-ov';
    ov3.id = 'peModalLevee';
    ov3.innerHTML = '<div class="pe-modal"><div id="peLeveeBody"></div></div>';
    document.body.appendChild(ov3);

    // Fermeture (boutons annuler + clic overlay + Échap)
    [ov1, ov2].forEach(function (ov) {
      ov.addEventListener('click', function (e) {
        if (e.target === ov || e.target.getAttribute('data-close')) self._fermerModale(ov.id);
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { self._fermerModale('peModalAppel'); self._fermerModale('peModalAccueil'); }
    });
  }

  _ouvrirModaleAppel() {
    ['peAppNature', 'peAppLieu', 'peAppVict', 'peAppAcces'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('peModalAppel').classList.add('active');
    var f = document.getElementById('peAppNature'); if (f) setTimeout(function () { f.focus(); }, 50);
  }
  _ouvrirModaleAccueil() {
    var ov = document.getElementById('peModalAccueil');
    ov.querySelectorAll('input[type="checkbox"]').forEach(function (c) { c.checked = false; });
    ov.classList.add('active');
  }
  _fermerModale(id) { var el = document.getElementById(id); if (el) el.classList.remove('active'); }

  // ------------------------------------------------------- levée de doute

  _lancerLeveeDoute() {
    if (this._leveeFaite) return;            // équipier déjà parti
    this._leveeFaite = true;
    var btn = this.refs.actions && this.refs.actions.querySelector('[data-cle="levee_doute"]');
    if (btn) btn.disabled = true;
    // L'élève a décidé d'envoyer l'équipier : action comptée immédiatement
    this.onAction('levee_doute', {});
    var ld = (this.scenario && this.scenario.levee_doute) || {};
    var delai = ld.delai || 6;
    var self = this;
    this._renderLevee('route', { reste: delai });
    document.getElementById('peModalLevee').classList.add('active');
    var reste = delai;
    if (this._leveeTimer) clearInterval(this._leveeTimer);
    this._leveeTimer = setInterval(function () {
      reste--;
      var el = document.getElementById('peLeveeCompte');
      if (el) el.textContent = reste;
      if (reste <= 0) {
        clearInterval(self._leveeTimer); self._leveeTimer = null;
        self._etapeCompteRendu();
      }
    }, 1000);
  }

  _etapeCompteRendu() {
    var ld = (this.scenario && this.scenario.levee_doute) || {};
    if (this.mode === 'exploration') {
      this._renderLevee('choix');
    } else {
      var feu = !!ld.feu;
      this._renderLevee('rapport', { feu: feu, rapport: feu ? (ld.rapport_feu || 'Feu confirmé.') : (ld.rapport_ras || 'Rien à signaler.') });
    }
  }

  _choisirConstat(feu) {
    var ld = (this.scenario && this.scenario.levee_doute) || {};
    this._renderLevee('rapport', { feu: feu, rapport: feu ? (ld.rapport_feu || 'Feu confirmé.') : (ld.rapport_ras || 'Rien à signaler.') });
  }

  _renderLevee(etat, data) {
    data = data || {};
    var body = document.getElementById('peLeveeBody');
    if (!body) return;
    var self = this;
    if (etat === 'route') {
      body.innerHTML = '<h3>🚶 Levée de doute en cours</h3>' +
        '<div class="pe-modal-sub">Un équipier de ronde se rend sur la zone en alarme pour vérifier.</div>' +
        '<p style="text-align:center;font-size:1.05em;margin:18px 0">Retour de l’équipier dans <b id="peLeveeCompte">' + (data.reste || '') + '</b> s…</p>';
      return;
    }
    if (etat === 'choix') {
      body.innerHTML = '<h3>📻 Compte-rendu de l’équipier</h3>' +
        '<div class="pe-modal-sub">L’équipier est sur place. Que constate-t-il ? <em>(mode exploration : à vous de choisir la branche à tester)</em></div>' +
        '<div class="pe-modal-row" style="justify-content:center;gap:14px;margin-top:16px">' +
        '<button class="pe-btn pe-btn-primary" id="peLeveeFeu" style="background:#c62828">🔥 Feu confirmé</button>' +
        '<button class="pe-btn pe-btn-primary" id="peLeveeRas" style="background:#2e7d32">✅ Rien à signaler</button>' +
        '</div>';
      body.querySelector('#peLeveeFeu').addEventListener('click', function () { self._choisirConstat(true); });
      body.querySelector('#peLeveeRas').addEventListener('click', function () { self._choisirConstat(false); });
      return;
    }
    if (etat === 'rapport') {
      var feu = data.feu;
      var conseil = feu
        ? '➜ Feu confirmé : alertez le 18/112, passez en niveau d’accès 2 et déclenchez l’évacuation générale.'
        : '➜ Fausse alarme : après vérification, vous pouvez réarmer le système.';
      body.innerHTML = '<h3>' + (feu ? '🔥 Compte-rendu : FEU CONFIRMÉ' : '✅ Compte-rendu : rien à signaler') + '</h3>' +
        '<div class="pe-modal-sub">Message radio de l’équipier :</div>' +
        '<p style="background:#f6f8fb;border-left:3px solid ' + (feu ? '#c62828' : '#2e7d32') + ';padding:10px 12px;margin:8px 0;font-size:0.92em">« ' + _esc(data.rapport) + ' »</p>' +
        '<p style="font-size:0.86em;color:#444;margin-top:8px">' + conseil + '</p>' +
        '<div class="pe-modal-row"><button class="pe-btn pe-btn-primary" id="peLeveeOk">Compris</button></div>';
      body.querySelector('#peLeveeOk').addEventListener('click', function () {
        self._fermerModale('peModalLevee');
        self.onCompteRendu(feu, data.rapport);
      });
      return;
    }
  }

  // ----------------------------------------------------------- fiche papier

  /** Construit le document élève autoportant (HTML complet, styles inline). */
  genererFiche() {
    var s = this.scenario; if (!s) return '';
    var c = s.contexte || {};
    var lignesMC = 10;
    var h = '';
    h += '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">';
    h += '<title>Fiche élève — ' + _esc(s.titre) + '</title><style>';
    h += 'body{font-family:Calibri,Arial,sans-serif;color:#1b1b1b;font-size:12pt;line-height:1.5;max-width:780px;margin:18px auto;padding:0 16px}';
    h += 'h1{font-size:1.3em;color:#1b3a63;margin-bottom:2px}h2{font-size:1em;color:#1b3a63;border-bottom:2px solid #ff6b35;padding-bottom:3px;margin:18px 0 8px}';
    h += '.ident{display:flex;gap:18px;flex-wrap:wrap;font-size:0.9em;margin:10px 0;border:1px solid #ccc;padding:8px 12px;border-radius:6px}';
    h += '.ident span{flex:1;min-width:160px}.line{display:inline-block;border-bottom:1px solid #888;min-width:120px}';
    h += '.ctx{font-size:0.9em;background:#f6f8fb;border-left:3px solid #ff6b35;padding:8px 12px;margin:6px 0}';
    h += 'ol.cond{margin:0 0 0 4px;padding:0;list-style:none}ol.cond li{padding:4px 0;border-bottom:1px dotted #ddd}';
    h += 'ol.cond li::before{content:"\\2610";font-size:1.2em;margin-right:8px}';
    h += 'table{width:100%;border-collapse:collapse;font-size:0.9em;margin-top:4px}th,td{border:1px solid #999;padding:6px 8px;text-align:left}';
    h += 'th{background:#1b3a63;color:#fff}td.hh{width:80px}tr{height:30px}';
    h += '.q{margin:10px 0}.q b{color:#1b3a63}.ans{border-bottom:1px solid #bbb;height:22px;margin-top:4px}';
    h += '.opt::before{content:"\\2610";margin-right:6px}';
    h += '.bilan{border:1px solid #999;border-radius:6px;min-height:80px;padding:8px;margin-top:6px}';
    h += '@media print{body{margin:0}h2{page-break-after:avoid}tr,li,.q{page-break-inside:avoid}}';
    h += '.foot{margin-top:22px;font-size:0.75em;color:#888;text-align:center;border-top:1px solid #ddd;padding-top:8px}';
    h += '</style></head><body>';
    h += '<h1>SSI Trainer — Fiche élève</h1>';
    h += '<div style="font-size:0.95em;color:#444"><b>' + _esc(s.titre) + '</b>' +
         (s.erp_type ? ' — ERP type ' + _esc(s.erp_type) : '') + '</div>';
    h += '<div class="ident"><span>Nom : <span class="line"></span></span><span>Classe : <span class="line"></span></span><span>Date : <span class="line"></span></span></div>';
    // Contexte + mission
    h += '<h2>Contexte &amp; mission</h2>';
    var ctx = [];
    if (c.etablissement) ctx.push('<b>Établissement :</b> ' + _esc(c.etablissement));
    if (c.effectif) ctx.push('<b>Effectif :</b> ' + _esc(c.effectif) + ' personnes');
    if (c.particularites) ctx.push('<b>Particularités :</b> ' + _esc(c.particularites));
    if (ctx.length) h += '<div class="ctx">' + ctx.join('<br>') + '</div>';
    h += '<p>' + _esc(s.mission || s.description || '') + '</p>';
    // Conduite à tenir (checklist vierge)
    if (s.conduite_a_tenir && s.conduite_a_tenir.length) {
      h += '<h2>Conduite à tenir (cocher au fur et à mesure)</h2><ol class="cond">';
      s.conduite_a_tenir.forEach(function (e) { h += '<li>' + _esc(e.texte) + '</li>'; });
      h += '</ol>';
    }
    // Main courante vierge
    h += '<h2>Main courante</h2><table><thead><tr><th class="hh">Heure</th><th>Événement constaté</th><th>Action menée</th></tr></thead><tbody>';
    for (var k = 0; k < lignesMC; k++) h += '<tr><td class="hh">&nbsp;</td><td></td><td></td></tr>';
    h += '</tbody></table>';
    // Questions
    if (s.questions && s.questions.length) {
      h += '<h2>Questions</h2>';
      s.questions.forEach(function (q, i) {
        h += '<div class="q"><b>Q' + (i + 1) + '.</b> ' + _esc(q.q);
        if (q.type === 'qcm' && q.options) {
          q.options.forEach(function (opt) { h += '<div class="opt">' + _esc(opt) + '</div>'; });
        } else {
          h += '<div class="ans"></div><div class="ans"></div>';
        }
        h += '</div>';
      });
    }
    h += '<h2>Bilan / observations</h2><div class="bilan"></div>';
    h += '<div class="foot">SSI Trainer — inerWeb Édu — LP Jacques Raynaud, Marseille</div>';
    h += '</body></html>';
    return h;
  }

  imprimerFiche() {
    var html = this.genererFiche(); if (!html) return;
    var w = window.open('', '_blank');
    if (!w) { alert('Autorisez les fenêtres pop-up pour imprimer la fiche.'); return; }
    w.document.write(html); w.document.close();
    w.onload = function () { w.focus(); w.print(); };
  }

  telechargerFiche() {
    var html = this.genererFiche(); if (!html) return;
    var nom = 'fiche-eleve_' + (this.scenario.id || 'ssi') + '.html';
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = nom; a.click();
    URL.revokeObjectURL(url);
  }
}

if (typeof module !== 'undefined') module.exports = { PosteEleve };
